# ARCH-010: Deployment and Local Development

## Cloud Provider

Azure.

## Deployment Model

Container-first from day one.

Runtime containers:

- web
- api
- worker

Hosting:

- Azure Container Apps for all runtime containers
- Azure Container Registry for images

Supporting services:

- Azure Database for PostgreSQL
- Azure Blob Storage
- Azure Service Bus
- Azure Key Vault
- Application Insights

## Image Strategy

Use separate Docker images:

- ai-visibility-web
- ai-visibility-api
- ai-visibility-worker

Use multi-stage Docker builds.
Use immutable image tags based on git SHA/build ID.
Do not bake environment-specific values into images.
Runtime config comes from environment variables, Container Apps secrets, and Azure Key Vault.

## Health Checks

API:

- `/health/live`
- `/health/ready`

Worker:

- `/health/live`
- `/health/ready`

Frontend:

- `/`

## CI/CD

Use GitHub Actions.

Pipeline:

- Build frontend image
- Build API image
- Build worker image
- Push images to Azure Container Registry
- Deploy to Azure Container Apps

Migrations:

- Run as explicit pipeline step or migration job.
- Do not run production migrations automatically on API startup.

Environments:

- local
- dev
- prod

Staging can be added later.

## Local Development

Docker Compose provides infrastructure:

- PostgreSQL
- RabbitMQ (local transport for MassTransit, replacing Azure Service Bus)
- Azurite
- Mailpit
- Gotenberg

Run apps directly:

- Frontend: `pnpm dev`
- API: `dotnet run`
- Worker: `dotnet run`

Adapter mapping:

- Azure Blob Storage ↔ Azurite
- Azure Service Bus ↔ RabbitMQ (via MassTransit transport configuration)
- Postmark ↔ Mailpit
- Azure Key Vault ↔ local secrets/env
- Hangfire uses PostgreSQL in both environments (no adapter swap needed)

## Code Quality Enforcement

Set up from day one alongside Docker Compose infrastructure.

`pnpm install` in `src/` triggers the `prepare` script, which installs Husky pre-commit hooks. Every `git commit` runs:

1. **Prettier** — auto-formats staged files
2. **ESLint** — enforces architectural boundaries (layer imports, deprecated paths, cross-feature bans)
3. **Manifest sync** — validates component files against `component-manifest.json`, checks for missing stories (ERROR) and missing tests (WARN)

Run `pnpm check:all` before marking work complete — chains ESLint, TypeScript type-check, Vitest tests, and manifest sync.

See `src/agent-system/project-structure.md` § Pre-Commit Enforcement System for full configuration details.

## Rule

Same application workflows locally and in Azure. Only infrastructure adapters change by configuration.
