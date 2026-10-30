# Architecture

## Overview
AWASH_PORTAL is organized as a two-tier web application:

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express + TypeScript
- **Data layer:** PostgreSQL
- **Authentication:** JWT + bcrypt with HttpOnly web sessions and bearer-token compatibility
- **Email:** SMTP via Nodemailer
- **Document generation:** PDFKit

The browser communicates with the backend through versioned REST endpoints. Business rules, authorization, persistence, and integration logic remain on the server.

## Runtime Flow

    Browser
      |
      | HTTPS / JSON REST
      v
    React + Vite
      |
      | /api/v1
      v
    Express API
      |
      +--> Authentication / RBAC / rate limiting
      +--> HttpOnly session cookies
      +--> Business workflows
      +--> Audit logging
      +--> Email / PDF services
      |
      v
    PostgreSQL

## Backend Boundaries
- `api/v1/` — HTTP route composition and endpoint contracts.
- `controllers/` — request-to-business orchestration where used.
- `services/` — reusable application/integration services.
- `middleware/` — authentication, authorization, and cross-cutting HTTP concerns.
- `lib/` — infrastructure utilities such as database access.
- `types/` — shared server-side type definitions.

## Frontend Boundaries
- `pages/` — route-level experiences.
- `components/` — reusable presentation and interaction components.
- `stores/` — client state that must persist across views.
- `hooks/` — reusable React behavior.
- `api/` and `lib/` — API and client-side infrastructure.
- `routes/` — route and access configuration.

## Security Model
Authentication establishes the user identity through a signed JWT. Browser sessions use an HttpOnly cookie; non-browser clients may use the Authorization bearer scheme. Authorization then evaluates the authenticated user's role against the operation being requested. Server-side authorization is authoritative; frontend route guards are only a user-experience layer.

Database queries must remain parameterized. Production database connections must verify TLS certificates unless an explicitly documented managed-database exception exists.

## Performance Principles
- Lazy-load large frontend route modules.
- Keep API payloads bounded.
- Use pagination for large collections.
- Push filtering, sorting, and aggregation to PostgreSQL.
- Avoid N+1 database queries.
- Reuse the PostgreSQL connection pool.
- Keep external email/document operations out of critical database transactions where possible.
- Measure before introducing caching.

## Deployment Model
The frontend can be deployed independently from the API. The backend requires a PostgreSQL connection and runtime secrets. Production configuration should be supplied through the hosting platform rather than committed files.

## Quality Gates
A change is considered portfolio-ready when:

1. TypeScript compilation succeeds.
2. Linting succeeds.
3. Automated tests cover important business/security paths.
4. No secrets are committed.
5. API behavior and error handling are documented.
6. The README reflects the actual implementation.
7. A clean environment can reproduce the application from documented steps.

## Authentication Recovery

Password recovery is implemented as a one-hour, single-use token flow. Reset tokens are stored as SHA-256 hashes in PostgreSQL and the reset endpoint clears the token after a successful password change. The required database columns are provisioned by `backend/prisma/migrations/20261008_auth_hardening.sql`.
