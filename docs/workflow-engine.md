# Canonical Workflow Engine & Approval Workbench

## Purpose

AWASH_PORTAL now uses one workflow engine for approval-controlled insurance decisions. Policy and claim approval are workflow instances, not separate approval implementations.

### Separation of responsibilities

- **Operational assignment** decides who investigates/handles work.
- **Approval authority** decides who may authorize a decision.
- **Workflow Engine** evaluates configured conditions, authority limits and approval steps.
- **Approval Workbench** presents pending approval tasks in one queue.

Assignment therefore remains independent from approval.

## Engine model

`workflow_definitions` → `workflow_versions` → `workflow_steps`

Runtime:

`workflow_instances` → `workflow_tasks` → `workflow_decisions`

Governance:

`workflow_authorities` + `workflow_delegations` + `workflow_history`

## Controls

- Versioned workflows; active versions are immutable.
- Sequential steps.
- Parallel `ANY`, `ALL`, and `QUORUM` decision modes.
- Authority limits by role level, entity and optional product.
- Requester self-approval prevention.
- Authority/role verification at decision time.
- One-time task decisions protected by row locking.
- Decision and history records are append-oriented.
- SLA due dates on tasks.
- Delegation data model reserved for controlled implementation.
- Payment is intentionally excluded from this migration and engine rollout.

## API

- `GET /workflow/definitions`
- `POST /workflow/definitions`
- `GET /workflow/definitions/:id`
- `PUT /workflow/versions/:id/steps`
- `POST /workflow/versions/:id/activate`
- `GET /workflow/authorities`
- `POST /workflow/authorities`
- `GET /workflow/role-levels`
- `GET /workflow/workbench`
- `POST /workflow/tasks/:id/decision`
- `GET /workflow/instances/:id`
- `GET /workflow/history/:entityType/:entityId`

The legacy `/approval` API remains mounted temporarily for compatibility, but new UI and new workflow work must use `/workflow`.

## Insurance control principles

The design follows a maker-checker model: the requester cannot approve their own request, approval is bounded by authority, and the system retains the workflow version and decision history used for the outcome. Authority thresholds are a first-class routing control rather than a hard-coded role check.

## Deployment safety

The SQL migration is intentionally not applied to Neon production. Validate it on the disposable Neon branch first. Only after application build/tests and database validation pass should a production migration plan be considered.
