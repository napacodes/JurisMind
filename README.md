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

See [docs/architecture.md](docs/architecture.md) for module boundaries, authentication configuration, and the authorization model. Authentication establishes an identity only; tenant isolation, firm workflows, and matter-level authorization are not implemented. Do not put real secrets in tracked files or treat frontend checks as authorization.

## Dashboard preview

The web app includes a sample-data legal operations workspace adapted from the MIT-licensed AdminCN template. See [third-party notices](docs/third-party-notices.md) for attribution and licensing details. The dashboard and module pages are UI previews only; authentication, persistence, authorization, and audit logging are not connected.

## Current status

Milestones 1–3 establish the monorepo, AdminCN-based legal dashboard preview, and public marketing site. Milestone 4 Phase 1 defines the PostgreSQL identity/workspace/session/audit schema, and Phase 2 adds backend authentication and server-managed sessions. Next steps include authorization, tenant-aware persistence, CMS, and end-to-end access-denial verification. No product capability should be considered implemented until it exists and is verified in this repository.
