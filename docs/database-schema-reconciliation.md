# Database Schema Reconciliation

## Status

The Prisma schema has been reconciled against the Neon production database for the SmartInsurance project (production branch). This is a **schema-model reconciliation only**; no production database objects were modified.

## Production source of truth

- Neon project: SmartInsurance (summer-king-12968376)
- Branch: production (br-bitter-credit-aydapgep)
- Database: neondb
- PostgreSQL: 17.x
- Application access pattern: Express/TypeScript + raw PostgreSQL (pg)

## What was corrected

- Prisma IDs now reflect production UUID primary keys rather than CUIDs.
- Production columns and nullability were aligned for the public schema.
- Production-only fields were added across claims, policies, users, reporting, fraud, OCR, integrations, notifications, and other domains.
- users.address reflects the production text column rather than Prisma JSON.
- users.role is represented as a scalar string so the database-owned enum does not become an application migration dependency.
- Production unique constraints were represented in Prisma.
- The obsolete Prisma-only approval delegation model was removed because the production public schema does not contain that table.
- Prisma relations were intentionally not recreated in this baseline because the running application does not use Prisma Client for data access; the existing application uses the pg pool.

## Migration policy

**Do not run prisma migrate dev or prisma migrate deploy against production yet.** The repository migration history predates this reconciliation and is not a trustworthy baseline of the current Neon schema.

The next database step is to establish an explicit migration baseline and, separately, add foreign-key/index metadata to the Prisma model if Prisma becomes an active ORM.

## Validation

The reconciliation was generated from production information_schema column metadata, primary-key metadata, and unique constraints on the Neon production branch. Production data was not changed.
