# Security Policy

## Scope
This repository contains a portfolio implementation of an insurance management platform. It may process sensitive business and customer-like data in development environments.

Do not commit real customer information, production credentials, API keys, database connection strings, JWT secrets, SMTP credentials, or private certificates.

## Security Baseline
The application is expected to maintain:

- Strong, environment-provided JWT signing secrets.
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
