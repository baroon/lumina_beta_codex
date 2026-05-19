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

## Code Quality & Pre-Commit Hooks

After running `pnpm install` in `src/`, Husky installs a pre-commit hook automatically (via the `prepare` script). Every `git commit` runs:

1. **Prettier** — auto-formats staged `.ts`, `.tsx`, `.css`, `.json`, `.md` files
2. **ESLint** — checks architectural boundary rules (layer imports, deprecated paths, cross-feature bans)
3. **Manifest sync** — validates five checks:
   - `MISSING_MANIFEST_ENTRY` — component file has no manifest entry (ERROR)
   - `ORPHAN_MANIFEST_ENTRY` — manifest entry points to missing file (ERROR)
   - `DEPRECATED_DIRECTORY` — file in deprecated directory (ERROR)
   - `MISSING_STORY_FILE` — shared component has no `.stories.tsx` (ERROR)
   - `MISSING_TEST_FILE` — shared component has no `.test.tsx` (WARN, non-blocking)

If a commit is rejected, fix the reported violations and commit again. See `docs/dev/COMMANDS.md` for manual commands.

**Before marking work complete**, run:

```bash
pnpm check:all    # ESLint → TypeScript type-check → Vitest tests → manifest sync
```

**First-time setup note:** If pre-commit hooks don't run, execute `pnpm run prepare` from `src/` to initialize Husky.

## Rule

No separate business workflows for local vs cloud.
Only infrastructure adapters differ by configuration.
