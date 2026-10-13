# UrbanRide Admin Dashboard — refined charts + login

This is a source-only update for the existing pnpm monorepo. It does not include or replace package manifests, lockfiles, workspace configuration, node_modules, or build output.

## Apply
1. Back up `D:\rap-like\UrbanRide\apps\admin-dashboard\src`.
2. Extract this ZIP separately and merge its `src` folder into `D:\rap-like\UrbanRide\apps\admin-dashboard\src`.
3. From `D:\rap-like\UrbanRide`, run:
   `pnpm --filter @ride-platform/admin-dashboard dev`

## Login page
Username: `karthik`
Password: `12345678`

Important: this is a client-side development gate only, not secure production authentication. Credentials are checked in the frontend and must be replaced with backend authentication before production deployment.

## Dashboard
- The chart range selector supports 7, 14, and 31 days.
- Graphs are calculated from records returned by the existing `/admin/rides`, `/admin/payments`, and `/admin/overview` endpoints; no synthetic records are created.
- Ride status is displayed as readable labels, counts, and proportional bars.
- Workspace configuration and dependencies are intentionally excluded and must remain managed by the existing pnpm workspace.

A production build was not run against the user's local workspace; verify with `pnpm --filter @ride-platform/admin-dashboard build` after merging.
