# UrbanRide Rider FCM / Online Availability Changes

## Implemented in this source package

- Rider availability is persisted in PostgreSQL as `User.isOnline` (default `false`).
- Added authenticated `GET /riders/availability` and `PUT /riders/availability` endpoints.
- Rider Mobile loads its availability from the backend and only updates its Redux state after the backend confirms a change.
- A rider is set Offline on a fresh rider login, so an old session/app shutdown does not leave that rider eligible for new-ride pushes after signing in again.
- New-ride FCM notifications are sent only to registered device tokens belonging to active Rider users whose server-side `isOnline` is `true`.
- Android FCM messages target the existing `ride-requests` notification channel. The Rider app channel uses high importance, default sound, and vibration `[0, 300, 200, 300]`.
- Existing notification data and ride-request overlay/tap flow are preserved.

## Required database step before running the updated backend

From the UrbanRide repository root, with `DATABASE_URL` configured:

```powershell
pnpm exec prisma migrate deploy
pnpm db:generate
```

Then run your normal backend and Rider Mobile workflows. Do not run `migrate dev` against a production database.

## Verification limitation

This source package does not include `node_modules`. A local TypeScript check was attempted in the packaging environment but could not complete because dependencies and Node type declarations were not installed there. Run the project's normal `pnpm` typecheck after installing dependencies and generating Prisma Client.

## Important behaviour

- A rider starts Offline after a fresh login and must explicitly tap **GO ONLINE**.
- Tapping **GO OFFLINE** updates the backend first; the UI changes only after the server confirms it.
- Ride-request push eligibility is determined by the persisted backend status, not the app's local Redux state.
