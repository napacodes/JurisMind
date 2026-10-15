# JurisMind — AI Coding Instructions

## Product
JurisMind is a multi-tenant SaaS platform for legal CRM,
law firm practice management, and legal operations.

## Stack
- Frontend: Next.js, React, TypeScript
- UI: Tailwind CSS and shadcn/ui
- Forms: React Hook Form and Zod
- Server state: TanStack Query when appropriate
- Internationalization: next-intl
- Backend: NestJS and TypeScript
- API: REST with OpenAPI documentation
- Database: PostgreSQL
- ORM: Prisma
- Future infrastructure: Redis, BullMQ, S3-compatible storage
- Monorepo: npm workspaces and Turborepo

## Architecture
- Keep the frontend in apps/web and the backend in apps/api.
- Prefer a modular monolith over premature microservices.
- Keep business logic out of UI components and controllers.
- Use explicit module boundaries and typed API contracts.
- Keep secrets and server-only code out of frontend bundles.
- Document significant architectural decisions in docs/.

## Security — Mandatory
- Treat tenant isolation as a core authorization requirement.
- Never rely on frontend checks as the only access control.
- Enforce authentication and authorization on the server.
- Deny access by default when authorization is uncertain.
- Validate and normalize all untrusted input.
- Use secure, server-managed sessions and appropriate cookie settings.
- Never store plaintext passwords or expose session secrets.
- Never commit credentials, private keys, tokens, or real environment files.
- Design tenant-owned database relationships to prevent cross-tenant access.
- Plan PostgreSQL row-level security carefully; application checks alone
  must not be assumed to provide complete database isolation.
- Record security-relevant actions in an auditable manner.
- Do not log passwords, session tokens, or sensitive legal document contents.
- Never bypass authorization to make a test or demo pass.

## Legal data
- Treat client, matter, document, billing, and communication data as sensitive.
- Do not expose one firm's data to another firm.
- Avoid logging privileged or confidential information.
- Design matter-level permissions and ethical walls as explicit future
  authorization requirements; do not imply they exist before implementation.

## Engineering standards
- Use strict TypeScript and avoid `any` unless justified.
- Prefer small, maintainable modules and clear naming.
- Add tests for important business rules and authorization boundaries.
- Run relevant lint, typecheck, test, and build commands after changes.
- Do not silently remove existing functionality or overwrite user work.
- Explain material dependencies and security tradeoffs.
- Do not claim a command or test succeeded unless it was executed.
