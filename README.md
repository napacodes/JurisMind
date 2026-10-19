# JurisMind

JurisMind is a multi-tenant SaaS platform for legal CRM, law firm practice management, and legal operations. The repository is an npm and Turborepo monorepo containing a Next.js web application and a NestJS REST API.

## Requirements

- Node.js 24.15 or later (Nest CLI generation requirement)
- npm 11 or later
- Docker Desktop when running the local PostgreSQL service

## Getting started

```powershell
npm install
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/api/.env.example apps/api/.env
npm run dev
```

The web app runs at `http://localhost:3000`; the API runs at `http://localhost:4000`. Before starting the API, replace the local placeholders in `apps/api/.env`; the database URL must match the PostgreSQL variables. Environment examples contain placeholders only. The API validates configuration and connects to PostgreSQL when the first database operation runs. The health endpoint is `GET /api/health` and remains a liveness response; it does not probe database readiness.

To start local PostgreSQL and apply the additive identity/workspace schema:

```powershell
docker compose --env-file apps/api/.env up -d postgres
npm run db:validate --workspace=@jurismind/api
npm run db:generate --workspace=@jurismind/api
npm run db:migrate:deploy --workspace=@jurismind/api
```

See [database and authorization foundation](docs/architecture.md#identity-and-authorization-foundation-milestone-4-phase-1) for role boundaries and migration safeguards. Never use production secrets in local environment files.

## Workspace commands

Run from the repository root:

```powershell
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
```

Use `npm run <command> --workspace=@jurismind/web` or `--workspace=@jurismind/api` to target an application. Workspaces are under `apps/*` and shared packages under `packages/*`.

## Architecture and security

See [docs/architecture.md](docs/architecture.md) for module boundaries, authentication configuration, and the authorization model. Server-side session and workspace permission checks, selected Super Admin workflows, and lawyer credential review are implemented. Tenant isolation is enforced for those scoped workflows, but comprehensive tenant isolation, live matter-level authorization, and ethical walls are not implemented. Do not put real secrets in tracked files or treat frontend checks as authorization.

## Dashboard preview

The web app includes a sample-data legal operations workspace adapted from the MIT-licensed AdminCN template. See [third-party notices](docs/third-party-notices.md) for attribution and licensing details. Dashboard and legal operations records remain sample-data previews and are not backed by live matter or firm records. Authentication and workspace gates protect the workspace routes; separate APIs provide persistence and audit events for platform user administration, lawyer credential review, and CMS content management.

## Current status

Milestones 1–3 establish the monorepo, AdminCN-based legal dashboard preview, and public marketing site. Milestone 4 adds identity and workspace foundations, server-managed authentication with password recovery and MFA, server-side practice and platform authorization, invitations and individual-practice provisioning, Super Admin user administration, lawyer credential review, and CMS publishing. Matter-level authorization, legal operational data workflows, complete browser acceptance, and production deployment readiness remain outstanding. No product capability should be considered accepted until it has been verified in the relevant environment.
