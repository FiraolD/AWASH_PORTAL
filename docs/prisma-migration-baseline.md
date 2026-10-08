# Prisma Migration Baseline Strategy

## Status

Production database: Neon SmartInsurance / production
Branch: br-bitter-credit-aydapgep
Database: neondb
Application access model: Express + pg / raw SQL
Prisma Client: currently a build-compatible placeholder; it is not the runtime database access layer.

This document defines the safe path for introducing Prisma migrations later without changing or resetting the existing production database.

## Production schema evidence

- 40 public application tables
- 40 primary keys
- 32 foreign-key constraints
- 69 public indexes
- 6 explicit UNIQUE constraints
- no PostgreSQL migration-history table was found
- no production schema change was performed during reconciliation

The production foreign keys use the existing UUID identifiers and preserve the existing delete behavior. Child records for claims, policies, and products are cascaded only where production already defines ON DELETE CASCADE; user, approval, and assignment references retain NO ACTION.

## Existing repository migration history

The repository contains historical SQL files under backend/prisma/migrations/, including numbered feature migrations and the authentication-hardening SQL migration.

These files are not sufficient evidence that Prisma Migrate has ever been used to manage the current production database because:
1. They are standalone SQL files rather than Prisma Migrate migration directories containing migration.sql.
2. Production has no _prisma_migrations table.
3. The live schema contains substantially more structure than the older migration set.

Therefore the historical SQL files must not be replayed against production as a migration chain.

## Baseline decision

Do not run prisma migrate dev, prisma migrate deploy, prisma migrate reset, or prisma db push against the production branch at this stage.

The correct future approach is:
1. Keep Neon production as the current schema source of truth.
2. Keep the reconciled Prisma schema read-only until Prisma is intentionally adopted by the application.
3. Create a Prisma baseline representing the existing production schema.
4. Mark that baseline as already applied using Prisma's migration-resolution mechanism rather than executing it against production.
5. From that point forward, all intentional schema changes should be generated as normal Prisma migrations and reviewed before deployment.
6. Production deployment should use prisma migrate deploy only after the baseline is established and CI validates the migration chain.

## Baseline requirements

Before generating the actual Prisma baseline migration, the reconciled schema must contain:
- production tables and columns
- production UUID primary keys
- production nullability
- production defaults
- production unique constraints
- production non-unique indexes
- production foreign-key definitions
- production enum/type dependencies where applicable

The current reconciliation has captured production columns, primary keys, unique constraints, and non-unique indexes. Foreign-key metadata has been separately inventoried. Prisma relation fields remain intentionally deferred because the running application uses raw SQL and Prisma is not yet the active ORM.

## Important enum/type note

The policies.status column currently uses the production PostgreSQL enum type policy_status. The Prisma baseline must represent this existing type deliberately rather than introducing a replacement enum or attempting to recreate it with different values.

## Important duplicate-index note

Production contains several redundant-looking indexes that are nevertheless part of the current database state, including indexes on users.email, claims.claimNumber, and role_levels.levelCode where a UNIQUE constraint already creates a unique index.

These should not be dropped during baseline creation. Baseline fidelity is more important than opportunistic index cleanup. Index cleanup should be a separate, evidence-based performance task.

## Recommended implementation sequence

### Phase A — completed
- Read-only production schema inspection.
- Prisma model/column reconciliation.
- Production PK and UNIQUE reconciliation.
- Production index inventory.
- Production FK inventory.
- Production defaults/check/unique constraint review.

### Phase B — current
- Add production non-unique indexes to the Prisma schema.
- Document the baseline strategy.
- Keep PR #5 open and unmerged.
- Validate the Prisma schema/tooling in a non-production environment.

### Phase C — next
Create a disposable Neon branch from production and use it as the validation target for the eventual Prisma baseline.

The validation should prove:
1. Prisma can parse/validate the reconciled schema.
2. A generated baseline accurately describes production.
3. The generated SQL does not contain unexpected destructive operations.
4. The baseline can be marked applied without changing production.
5. A subsequent test migration can be generated and applied to the disposable branch.

### Phase D — only after validation
Adopt Prisma Migrate operationally: production schema -> reconciled schema.prisma -> baseline migration -> prisma migrate resolve --applied <baseline> -> future reviewed Prisma migrations -> CI -> staging/Neon branch -> production.

## Safety rule

The baseline is a history marker, not a reason to recreate the database.

The goal is to tell Prisma: This production schema already exists; consider this starting point applied.

It must not mean: Drop/recreate production so that it looks like the migration.

That distinction is critical because the production database contains live application data and was originally evolved through raw SQL/application migrations.

## Current recommendation

Keep PR #5 as a draft until schema/tooling validation is completed. Do not merge a migration baseline yet. The next technical task is validation on a disposable Neon branch, followed by authorization regression testing.