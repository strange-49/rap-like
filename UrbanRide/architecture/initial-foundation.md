# Initial Foundation

## Approved decisions

- npm workspaces manage the monorepo.
- The backend uses Node.js and TypeScript directly. No backend framework is included.
- The rider client will use Expo, React Native, and TypeScript when mobile implementation begins.
- PostgreSQL and Prisma are the planned persistence technologies.
- Corporate tenancy uses one shared database. Tenant scope is enforced in backend access code, never through client filtering.
- Authentication will use phone OTP.
- India and INR are the initial market assumptions.
- Map services will be selected through provider-agnostic interfaces compatible with OpenStreetMap.

## Boundary of this foundation

This workspace intentionally contains no app implementation, server, API routes, database schema, migrations, authentication logic, or third-party integration. Those will be added in reviewed increments.

## Planned ownership boundaries

- `apps/*` own interface-specific presentation and client configuration.
- `backend` owns transport, authorization, tenant scoping, domain workflows, and integration adapters.
- `prisma` will own the Prisma schema, migrations, and seed configuration after domain modelling is approved.
- `packages/*` contain only framework-neutral contracts and helpers that genuinely need reuse.
