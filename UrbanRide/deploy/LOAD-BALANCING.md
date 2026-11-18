# Run UrbanRide behind a load balancer (2 backends + nginx + Redis)

What you will have:

```
 browsers / rider app
          |
     nginx :8080            <- the only address clients use
      /        \
 backend :3001  backend :3002      <- two copies of the same API
      \        /
   Redis (Upstash)  +  Postgres    <- shared state
```

This is deployment guidance only. The destination project has not been validated here with a live
nginx, multi-instance PostgreSQL/Redis deployment, Firebase delivery, or an Android device. Validate
those integrations in a disposable environment before production use.

## 0. One-time setup

1. **Redis**: provide a Redis-compatible instance and set its connection string
   (TLS URLs start with `rediss://`) in `backend/.env` as `REDIS_URL=...`.
   Read "Upstash and command limits" in `URBANRIDE-SCALING.md` first (it affects which switches to set).
2. **nginx for Windows**: download the "stable" zip from https://nginx.org/en/download.html and unzip
   it, for example to `C:\nginx`.
3. Choose **one** random secret of 32+ characters. Every instance must use the SAME
   `AUTH_SESSION_SECRET`, otherwise a login handled by instance 1 is rejected by instance 2.

## 1. Start two backend instances (two terminals, from the repo root)

PowerShell, terminal 1:

```powershell
cd backend
$env:PORT = "3001"; $env:INSTANCE_ID = "api-1"
$env:AUTH_SESSION_SECRET = "put-the-same-32+-character-secret-here"
$env:TRUST_PROXY = "true"      # so rate limits see the real client IP forwarded by nginx
pnpm dev
```

Terminal 2: the same, with `PORT = "3002"` and `INSTANCE_ID = "api-2"` (and the same secret).
(`REDIS_URL`, `DATABASE_URL` and the rest come from `backend/.env`, as usual.)

## 2. Start nginx

```powershell
cd C:\nginx
.\nginx.exe -c "C:\full\path\to\repo\deploy\nginx\nginx.conf"
```

Useful: `.\nginx.exe -s reload` (after editing the config) and `.\nginx.exe -s stop`.

## 3. See it working

```powershell
1..8 | % { curl.exe -s -i http://localhost:8080/health | Select-String "X-Instance-Id" }
```

You should see `api-1` and `api-2` alternating. Then stop one backend (Ctrl+C) and repeat: every
request is still answered, now by the survivor.

`http://localhost:8080/ready` shows the instance that answered and whether Redis is `up`.

## 4. Point the apps at nginx

- customer-web, client-dashboard and admin-dashboard: set `VITE_API_BASE_URL=http://localhost:8080`.
- customer-web also needs the WebSocket address: `VITE_WS_URL=ws://localhost:8080/ws`.
  (Put them in each app's `.env.local`, then restart `pnpm dev`.)
- rider app: `EXPO_PUBLIC_API_URL=http://<your-PC-LAN-IP>:8080` (a phone cannot use `localhost`).

## 5. Optional: a dedicated worker

By default each backend instance also processes background jobs. To separate them:

```powershell
# instances 1 and 2 get:  $env:RUN_WORKER = "false"
cd backend; pnpm worker          # a separate process that only runs jobs
```

(Needs the queue enabled: see `QUEUE_ENABLED` in `SCALING-OVERLAY-README.md`.)

## 6. Load-test it

```powershell
$env:LOADTEST_URL = "http://localhost:8080"
$env:LOADTEST_USERNAME = "<a customer account>"; $env:LOADTEST_PASSWORD = "<its password>"
cd backend; pnpm loadtest
```

Start the backends with `RATE_LIMIT_DISABLED=true` for the test (otherwise the per-IP limit correctly
answers 429). Run it once with one backend and once with both behind nginx and keep the two result
files from `backend/loadtest/results/`: that comparison is the evidence for your write-up.
Do not run it with a Redis-backed limiter against Upstash's free tier.

## Why the config looks the way it does

| Line | Reason |
|---|---|
| `least_conn` | WebSockets are long-lived; send new connections to the least busy instance |
| `max_fails=2 fail_timeout=10s` | an instance that fails twice is skipped for 10 s |
| `Upgrade` / `Connection` headers | required for WebSockets to pass through nginx |
| `proxy_read_timeout 3600s` | WebSockets stay open for hours (the backend pings every 30 s) |
| `proxy_next_upstream error timeout http_502 http_503` | retry another instance; nginx never retries a POST, so a booking cannot be duplicated |
| `X-Forwarded-For` + `TRUST_PROXY=true` | rate limits then use the real client IP, not nginx's |
