// Load test for the UrbanRide API (autocannon).
//
//   pnpm --filter @ride-platform/backend loadtest
//
// Settings (environment variables):
//   LOADTEST_URL          API to hit                      default http://localhost:3000   (or the nginx address)
//   LOADTEST_USERNAME     an existing CUSTOMER account    required for the authenticated scenarios
//   LOADTEST_PASSWORD     its password
//   LOADTEST_CONNECTIONS  concurrent connections          default 50
//   LOADTEST_DURATION     seconds per scenario            default 15
//
// Start the server you are testing with RATE_LIMIT_DISABLED=true, otherwise the per-IP rate
// limit (900 requests/minute) correctly answers 429 and you are measuring the limiter.
// Do NOT point this at Upstash's free tier through a Redis-backed limiter: it fires thousands of
// Redis commands per second.
//
// Results are printed and saved to backend/loadtest/results/<timestamp>.json so you can
// compare "before" and "after" a change (e.g. 1 instance vs 2 behind nginx).

import autocannon from 'autocannon';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE_URL = (process.env.LOADTEST_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const CONNECTIONS = Number(process.env.LOADTEST_CONNECTIONS ?? 50);
const DURATION = Number(process.env.LOADTEST_DURATION ?? 15);
const USERNAME = process.env.LOADTEST_USERNAME;
const PASSWORD = process.env.LOADTEST_PASSWORD;

async function login() {
  if (!USERNAME || !PASSWORD) return null;
  const response = await fetch(`${BASE_URL}/auth/development/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!response.ok) {
    throw new Error(`Login failed (HTTP ${response.status}). Check LOADTEST_USERNAME / LOADTEST_PASSWORD.`);
  }
  return (await response.json()).token;
}

function run(options) {
  return new Promise((resolve, reject) => {
    autocannon({ connections: CONNECTIONS, duration: DURATION, ...options }, (error, result) =>
      error ? reject(error) : resolve(result),
    );
  });
}

const token = await login();

const scenarios = [
  { name: 'health (HTTP overhead only)', url: `${BASE_URL}/health` },
  { name: 'ready (one DB round trip)', url: `${BASE_URL}/ready` },
  {
    name: 'fare-estimate (map + cache path)',
    url: `${BASE_URL}/locations/fare-estimate?pickupLatitude=12.9756&pickupLongitude=77.6066&dropLatitude=12.9784&dropLongitude=77.6408&vehicleType=auto`,
  },
  ...(token
    ? [{ name: 'customer rides (auth + DB list)', url: `${BASE_URL}/rides/customer`, headers: { authorization: `Bearer ${token}` } }]
    : []),
];

if (!token) {
  console.log('No LOADTEST_USERNAME/LOADTEST_PASSWORD set: skipping the authenticated scenario.\n');
}

const rows = [];
for (const scenario of scenarios) {
  process.stdout.write(`Running "${scenario.name}" for ${DURATION}s with ${CONNECTIONS} connections... `);
  const result = await run(scenario);
  rows.push({
    scenario: scenario.name,
    requestsPerSecond: Math.round(result.requests.average),
    p50: result.latency.p50,
    p97_5: result.latency.p97_5,
    p99: result.latency.p99,
    maxMs: result.latency.max,
    total: result.requests.total,
    non2xx: result.non2xx,
    errors: result.errors,
    timeouts: result.timeouts,
  });
  console.log('done');
}

console.log(`\nTarget: ${BASE_URL}   connections: ${CONNECTIONS}   duration: ${DURATION}s per scenario\n`);
console.table(
  rows.map((row) => ({
    scenario: row.scenario,
    'req/s': row.requestsPerSecond,
    'p50 ms': row.p50,
    'p97.5 ms': row.p97_5,
    'p99 ms': row.p99,
    'non-2xx': row.non2xx,
    errors: row.errors,
  })),
);

if (rows.some((row) => row.non2xx > 0)) {
  console.log(
    'Some responses were not 2xx. If they are 429, start the server with RATE_LIMIT_DISABLED=true. ' +
      'If they are 5xx, check the server log.',
  );
}

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = join(here, 'results');
await mkdir(outputDir, { recursive: true });
const file = join(outputDir, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
await writeFile(file, JSON.stringify({ target: BASE_URL, connections: CONNECTIONS, durationSeconds: DURATION, rows }, null, 2));
console.log(`\nSaved ${file}`);
