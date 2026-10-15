# JurisMind

JurisMind is a multi-tenant SaaS platform for legal CRM, law firm practice management, and legal operations. The repository is an npm and Turborepo monorepo containing a Next.js web application and a NestJS REST API.

## Requirements

- Node.js 24.15 or later (Nest CLI generation requirement)
- npm 11 or later
- Docker Desktop only when running the future local PostgreSQL service

## Getting started

```powershell
npm install
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/api/.env.example apps/api/.env
npm run dev
```

The web app runs at `http://localhost:3000`; the API runs at `http://localhost:4000`. Environment examples contain placeholders only. The initial API health endpoint is `GET /api/health`.

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

See [docs/architecture.md](docs/architecture.md) for module boundaries, the planned data and authorization model, and implementation stages. Authentication, tenant isolation, persistence, and audit controls are not yet implemented. Do not put real secrets in tracked files or treat frontend checks as authorization.

## Dashboard preview

The web app includes a sample-data legal operations workspace adapted from the MIT-licensed AdminCN template. See [third-party notices](docs/third-party-notices.md) for attribution and licensing details. The dashboard and module pages are UI previews only; authentication, persistence, authorization, and audit logging are not connected.

## Current status

Milestone 1 establishes the monorepo and application scaffolds. The AdminCN-based legal dashboard is now a UI preview. Next steps are a separate public marketing site, then verified authentication, persistence, tenant-aware authorization, CMS, and end-to-end flow. No product capability should be considered implemented until it exists and is verified in this repository.
