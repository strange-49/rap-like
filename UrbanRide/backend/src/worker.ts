import { prisma } from './common/database/prisma'
import { consoleLogger } from './common/logging/logger'
import { INSTANCE_ID } from './config/instance'
import { closeRedis } from './infrastructure/redis'
import { registerAllJobHandlers } from './jobs/handlers'
import { closeQueue, queueEnabled, startWorker } from './jobs/queue'
import { startRideMaintenance } from './jobs/ride-maintenance'

/**
 * Dedicated background-worker process (no HTTP server).
 *
 *   pnpm --filter @ride-platform/backend worker
 *
 * Run it next to API instances started with RUN_WORKER=false, so slow work
 * (push notifications, refunds, maintenance) never competes with API traffic.
 * Requires REDIS_URL: the queue lives in Redis.
 */
if (!queueEnabled()) {
  consoleLogger.error('worker.queue_required', {
    message: 'The worker needs REDIS_URL and QUEUE_ENABLED not set to false. Without them API instances run jobs inline.',
  })
  process.exit(1)
}

registerAllJobHandlers()
const stopWorker = startWorker()
const stopMaintenance = startRideMaintenance()

consoleLogger.info('worker.started', { instance: INSTANCE_ID })

let stopping = false
async function shutdown(reason: string): Promise<void> {
  if (stopping) return
  stopping = true
  consoleLogger.info('worker.shutdown', { reason })
  setTimeout(() => process.exit(1), 15_000).unref()
  try {
    stopMaintenance()
    await stopWorker()
    await closeQueue()
    await closeRedis()
    await prisma.$disconnect()
  } finally {
    process.exit(0)
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('unhandledRejection', (reason) => {
  consoleLogger.error('worker.unhandled_rejection', { reason: String(reason) })
})
