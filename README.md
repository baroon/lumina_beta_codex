# Lumina — AI Visibility Platform

Track and improve how a brand shows up in AI assistants' answers. Monorepo: a React + TypeScript front end and a .NET 8 back end (MediatR/CQRS + EF Core + PostgreSQL).

## Layout

| Path | What's there |
| --- | --- |
| `src/agent.md` | **Project conventions — read this first** (architecture, workflow chains, tests, manifest, styling, working agreement). |
| `src/apps/web` | Front end (React + Vite + Tailwind + Storybook) |
| `src/apps/api` | Back end (.NET 8, MediatR, EF Core) |
| `src/agent-system/` | `CHAINS.md` (workflow recipes), `component-manifest.json` (component registry), `project-structure.md` |
| `docs/` | Product brief, domain model, phase roadmap, and per-phase specs (`requirements/`, `adr/`, `kanban/`) |

## Getting started

Full setup (new machine or new contributor): **[`docs/dev/NEW-MACHINE.md`](docs/dev/NEW-MACHINE.md)**. In short, from `src/`:

```bash
pnpm install                                   # web deps
dotnet restore apps/api/AIVisibility.sln       # api deps
docker compose up -d                           # Postgres (+ RabbitMQ, Azurite, Mailpit, Gotenberg)
# create apps/api/AIVisibility.Api/appsettings.Local.json with your OpenAI key (see NEW-MACHINE.md)
dotnet ef database update --project apps/api/AIVisibility.Infrastructure --startup-project apps/api/AIVisibility.Api
$env:ASPNETCORE_ENVIRONMENT="Development"; pnpm dev:api   # API on :3001
pnpm dev:web                                              # web on :3000
```

Verify the toolchain: `pnpm check:all` (front end) and `dotnet test apps/api/AIVisibility.sln` (back end).

## How we work

- **Conventions live in [`src/agent.md`](src/agent.md)**: atomic-design layers, a co-located test **and** story per component, the component manifest, ESLint layer boundaries, design tokens, centralized copy, and the working agreement (red→green per bug fix; present trade-offs in the message).
- **Non-trivial changes follow a chain** from [`src/agent-system/CHAINS.md`](src/agent-system/CHAINS.md) — 17 recipes, each ending in a 14-point review gate. Rule of thumb: if a change touches a tested/storied file or a controller/handler/entity/migration, use a chain; otherwise talk directly.

## Status

- **Phase 1 — Discovery: complete** (tag `phase-1-discovery`). Brand onboarding → website crawl + LLM extraction → confirmation wizard → confirmed discovery output for downstream phases.
- **Phase 2 — Tracker setup & execution: next.** Specs: `docs/requirements/REQ-002`, `docs/adr/ADR-002`, `docs/kanban/KANBAN-002`. Full roadmap: `docs/03-phase-roadmap.md`.
