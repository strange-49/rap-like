# Rapido-Like Ride-Hailing Platform

## 1. Project Overview

Build a production-style ride-hailing platform inspired by services such as Rapido/Uber, but with original branding and implementation.

The platform connects customers with riders for real-time ride booking, tracking, payments, notifications, and ride management.

The system has FOUR separate interfaces:

1. Rider Mobile App
2. Customer Web App
3. Corporate Client Dashboard
4. Admin Dashboard

All interfaces communicate with a shared backend and database.

The project should be developed incrementally and professionally, not as a single monolithic demo.

---

# 2. Core Technology Stack

## Frontend

### Rider Mobile App
- React Native
- TypeScript

### Customer Web App
- React
- TypeScript

### Corporate Client Dashboard
- React
- TypeScript

### Admin Dashboard
- React
- TypeScript

## Backend

- Node.js
- TypeScript
- REST APIs
- WebSockets for real-time communication

## Database

- PostgreSQL
- Prisma ORM
- Prisma Migrations

## External Services

- Firebase Cloud Messaging for push notifications
- Razorpay for payment processing
- Twilio for OTP/SMS/communication features
- OpenStreetMap ecosystem for map/location functionality

---

# 3. System Architecture

Use a shared-backend architecture.

Four clients communicate with one backend:

    Rider Mobile
          |
    Customer Web
          |
    Client Dashboard
          |
    Admin Dashboard
          |
          v
    Node.js Backend
          |
     +----+----+
     |         |
   Prisma   WebSockets
     |
 PostgreSQL

External services are integrated through the backend where appropriate.

Do NOT create separate independent backends for each frontend.

---

# 4. Applications

The repository should contain these main applications:

- rider-mobile
- customer-web
- client-dashboard
- admin-dashboard
- backend

Shared code should be placed in reusable packages.

Suggested structure:

    apps/
      rider-mobile/
      customer-web/
      client-dashboard/
      admin-dashboard/

    backend/

    prisma/

    packages/
      types/
      validation/
      constants/
      utils/

---

# 5. User Roles

The system must support role-based access control.

Primary roles:

- CUSTOMER
- RIDER
- CLIENT_ADMIN
- ADMIN

## CUSTOMER

An individual passenger.

Permissions:
- Manage own profile
- Request rides
- Track own ride
- View own ride history
- Make payments
- Rate riders
- Submit complaints

A customer must not access another customer's private data.

## RIDER

A driver/rider who provides rides.

Permissions:
- Manage own profile
- Manage vehicle information
- Go online/offline
- Receive ride requests
- Accept/reject rides
- Update ride status
- Share live location
- View own ride history
- View own earnings
- Receive notifications

A rider must not access another rider's private data.

## CLIENT_ADMIN

An administrator belonging to a corporate organization.

A client represents a company that uses the platform to provide rides to its employees.

Example:

    ABC Technologies
        |
        +-- Employee A
        +-- Employee B
        +-- Employee C

The Client Admin can access ONLY data belonging to their own organization.

Permissions:
- Manage company profile
- Manage company employees
- View employee rides
- View active company rides
- View company billing
- View company reports

A Client Admin MUST NOT access another company's employees, rides, billing, or reports.

## ADMIN

A platform administrator.

The Admin Dashboard is used by authorized employees/operators of the ride-hailing platform itself.

Admin has platform-wide management capabilities.

Permissions may include:
- Manage customers
- Manage riders
- Manage corporate clients
- Manage employees
- Monitor rides
- Manage payments
- Manage complaints
- View reports
- Manage platform settings
- Manage rider verification

Admin permissions must be implemented using RBAC and should be extensible for more granular admin roles later.

---

# 6. Multi-Tenancy

Corporate clients must be treated as separate tenants.

Example:

    Client A
      |
      +-- Employee A1
      +-- Employee A2

    Client B
      |
      +-- Employee B1
      +-- Employee B2

Client A must never be able to access Client B's data.

Tenant ownership must be enforced at the backend/database-access layer.

Do not rely only on frontend filtering for security.

---

# 7. Authentication & Authorization

Implement secure authentication and authorization.

Requirements include:

- Registration
- Login
- Logout
- OTP where appropriate
- Token/session handling
- Password security where passwords are used
- Authentication middleware
- Role-based authorization
- Tenant-level authorization

Every protected backend route must verify authentication and appropriate permissions.

Never trust role information supplied directly by the frontend.

---

# 8. Core Ride Lifecycle

Use a consistent ride lifecycle.

Primary statuses:

    REQUESTED
        ↓
    ACCEPTED
        ↓
    ARRIVING
        ↓
    ARRIVED
        ↓
    STARTED
        ↓
    COMPLETED

Cancellation must be supported where appropriate.

Ride state transitions must be validated by the backend.

Do not allow clients to arbitrarily change ride states.

---

# 9. Ride System

Core ride functionality should include:

- Ride request
- Rider discovery/matching
- Ride assignment
- Accept/reject
- Pickup
- Arrival
- Ride start
- Ride completion
- Cancellation
- Fare calculation
- Ride history
- Ratings
- Payment status

The exact matching/fare algorithms should be designed before implementation.

---

# 10. Real-Time System

Use WebSockets for real-time functionality.

Real-time functionality includes:

- New ride requests
- Rider acceptance
- Ride status updates
- Rider live location
- Customer live tracking
- Arrival notifications
- Ride completion
- Ride cancellation
- Real-time admin ride monitoring

Avoid repeatedly polling the backend when WebSockets are appropriate.

---

# 11. Location & Maps

Use the OpenStreetMap ecosystem for map/location functionality.

The system may require:

- Map display
- Current location
- Pickup location
- Destination
- Geocoding
- Reverse geocoding
- Routing
- Distance calculation
- ETA
- Rider live location

Remember that OpenStreetMap is primarily map data. Routing, geocoding, tiles, and other services may require separate compatible providers.

Do not hard-code a specific provider unless explicitly decided.

---

# 12. Push Notifications

Use Firebase Cloud Messaging where appropriate.

Notification examples:

Rider:
- New ride request
- Ride cancellation
- Earnings update
- Verification update
- System notification

Customer:
- Rider assigned
- Rider arriving
- Ride completed
- Payment update
- System notification

Client:
- Ride updates
- Billing updates
- Reports
- Employee-related activity

Admin:
- Platform alerts
- Payment issues
- Complaints
- Rider verification

FCM/device tokens must be handled securely.

---

# 13. Payments

Use Razorpay for payment processing.

Payment flow should generally be:

    Customer
       ↓
    Booking/payment initiation
       ↓
    Razorpay
       ↓
    Payment
       ↓
    Backend verification
       ↓
    Payment record

Never trust payment success based only on frontend state.

Payment status must be verified server-side.

Support appropriate payment states such as:

- PENDING
- SUCCESS
- FAILED
- REFUNDED

---

# 14. Twilio

Twilio may be used for:

- OTP
- SMS
- Phone verification
- Communication features

Only implement the specific Twilio functionality required by the product requirements.

Secrets/API credentials must never be committed to Git.

---

# 15. Corporate Client Features

The Corporate Client Dashboard should include:

- Company dashboard
- Employee management
- Employee details
- Employee ride history
- Active rides
- Corporate ride history
- Billing
- Invoices
- Reports
- Company settings

Example:

    Client Dashboard

    Dashboard
    Employees
    Rides
    Active Rides
    Billing
    Reports
    Settings
    Support

Corporate clients should only see their own tenant data.

---

# 16. Admin Dashboard

The Admin Dashboard is for authorized platform administrators.

It should support:

- Overall platform analytics
- Customer management
- Rider management
- Corporate client management
- Employee management
- Ride management
- Live ride monitoring
- Payment management
- Complaints/support
- Reports
- Notifications
- Platform settings

Admin can access platform-wide data according to their assigned permissions.

---

# 17. Rider Mobile App

The Rider application should include:

- Authentication
- Profile
- Vehicle information
- Document verification
- Online/offline mode
- Ride requests
- Accept/reject
- Navigation/location
- Pickup
- Ride start
- Ride completion
- Live location
- Ride history
- Earnings
- Notifications
- Ratings
- Help/support
- Settings

The interface should be mobile-first.

---

# 18. Customer Web App

The Customer application should include:

- Authentication
- Profile
- Pickup selection
- Destination selection
- Map
- Ride options
- Fare estimate
- Booking
- Rider search
- Rider assignment
- Live ride tracking
- Payment
- Ride history
- Ratings
- Receipts
- Notifications
- Help/support

The interface must be responsive.

---

# 19. Data & Database

Use PostgreSQL as the primary database.

Use Prisma as the ORM.

Database schema should be designed around actual domain relationships.

Potential entities include:

- User
- Customer
- Rider
- Vehicle
- Client
- Employee
- Ride
- Payment
- Rating
- Notification
- Complaint
- Document
- Location
- Invoice

Do NOT blindly create all models.

Before implementing the final schema:
1. Analyze relationships.
2. Identify ownership.
3. Identify cardinality.
4. Identify indexes.
5. Identify constraints.
6. Identify tenant boundaries.
7. Review the schema.

Use Prisma migrations for database changes.

Never modify production database structure manually when a Prisma migration should be used.

---

# 20. API Architecture

Use REST APIs for standard request/response operations.

API design should be:

- Consistent
- Versionable
- Validated
- Authenticated
- Authorized
- Error-handled

Use appropriate HTTP methods and status codes.

Do not place business logic directly inside route handlers when it should belong in services/use-case layers.

---

# 21. Validation

Validate all external input.

Validate:

- Request bodies
- Query parameters
- Route parameters
- Authentication data
- Payment-related input
- Corporate employee data
- Ride requests

Never assume frontend validation is sufficient.

Backend validation is mandatory.

---

# 22. Frontend Server State

Use React Query / TanStack Query where appropriate for API/server-state management.

Use it for concerns such as:

- Fetching
- Caching
- Loading states
- Error states
- Refetching
- Mutations
- Server-state synchronization

Do not use global state for data that belongs naturally in server-state management.

---

# 23. UI / UX

The project has four distinct interfaces:

1. Rider Mobile
2. Customer Web
3. Corporate Client Dashboard
4. Admin Dashboard

Use a consistent design system while allowing each interface to have appropriate UX.

The design should be:
- Modern
- Clean
- Professional
- Responsive
- Accessible
- Production-quality

Do not copy Rapido's exact branding or UI.

---

# 24. Figma

Figma should contain:

- Design system
- Components
- Rider mobile screens
- Customer web screens
- Client dashboard
- Admin dashboard
- User flows
- Prototypes

Design reusable components and states.

Important states should include:

- Loading
- Empty
- Error
- Success
- Disabled
- Unauthorized
- Not found
- Network failure

---

# 25. Security

Security is a core requirement.

Never commit:

- API keys
- Passwords
- Database credentials
- Firebase credentials
- Razorpay secrets
- Twilio credentials
- JWT secrets
- Production environment variables

Use environment variables.

Maintain separate development and production configuration.

Never expose server secrets to frontend applications.

Validate and sanitize external input.

Implement authorization on the backend.

---

# 26. Git & GitHub

Use Git for version control.

Use meaningful commits.

Examples:

    feat: add authentication module
    feat: add rider ride request flow
    feat: add corporate client dashboard
    fix: validate ride status transition
    refactor: improve ride service

Do not commit generated secrets or environment files containing credentials.

Keep the repository clean and organized.

---

# 27. Development Approach

Build incrementally.

DO NOT attempt to generate the entire application in one step.

Preferred sequence:

1. Project instructions
2. Development environment
3. Monorepo
4. Backend foundation
5. Database/schema
6. Authentication/security
7. Shared packages
8. Customer web
9. Client dashboard
10. Admin dashboard
11. Rider mobile
12. Core ride system
13. WebSockets
14. Maps/location
15. Firebase notifications
16. Razorpay payments
17. Twilio features
18. Corporate features
19. Admin/operations features
20. Testing
21. Deployment

Dependencies between features should be respected.

---

# 28. Testing

Testing should be added progressively.

Include appropriate:

- Unit tests
- API tests
- Integration tests
- Frontend tests
- Critical ride-flow tests
- Authentication/authorization tests
- Tenant-isolation tests
- Payment-flow tests

Security-sensitive and business-critical logic should have strong test coverage.

---

# 29. Deployment

The final system should be deployable.

Plan for:

- Production frontend builds
- Backend deployment
- Production PostgreSQL
- Environment variables
- Database migrations
- CI/CD
- Logging
- Monitoring
- Error tracking

Do not assume local development configuration is suitable for production.

---

# 30. AI Agent Rules

When working on this repository:

1. Read this AGENTS.md before making significant changes.
2. Understand the existing architecture before modifying it.
3. Do not rewrite large portions of the project unnecessarily.
4. Do not introduce a new technology when an existing project technology already solves the problem.
5. Do not change the core architecture without explaining why.
6. Do not make major architectural decisions silently.
7. Ask for approval before making major architectural changes.
8. Prefer small, reviewable changes.
9. Keep code modular and maintainable.
10. Follow TypeScript best practices.
11. Keep frontend, backend, database, and shared concerns separated.
12. Never expose secrets.
13. Never bypass backend authorization.
14. Never weaken tenant isolation for convenience.
15. Run appropriate tests/type checks after significant changes.
16. Explain important implementation decisions.
17. If requirements are ambiguous, identify the ambiguity instead of guessing.
18. Do not claim something works without actually verifying it.

---

# 31. Current Project State

The repository is currently being initialized from scratch.

Before implementing major functionality:

1. Inspect the repository.
2. Review this AGENTS.md.
3. Propose the initial architecture.
4. Identify dependencies.
5. Identify any ambiguities.
6. Wait for approval before making major architectural changes.

Do not build the entire application immediately.

The goal is a maintainable, production-style system rather than a quick prototype.