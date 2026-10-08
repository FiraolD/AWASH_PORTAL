# AWASH Insurance Management Platform

> A full-stack insurance operations platform demonstrating production-oriented web engineering, workflow design, role-based security, and business process automation.

[![CI](https://github.com/FiraolD/AWASH_PORTAL/actions/workflows/ci.yml/badge.svg)](https://github.com/FiraolD/AWASH_PORTAL/actions/workflows/ci.yml)

## Product Overview

AWASH Portal is a modular insurance management application covering the customer lifecycle and internal insurance operations. It models policy purchase, underwriting, claims, support, configuration, approval workflows, auditability, and role-specific dashboards.

### Core capabilities

- Customer registration, email verification, authentication, profile management, and password workflows.
- Product discovery, dynamic policy application, premium calculation, policies, documents, and payments.
- Product-specific claim submission and claim lifecycle tracking.
- Multi-level underwriting review, premium adjustment, customer decision, and final approval.
- Claims assignment, officer review, approval/rejection, and status history.
- Role-based dashboards for customers, claims, underwriting, administrators, and executives.
- Configurable products, coverage tiers, premium rates, perils, riders, approval rules, and assignment rules.
- Support tickets and responses.
- Audit logging for operational traceability.
- PDF and email service integrations.

## Architecture

```text
┌──────────────────────────────┐
│ React + TypeScript + Vite    │
│ Tailwind + Radix/shadcn UI   │
│ Zustand + TanStack Query     │
└──────────────┬───────────────┘
               │ HTTPS / REST
               ▼
┌──────────────────────────────┐
│ Node.js + Express + TS       │
│ Auth • RBAC • Workflows      │
│ Validation • Audit • Services│
└──────────────┬───────────────┘
               │ pg connection pool
               ▼
┌──────────────────────────────┐
│ PostgreSQL                   │
│ users • policies • claims    │
│ products • audit • workflow  │
└──────────────────────────────┘
```

See [docs/architecture.md](docs/architecture.md) for the engineering architecture and quality gates.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| UI | Radix UI, shadcn-style components, Framer Motion, Lucide |
| Client state | Zustand, TanStack React Query |
| Forms | React Hook Form, Zod |
| Charts | Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, `pg` connection pool |
| Authentication | JWT, bcryptjs |
| Email | Nodemailer / SMTP |
| Documents | PDFKit |
| Deployment | Vercel-compatible frontend, independently deployable API |
| CI | GitHub Actions |

## Application Areas

### Customer
- Register and verify email.
- Browse products and submit policy applications.
- View policies and documents.
- File and track claims.
- Respond to underwriting decisions.
- Manage profile and support tickets.

### Underwriting
- Review policy applications.
- Inspect policy and risk information.
- Adjust premiums.
- Send customer offers.
- Approve, reject, and perform final approvals according to role.

### Claims
- View assigned work.
- Review submitted claims.
- Record officer notes.
- Approve/reject according to authority.
- Track claim status and history.

### Administration
- Manage users and roles.
- Configure products and rates.
- Configure perils and riders.
- Configure claims assignment and approval rules.
- Manage system settings.
- Inspect audit logs.

## Security Model

Security is enforced on the backend; frontend route guards are not considered an authorization boundary.

- JWT authentication with configurable expiration.
- Password hashing with bcrypt.
- Role-based authorization middleware.
- Account status checked against the database during authentication.
- Parameterized PostgreSQL queries.
- Restricted CORS origins.
- Request body size limits.
- Security response headers and disabled Express fingerprinting.
- Production error responses avoid exposing stack traces.
- Non-local PostgreSQL TLS certificate verification is enabled by default.
- Secrets are supplied through environment variables.

See [SECURITY.md](SECURITY.md) for the security baseline and vulnerability reporting process.

## Key Business Workflows

### Policy lifecycle

```text
Application
    ↓
PENDING_UNDERWRITING
    ↓
Underwriting review
    ├── Reject → REJECTED
    ├── Direct approval → ACTIVE
    └── Premium adjustment
             ↓
    AWAITING_CUSTOMER_APPROVAL
             ↓
    PENDING_FINAL_APPROVAL
             ↓
           ACTIVE
```

### Claim lifecycle

```text
SUBMITTED → UNDER_REVIEW → REVIEWED → APPROVED → PAID
                         └────────────→ REJECTED
```

## Repository Structure

```text
AWASH_PORTAL/
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── stores/
│   │   └── styles/
│   ├── package.json
│   └── package-lock.json
├── backend/
│   ├── src/
│   │   ├── api/v1/
│   │   ├── controllers/
│   │   ├── config/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── types/
│   ├── package.json
│   └── package-lock.json
├── docs/
│   └── architecture.md
├── .github/workflows/
│   └── ci.yml
├── SECURITY.md
└── README.md
```

## Local Development

### Prerequisites

- Node.js 22 recommended.
- PostgreSQL 14+.
- npm.

### 1. Clone

```bash
git clone https://github.com/FiraolD/AWASH_PORTAL.git
cd AWASH_PORTAL
```

### 2. Configure backend

```bash
cd backend
npm ci
cp .env.example .env
```

Set `DATABASE_URL` and a strong `JWT_SECRET` of at least 32 characters. For a managed PostgreSQL instance, configure `DEPLOYED_DATABASE_URL` and keep `DB_SSL_REJECT_UNAUTHORIZED=true` unless a documented provider requirement says otherwise.

### 3. Configure frontend

```bash
cd ../frontend
npm ci
cp .env.example .env
```

Set `VITE_API_URL` to the API base URL.

### 4. Run locally

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

The current frontend development configuration uses port `3011`; the backend defaults to `5001`.

## Environment Variables

### Backend

| Variable | Required | Purpose |
|---|---:|---|
| `NODE_ENV` | Yes | Runtime environment |
| `PORT` | No | API port |
| `DATABASE_URL` | One of DB URLs | Local/default PostgreSQL connection |
| `DEPLOYED_DATABASE_URL` | One of DB URLs | Managed/production PostgreSQL connection |
| `DB_SSL_REJECT_UNAUTHORIZED` | No | PostgreSQL certificate verification; defaults to secure behavior |
| `DB_SSL_CA` | No | Optional PostgreSQL CA certificate |
| `JWT_SECRET` | Yes | JWT signing key; minimum 32 characters |
| `JWT_EXPIRES_IN` | No | Token lifetime; defaults to `7d` |
| `CORS_ORIGINS` | Recommended | Comma-separated allowed origins |
| `FRONTEND_URL` | Recommended | Frontend origin used by email flows |
| `SMTP_HOST` / `SMTP_PORT` | Email features | SMTP server configuration |
| `SMTP_USER` / `SMTP_PASS` | Email features | SMTP credentials |

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Public API base URL used by the browser |

Never put private credentials in frontend environment variables. Vite variables are exposed to browser code.

## API

The API is exposed through the versioned router at `/api/v1`. A compatibility mount at `/api` is also present.

Representative endpoint groups:

- `/auth` — registration, login, email verification, profile.
- `/users` — user operations.
- `/products` and `/coverage-tiers` — insurance products and coverage.
- `/policies` — policy lifecycle.
- `/claims` and `/claims-assignment` — claims and assignment.
- `/approval` — approval configuration and workflow.
- `/underwriting` — underwriting operations.
- `/payments` — payment operations.
- `/premium-rates`, `/perils`, `/riders` — pricing and coverage configuration.
- `/support` — customer support.
- `/dashboard` — operational dashboard data.
- `/audit` — audit information.

The API returns JSON and uses standard HTTP status codes for validation, authentication, authorization, not-found, and server errors.

## Quality & CI

GitHub Actions validates each backend and frontend workspace on pushes and pull requests.

Current quality gates:

1. Clean checkout.
2. `npm ci` from committed lockfiles.
3. Frontend linting.
4. Frontend and backend builds.

Future quality gates will add automated unit/integration tests, dependency auditing, secret scanning, and API contract checks.

## Engineering Roadmap

### Phase 1 — Foundation
- [x] Establish security baseline.
- [x] Add reproducible environment templates.
- [x] Add architecture and security documentation.
- [x] Add CI build/lint gates.

### Phase 2 — Backend hardening
- [ ] Centralize request validation with Zod.
- [ ] Add authentication rate limiting and abuse protection.
- [ ] Add structured request IDs and production logging.
- [ ] Add transactional service boundaries for critical workflows.
- [ ] Audit all privileged endpoints for object-level authorization.

### Phase 3 — Frontend quality
- [ ] Standardize loading, empty, error, and optimistic states.
- [ ] Improve responsive behavior and accessibility.
- [ ] Consolidate duplicate route/page implementations.
- [ ] Add reusable data-table and form patterns.
- [ ] Add frontend error monitoring.

### Phase 4 — Verification
- [ ] Unit tests for authorization and business rules.
- [ ] Integration tests for policy and claim workflows.
- [ ] End-to-end tests for critical user journeys.
- [ ] Database migration/seeding workflow.
- [ ] Performance profiling and query optimization.

## Portfolio Positioning

This project demonstrates more than a CRUD application. It is intended to show:

- Full-stack TypeScript engineering.
- Enterprise-style role-based access control.
- Insurance-domain workflow modeling.
- PostgreSQL-backed business applications.
- API design and integration.
- Security-conscious backend engineering.
- Responsive dashboard and operational UI design.
- CI/CD and engineering documentation.

## License

See repository licensing information before reuse or redistribution.