# Local Development

## Goal

Local development should be zero-to-minimal cost and should not require Azure access for normal development.

## Local Infrastructure

Docker Compose runs:

- PostgreSQL
- RabbitMQ (local transport for MassTransit, replacing Azure Service Bus)
- Azurite
- Mailpit
- Gotenberg

## Local App Execution

Run application services directly for fast iteration:

```bash
pnpm --dir apps/web dev

dotnet run --project apps/api/src/AIVisibility.Api

dotnet run --project apps/api/src/AIVisibility.Worker
```

## Local Adapter Mapping

- Azure Blob Storage ↔ Azurite
- Azure Service Bus ↔ RabbitMQ (via MassTransit transport configuration)
- Postmark ↔ Mailpit
- Azure Key Vault ↔ local secrets/env
- Hangfire uses PostgreSQL in both environments (no adapter swap needed)

## Rule

No separate business workflows for local vs cloud.
Only infrastructure adapters differ by configuration.
