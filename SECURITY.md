# Security Policy

## Scope
This repository contains a portfolio implementation of an insurance management platform. It may process sensitive business and customer-like data in development environments.

Do not commit real customer information, production credentials, API keys, database connection strings, JWT secrets, SMTP credentials, or private certificates.

## Security Baseline
The application is expected to maintain:

- Strong, environment-provided JWT signing secrets.
- HttpOnly authentication cookies for the web client; bearer tokens remain supported for non-browser clients.
- Authentication endpoint rate limiting to reduce credential-stuffing and abuse.
- Password hashing with bcrypt.
- Explicit role-based authorization on protected operations.
- Parameterized PostgreSQL queries.
- Restricted CORS origins.
- Request body size limits.
- Security response headers.
- TLS verification for non-local PostgreSQL connections.
- Sanitized production error responses.
- Audit logging for security-sensitive business actions.
- Dependency and secret scanning in CI.

## Secrets
Use `.env` files locally and configure secrets through the deployment platform in production. `.env.example` files contain placeholders only.

If a secret is ever committed, rotate it immediately. Removing the file from Git history does not make a leaked credential safe.

## Reporting a Vulnerability
Do not disclose exploitable vulnerabilities in public issues. Contact the repository owner privately with:

1. A concise description of the vulnerability.
2. Affected component or endpoint.
3. Reproduction steps or proof of concept.
4. Security impact.
5. Suggested mitigation, if available.

## Authentication Session Design

The browser receives the access token in an HttpOnly cookie so application JavaScript cannot directly read the session credential. The frontend keeps a short-lived runtime token only for compatibility with legacy API callers and excludes it from persisted Zustand state. Logout clears the server-side cookie.

Password reset tokens are generated with cryptographic randomness, stored hashed, expire after one hour, and are invalidated after successful use. The reset flow returns a generic response for unknown email addresses to reduce account enumeration.

The current authentication rate limiter is process-local. Production deployments with multiple API instances should replace it with a shared store such as Redis.
