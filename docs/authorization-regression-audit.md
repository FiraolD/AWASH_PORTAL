# Authorization Regression Audit — October 2026

## Scope

This audit covers the security-sensitive routes reviewed after the Neon/Prisma schema reconciliation. Production database changes were not made.

## Findings fixed in this phase

### 1. Policy list disclosure
`GET /policies` was authenticated but returned every policy to any authenticated user. This was an object-level authorization/data-isolation defect.

Fix: customers now receive only policies where `policies.userId = req.user.id`; authorized underwriting/customer administration roles retain staff listing access.

### 2. Policy statistics disclosure
`GET /policies/stats` was authenticated but exposed aggregate portfolio statistics to any authenticated user.

Fix: endpoint now requires an approved staff role.

### 3. Policy document disclosure
`GET /policies/:policyId/documents` did not verify policy ownership before returning documents.

Fix: ownership is checked for customers; approved staff roles may access policy documents.

### 4. Policy document download authorization
`GET /policies/documents/:documentId/download` previously allowed only the owner or MASTER_ADMIN.

Fix: the same controlled underwriting/customer-administration staff group used for policy document access is now authorized.

### 5. User object-level authorization
`GET /users/:id` authenticated the requester but did not restrict access to the requested user object.

Fix: a requester may access their own user record; CUSTOMER_ADMIN and MASTER_ADMIN may access other users.

### 6. Claim document upload authorization
`POST /claims/:id/documents` required authentication but did not verify that the requester owned the claim or had claims-staff access.

Fix: the claim owner or an authorized claims-access role must pass the ownership check before files are inserted.

## Existing controls confirmed

- Authentication re-queries the current user from PostgreSQL.
- Deactivated users are rejected.
- Claims GET/document GET/download already perform ownership or staff authorization checks.
- Claim creation verifies that the selected policy belongs to the authenticated customer.
- Support-ticket access is scoped to the customer's own tickets, while administrative views are role restricted.
- Configuration, settings, approval rules, role levels, products, perils, riders, premium rates, and hospital administration use explicit authorization middleware.

## Remaining authorization work

1. Review claim review/status permissions for assignment-level authorization rather than role-only authorization.
2. Review admin/executive role boundaries and reduce use of broad EXECUTIVES where a narrower permission is appropriate.
3. Review upload MIME/content validation and file path handling.
4. Add automated authorization regression tests covering 401, 403, ownership, and authorized staff cases.
5. Verify frontend behavior against the tightened policy/document endpoints.

## Deployment rule

These authorization changes are on the schema-reconciliation branch and should be validated before merging. No production database migration is part of this work.

## Automated regression coverage

A backend authorization regression suite now covers the core policy primitives used by the protected endpoints:

- unauthenticated/invalid authorization context fails closed
- explicit role allowlists
- exact resource ownership
- customer access to own policy/profile
- customer denial for another customer's policy/profile
- privileged staff access to customer-owned resources
- claims-staff access to claim resources
- customer denial for another customer's claim/document resource
- policy statistics restricted to privileged roles
- missing owner identity fails closed

The suite is located at `backend/src/__tests__/authorization.policy.test.ts` and runs with Node's built-in test runner through `npm test`.

CI workflow:
`.github/workflows/backend-authorization-tests.yml`

Latest branch run: **PASS** — dependency installation, TypeScript build, and all authorization regression tests completed successfully.

These are authorization-policy regression tests, not production-database integration tests. HTTP/database integration coverage should be added after the test environment is made deterministic and isolated from production.
