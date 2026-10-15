# JurisMind architecture

## Current foundation

JurisMind uses a modular monolith in an npm workspaces/Turborepo repository. `apps/web` is a Next.js App Router application and `apps/api` is a NestJS REST API. Shared packages belong in `packages/*` only when code is genuinely reused and can have a clear typed boundary. Business rules belong in API modules, not page components or controllers.

The web app communicates with the API over HTTP. The API is the authority for identity, authorization, validation, and access to legal and tenant data. The API exposes a versionable REST surface under `/api`; OpenAPI documentation will be added alongside API contracts.

## Security and tenant model

Tenant identity must come from the authenticated server-side session and membership lookup, never from a caller-controlled tenant identifier. Every tenant-owned query and mutation must be scoped and authorized on the server. Uncertain access is denied. Validate and normalize all untrusted input at API boundaries, and avoid logging client, matter, document, billing, communication, password, or session data.

Future relational models should encode tenant ownership in keys and constraints so relationships cannot silently cross firms. PostgreSQL row-level security may provide defense in depth; it requires a restricted application role, transaction-scoped tenant context, and careful connection-pool behavior. It does not replace application authorization. Audit events should record security-relevant actions without copying privileged content. Matter-level permissions and ethical walls remain future requirements and are not implemented by this foundation.

Sessions should be server-managed, stored securely, and issued in appropriately scoped `HttpOnly`, `Secure`, and `SameSite` cookies. Passwords must use a suitable password hashing function. Never store plaintext passwords or commit credentials, private keys, tokens, or real environment files.

## Application boundaries

- `apps/web`: public pages, authenticated user interface, accessible reusable UI, and typed API client code. It must not own authorization decisions or secrets.
- `apps/api`: Nest modules for identity/access, firms/tenants, clients, matters, documents, billing, audit, and content as each is implemented. Controllers handle transport; services contain business logic; data access remains tenant-aware.
- `packages/*`: optional shared contracts or utilities with no server secrets and no accidental coupling between apps.
- `docs/`: architecture decisions, operational guidance, and security design as those decisions are made.

PostgreSQL and Prisma will be introduced with migrations in a later milestone. Redis, queues, and object storage are deferred until a concrete requirement exists.

## Delivery sequence

1. Repository foundation: workspace config, docs, and web/API scaffolds.
2. Dashboard UI integration: adapt the MIT-licensed AdminCN template into a legal workspace with clearly labeled sample data.
3. Public marketing site after its visual direction is developed and approved.
4. Authentication, server-managed sessions, tenant-aware persistence, and authorization tests.
5. Protected CMS and localized published content.
6. End-to-end verification of publishing and access-denial behavior.

The current scaffold has no authentication, database, tenant isolation, audit trail, CMS, or production data. Documentation must not imply otherwise.
