# New machine setup

Everything needed to build, test, run, and continue the project is in this repo. Clone to **`C:\Code\Baroon\Lumina_Beta_Codex`** and read `src/agent.md` before making changes.

## 1. Install dependencies

```bash
cd src
pnpm install                              # frontend (apps/web)
dotnet restore apps/api/AIVisibility.sln  # backend
```

`node_modules`, `bin/`, `obj/`, and `storybook-static/` are gitignored — they rebuild here.

## 2. Local secret (gitignored — recreate by hand)

Create `src/apps/api/AIVisibility.Api/appsettings.Local.json` with a freshly **rotated** OpenAI key (the tracked `appsettings.Development.json` keeps `ApiKey: ""`):

```json
{
  "OpenAI": { "ApiKey": "sk-...", "Model": "gpt-4o-mini" }
}
```

`Program.cs` loads this file optionally and it overrides `appsettings.Development.json`.

## 3. Database (Postgres)

The connection string is in `appsettings.Development.json` (`Host=localhost;Port=5432;Database=lumina;Username=lumina;Password=lumina_dev`). Start the local stack, then apply all migrations — the schema is fully reproducible from git:

```bash
docker compose up -d   # from src/ — Postgres (+ RabbitMQ, Azurite, Mailpit, Gotenberg); see LOCAL-DEV.md
dotnet ef database update --project apps/api/AIVisibility.Infrastructure --startup-project apps/api/AIVisibility.Api
```

## 4. Run

```bash
# API — the env var is REQUIRED (no launchSettings.json; otherwise the base
# appsettings loads with an empty connection string and Hangfire fails).
ASPNETCORE_ENVIRONMENT=Development pnpm dev:api   # PowerShell: $env:ASPNETCORE_ENVIRONMENT="Development"; pnpm dev:api
pnpm dev:web                                      # web on :3000 (CORS allows only localhost:3000)
```

## 5. Verify the toolchain

```bash
pnpm check:all                          # lint + typecheck + vitest coverage + manifest
dotnet test apps/api/AIVisibility.sln   # backend tests
pnpm --filter web build-storybook       # all stories compile
```

## Notes

- **Working style travels via git:** the red→green-per-bug-fix rule, story/test coverage expectations, manifest updates, lint rules, and present-trade-offs collaboration style live in `src/agent.md`, so any implementation agent or engineer can follow the same conventions.
- **What to work on next:** this guide is setup-only and phase-agnostic — for the current phase and its specs see the README "Status" section, `docs/03-phase-roadmap.md`, and the latest `docs/kanban/`.
