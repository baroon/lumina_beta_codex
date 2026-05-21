# New machine setup

Everything needed to build, test, run, and continue the project is in this repo. Clone to **`C:\Code\Baroon\Lumina_Beta_Claude`** (keeping the same path means Claude Code's per-project state lines up, and the working agreement in `src/CLAUDE.md` auto-loads).

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
pnpm dev:web                                      # web on :5173 (CORS allows 5173/5174/3000)
```

## 5. Verify the toolchain

```bash
pnpm check:all                          # lint + typecheck + vitest coverage + manifest
dotnet test apps/api/AIVisibility.sln   # backend tests
pnpm --filter web build-storybook       # all stories compile
```

## Notes

- **Working style travels via git:** the red→green-per-bug-fix rule and the present-trade-offs collaboration style live in `src/CLAUDE.md` (auto-loaded), so a fresh Claude session matches the established experience. Claude's home-dir memory (`~/.claude/.../memory/`) is machine-local and optional to copy.
- **Phase 2 starts from the docs:** `docs/requirements/REQ-002`, `docs/adr/ADR-002`, `docs/kanban/KANBAN-002` (tracker setup). Phase 1 is tagged `phase-1-discovery`.
