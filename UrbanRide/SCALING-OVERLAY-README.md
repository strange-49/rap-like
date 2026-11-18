# UrbanRide scaling integration

This document describes scaling changes currently present in this checkout. It is not evidence that external services or production deployment have been exercised.

## Redis outage behaviour

- Login, corporate login, signup, activation, and ride-start OTP limiters use shared Redis counters. In production they fail closed with HTTP 503 if Redis is missing or unavailable; limits do not silently become per-instance. Local development can use in-memory limits when Redis is not configured.
- Geocoding, routing cache, and rider location reads/writes degrade to process-local memory or the existing routing fallback. These are optimizations, not authorization controls.
- WebSocket events are delivered locally and bridged through Redis pub/sub when configured. During Redis outage, connected clients on other instances may miss live events; clients should refresh state through HTTP.
- With BullMQ enabled, a queue-add timeout is retried with the same deterministic job ID. The request path never runs the same job inline after an uncertain add. Exhausted adds are logged and can remain unscheduled; producers or operators must retry from durable business state. With queueing disabled, jobs run inline in the API process.

## Delivery guarantees

- BullMQ is at-least-once. Push delivery uses a stable per-event dedupe claim before sending and intentionally avoids retrying an ambiguous FCM send, so push side effects are at-most-once and can be missed after an uncertain provider response. The claim is shared across instances only while Redis is available; without Redis it is process-local.
- Refund attempts use a database compare-and-set, a stable Razorpay idempotency key per attempt, and remain `REFUND_PENDING` until Razorpay reports confirmation. Refund webhooks are matched to the current attempt and amount. Razorpay behaviour has not been live-tested here.
- Ride state and rider assignment use PostgreSQL conditional updates and database constraints. The integration test requires an explicitly separate `TEST_DATABASE_URL`.

## Operations

- Set `REDIS_URL` on every API and worker instance. Production instances must share the same `AUTH_SESSION_SECRET`; configure trusted proxy headers and explicit CORS origins.
- `RUN_WORKER=false` leaves job processing to `pnpm --filter @ride-platform/backend worker`. Do not disable all workers while BullMQ is enabled.
- `backend/.env.example` lists optional Redis, queue, rate-limit, geocoder, routing, and instance settings. Never put actual credentials in tracked files.
- Migrations `20261115000000_ride_composite_indexes`, `20261117120000_safe_refund_state`, and `20261117121000_rider_active_assignment_guard` are ordered chronologically. They have not been applied to any database. Review existing indexes and active ride rows on a disposable PostgreSQL database before deployment.
- Nginx guidance is in `deploy/LOAD-BALANCING.md` and `deploy/nginx/nginx.conf`. It is configuration guidance only; this checkout has not been validated behind nginx or multiple live instances.
- `backend/loadtest/run.mjs` is opt-in. Use a disposable environment and test credentials; load testing has not been run here.

## Verification limits

Local unit tests, Prisma validation/generation, and TypeScript checks are reported separately in the integration audit. PostgreSQL and Redis integration suites require separate test services. Firebase delivery, Razorpay refunds, load balancing, and physical Android behaviour remain unverified.
