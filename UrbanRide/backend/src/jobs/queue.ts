import { Queue, Worker, type JobsOptions } from 'bullmq';
import type { Redis } from 'ioredis';

import { consoleLogger } from '../common/logging/logger';
import { createBullConnection, redisEnabled } from '../infrastructure/redis';
import type { RideEventType } from '../realtime/ride-events';

/**
 * Background job queue (BullMQ on Redis).
 *
 * What goes through the queue and why:
 *  - 'ride-push'    push notifications: slow third-party calls that must not delay
 *                   the HTTP response; retried if every device failed
 *  - 'refund'       payment refunds: must eventually succeed, retried with backoff
 *  - 'maintenance'  expire stale ride requests / auto-complete abandoned rides; a
 *                   repeatable job so only ONE instance runs it per interval
 *
 * Without REDIS_URL there is no queue: jobs run in-process right away
 * (fire-and-forget, errors logged), which is how the app worked before.
 *
 * To keep the Upstash free tier (command-limited) usable there is a SINGLE queue
 * and the idle polling interval is generous. Tune with the BULLMQ_* variables.
 */
export interface RidePushJob {
  type: RideEventType;
  rideId: string;
  data?: Record<string, unknown>;
}

export interface JobPayloads {
  'ride-push': RidePushJob;
  refund: { rideId: string };
  maintenance: Record<string, never>;
}

export type JobName = keyof JobPayloads;
export type JobHandlers = { [K in JobName]?: (data: JobPayloads[K]) => Promise<void> };

const QUEUE_NAME = 'urbanride-jobs';
const ENQUEUE_TIMEOUT_MS = 1_500;
const QUEUE_ADD_ATTEMPTS = 3;

let handlers: JobHandlers = {};

/** Wires the job implementations (done in handlers.ts, which avoids import cycles). */
export function registerJobHandlers(next: JobHandlers): void {
  handlers = { ...handlers, ...next };
}

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: { age: 3_600, count: 500 },
  removeOnFail: { age: 86_400, count: 500 },
};

let queue: Queue | null | undefined;
let queueConnection: Redis | null = null;

// BullMQ does not close a connection that was handed to it, so we do.
async function quitQuietly(connection: Redis | null): Promise<void> {
  if (!connection) return;
  try {
    await connection.quit();
  } catch {
    connection.disconnect();
  }
}

function getQueue(): Queue | null {
  if (queue !== undefined) return queue;
  if (!queueEnabled()) {
    queue = null;
    return null;
  }
  queueConnection = createBullConnection('bullmq-queue');
  queue = new Queue(QUEUE_NAME, {
    connection: queueConnection,
    defaultJobOptions,
  });
  queue.on('error', (error) => consoleLogger.error('queue.error', { error: String(error) }));
  return queue;
}

/**
 * The queue needs Redis AND is on by default. Set QUEUE_ENABLED=false to keep using
 * Redis for rate limits / cache / live events while running jobs in-process: an idle
 * BullMQ worker polls Redis about every 10 s (~80,000 commands per day per worker),
 * which can be too much for a command-limited plan such as Upstash's free tier.
 */
export function queueEnabled(): boolean {
  return redisEnabled() && process.env.QUEUE_ENABLED !== 'false';
}

async function runInline<K extends JobName>(name: K, data: JobPayloads[K]): Promise<void> {
  const handler = handlers[name] as ((payload: JobPayloads[K]) => Promise<void>) | undefined;
  if (!handler) {
    consoleLogger.error('queue.no_handler', { job: name });
    return;
  }
  try {
    await handler(data);
  } catch (error) {
    consoleLogger.error('queue.inline_job_failed', { job: name, error: String(error) });
  }
}

/**
 * Retries an uncertain queue add using the same job options/jobId. It never
 * invokes an inline handler: after a timeout Redis may still accept the add.
 */
export async function addToQueueWithRetry<T>(
  add: () => Promise<T>,
  onFailure: (error: unknown, attempt: number) => void,
  timeoutMs = ENQUEUE_TIMEOUT_MS,
  attempts = QUEUE_ADD_ATTEMPTS,
): Promise<boolean> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        add(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('queue add timed out')), timeoutMs);
          timer.unref();
        }),
      ]);
      return true;
    } catch (error) {
      onFailure(error, attempt);
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return false;
}

/** Selects exactly one execution mode: configured queue OR no-Redis inline mode. */
export async function dispatchJob(
  queueConfigured: boolean,
  add: () => Promise<unknown>,
  runInlineJob: () => Promise<void>,
  onQueueFailure: (error: unknown, attempt: number) => void,
  timeoutMs = ENQUEUE_TIMEOUT_MS,
  attempts = QUEUE_ADD_ATTEMPTS,
): Promise<void> {
  if (!queueConfigured) {
    void runInlineJob();
    return;
  }
  await addToQueueWithRetry(add, onQueueFailure, timeoutMs, attempts);
}

/**
 * Adds a job. Without Redis it runs in-process. With Redis, uncertain failures
 * are retried using the same job identity and never fall through to inline work.
 * This chooses at-most-once side effects over a possible duplicate; callers log
 * queue exhaustion and the durable job can be retried by the producer.
 */
export async function enqueue<K extends JobName>(
  name: K,
  data: JobPayloads[K],
  options?: JobsOptions,
): Promise<void> {
  const q = getQueue();
  await dispatchJob(
    Boolean(q),
    () => q!.add(name, data, options),
    () => runInline(name, data),
    (error, attempt) => consoleLogger.error('queue.enqueue_attempt_failed', {
        job: name,
        attempt,
        error: String(error),
      }),
  );
}

/** Starts consuming jobs. Returns a function that stops the worker gracefully. */
export function startWorker(): () => Promise<void> {
  if (!queueEnabled()) return async () => undefined;

  const concurrency = Number(process.env.BULLMQ_CONCURRENCY) || 5;
  // How long an idle worker waits between polls. Higher = fewer Redis commands.
  const drainDelaySeconds = Number(process.env.BULLMQ_DRAIN_DELAY_SECONDS) || 15;
  const stalledIntervalMs = Number(process.env.BULLMQ_STALLED_INTERVAL_MS) || 60_000;

  const workerConnection = createBullConnection('bullmq-worker');
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const handler = handlers[job.name as JobName] as ((payload: unknown) => Promise<void>) | undefined;
      if (!handler) throw new Error(`No handler registered for job "${job.name}".`);
      await handler(job.data);
    },
    {
      connection: workerConnection,
      concurrency,
      drainDelay: drainDelaySeconds,
      stalledInterval: stalledIntervalMs,
    },
  );

  worker.on('failed', (job, error) => {
    consoleLogger.error('queue.job_failed', {
      job: job?.name,
      jobId: job?.id,
      attempt: job?.attemptsMade,
      error: String(error),
    });
  });
  worker.on('error', (error) => consoleLogger.error('queue.worker_error', { error: String(error) }));

  consoleLogger.info('queue.worker_started', { concurrency, drainDelaySeconds });

  return async () => {
    await worker.close();
    await quitQuietly(workerConnection);
  };
}

/**
 * Registers a repeatable job. BullMQ stores the schedule in Redis, so with
 * several instances it still fires once per interval (not once per instance).
 */
export async function scheduleRecurring(name: 'maintenance', everyMs: number): Promise<void> {
  const q = getQueue();
  if (!q) return;
  await q.upsertJobScheduler(
    `${name}-schedule`,
    { every: everyMs },
    { name, data: {}, opts: { attempts: 1, removeOnComplete: true, removeOnFail: 50 } },
  );
}

export async function closeQueue(): Promise<void> {
  const q = queue;
  const connection = queueConnection;
  queue = undefined;
  queueConnection = null;
  if (q) await q.close();
  await quitQuietly(connection);
}
