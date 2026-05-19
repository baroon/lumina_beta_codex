# ADDENDUM-001: Unified Architecture Decisions

**Date:** 2026-05-18
**Context:** Unification of the AI Visibility architecture package with the BOLD Agent-First Builder framework methodology and tooling.
**Participants:** Product owner + Claude Opus 4.6 (architecture review session)

---

## Summary

The original architecture package was reviewed against the BOLD Agent-First Builder reference architecture. A grill-me style decision session resolved all conflicts and gaps to produce a single unified tech stack. This addendum records every change made, the reasoning behind each, and what was deliberately kept unchanged.

---

## Conflicts Resolved

### 1. Frontend Routing: React Router → TanStack Router

**Original:** React Router
**Changed to:** TanStack Router

**Reasoning:** TanStack Router provides full type safety for route params, search params, and loaders. It pairs naturally with the existing TanStack Query + TanStack Table ecosystem choices. File-based routing option preserves agent predictability (agents know where to create new routes). The original spec listed React Router without deep justification.

**Files updated:**
- `ARCH-001-technology-stack.md`
- `ARCH-003-frontend-architecture.md`
- `AGENTS.md`

---

### 2. Local Message Bus: LocalPostgresJobQueue → RabbitMQ via MassTransit

**Original:** Local queue adapter (LocalPostgresJobQueue or LocalQueue)
**Changed to:** RabbitMQ container in Docker Compose, accessed through MassTransit abstraction

**Reasoning:** MassTransit provides a consistent programming model across local (RabbitMQ) and production (Azure Service Bus) environments. It includes built-in saga/state machine support for multi-step scan orchestration, retry policies, dead-letter handling, and scheduled delivery. The local Postgres queue adapter was simpler but did not provide these orchestration capabilities needed for the scan pipeline.

**Files updated:**
- `ARCH-001-technology-stack.md`
- `ARCH-006-background-jobs-events-observability.md`
- `ARCH-008-website-discovery-crawler.md`
- `ARCH-010-deployment-local-dev.md`
- `LOCAL-DEV.md`

---

### 3. Fast Jobs: API-orchestrated async → Hangfire fire-and-forget

**Original:** Discovery crawl was API-orchestrated async (in-process)
**Changed to:** Hangfire fire-and-forget job dispatched from API controller

**Reasoning:** Hangfire provides job persistence (survives API restarts), retry capability, and a monitoring dashboard at zero additional infrastructure cost (uses existing PostgreSQL). The crawl still feels near-instant to the user — Hangfire dispatches immediately — but gains durability. The API controller returns immediately with a crawl ID; progress is streamed via SignalR.

**Files updated:**
- `ARCH-001-technology-stack.md`
- `ARCH-006-background-jobs-events-observability.md`
- `ARCH-008-website-discovery-crawler.md`

---

### 4. Real-Time: SSE → SignalR

**Original:** Server-Sent Events (SSE) for discovery live progress
**Changed to:** SignalR (WebSocket with automatic fallback)

**Reasoning:** SignalR is ASP.NET Core native, provides hub-based grouping (scope updates per user/workspace/scan), automatic reconnection, and works with the existing Clerk auth pipeline. A single real-time transport serves all use cases: discovery crawl progress, scan execution progress, and analysis pipeline updates. SSE would have required manual reconnection handling and per-endpoint wiring.

**Files updated:**
- `ARCH-006-background-jobs-events-observability.md`
- `ARCH-008-website-discovery-crawler.md`
- `AGENTS.md`

---

### 5. Blob Storage Local Dev: Kept Azurite (no change)

**Original:** Azurite
**Decision:** Keep Azurite

**Reasoning:** Initially considered MinIO (S3-compatible), but since production uses Azure Blob Storage, Azurite provides the same SDK (`Azure.Storage.Blobs`) and API surface. No adapter code needed between local and prod. This was a correction during the review — the initial proposal was overridden.

---

### 6. Local Dev Approach: Kept Docker for infra only (no change)

**Original:** Docker Compose for infrastructure, apps run directly
**Decision:** Keep as-is

**Reasoning:** Initially considered Docker for everything (including apps), but running `dotnet run` and `pnpm dev` directly provides faster hot-reload, native debugger attachment, and lower memory overhead. Docker Compose provides infrastructure only (Postgres, RabbitMQ, Azurite, Mailpit, Gotenberg).

---

## Additions from BOLD Framework

### 7. Agent System (new)

**Added:** Full BOLD agent-first development methodology

Components:
- `/agent-system/` directory with chains, prompts, templates, and tools
- `component-manifest.json` — source of truth for all UI components
- `CHAINS.md` — decision tree for which chain to use per task type
- `project-structure.md` — canonical folder structure reference
- `tech-stack.decisions.md` — immutable architecture decisions

Chains to be created for Lumina:
- `create-endpoint.chain.md` — new API endpoint (controller + handler + validator + DTO + test)
- `create-entity.chain.md` — new domain entity (entity + migration + configuration)
- `create-command.chain.md` — new command handler
- `create-query.chain.md` — new query handler
- `create-worker-job.chain.md` — new background job (Hangfire or MassTransit consumer)
- `create-feature-slice.chain.md` — full vertical feature (API + frontend + tests)
- `integrate-provider.chain.md` — new AI platform adapter
- `create-component.chain.md` — new UI component (tsx + test + story + index)
- `bug-fix.chain.md` — minimal-scope bug fix with regression test
- `modify-variant.chain.md` — new variant on existing component

Protected changes requiring human approval:
- Database schema changes (EF Core migrations)
- Route structure changes
- Component deletions
- Auth/tenancy model changes
- MassTransit saga/state machine changes

**Files updated:**
- `ARCH-002-system-architecture.md`
- `AGENTS.md`

---

### 8. Design Token System (new)

**Added:** Design tokens as single source of truth for all visual values

Architecture:
- `design-tokens/tokens.json` — source of truth
- `design-tokens/generate-css.js` — generates CSS custom properties
- `design-tokens/TOKENS.md` — token reference table
- CSS custom properties flow into Tailwind theme extension
- Components use Tailwind classes only, never raw values

Rules:
- Never use raw hex, rgb, or arbitrary Tailwind values in components
- Always check TOKENS.md for existing tokens before creating new ones
- Token changes propagate automatically through the build pipeline

**Files updated:**
- `ARCH-002-system-architecture.md`
- `ARCH-003-frontend-architecture.md`

---

### 9. CVA (class-variance-authority) (new)

**Added:** CVA for variant-driven component styling

Reasoning: CVA maps component variants to Tailwind classes declaratively. Agents produce consistent variant implementations. shadcn/ui already uses CVA internally — making it explicit ensures all custom components follow the same pattern.

**Files updated:**
- `ARCH-001-technology-stack.md`
- `ARCH-003-frontend-architecture.md`
- `AGENTS.md`

---

### 10. MassTransit (new)

**Added:** MassTransit as message bus abstraction layer

Reasoning: MassTransit abstracts the transport (Azure Service Bus in prod, RabbitMQ locally) so application code is transport-agnostic. Provides saga/state machine orchestration for multi-step scan pipelines, retry policies, dead-letter handling, and scheduled delivery.

**Files updated:**
- `ARCH-001-technology-stack.md`
- `ARCH-006-background-jobs-events-observability.md`
- `ARCH-008-website-discovery-crawler.md`
- `ARCH-010-deployment-local-dev.md`
- `LOCAL-DEV.md`
- `AGENTS.md`

---

### 11. Hangfire (new)

**Added:** Hangfire for fast fire-and-forget background jobs

Reasoning: Discovery crawl needs to feel near-instant but shouldn't block the HTTP request. Hangfire dispatches immediately using existing PostgreSQL for persistence — no additional infrastructure. Provides job retry, monitoring dashboard, and survives API restarts.

**Files updated:**
- `ARCH-001-technology-stack.md`
- `ARCH-006-background-jobs-events-observability.md`
- `ARCH-008-website-discovery-crawler.md`
- `ARCH-010-deployment-local-dev.md`
- `AGENTS.md`

---

### 12. SignalR (new)

**Added:** SignalR for real-time server-to-client communication

Reasoning: ASP.NET Core native, WebSocket with automatic fallback, hub-based grouping per user/workspace, TypeScript client available. Single transport for all real-time needs (crawl progress, scan progress, analysis updates).

**Files updated:**
- `ARCH-006-background-jobs-events-observability.md`
- `ARCH-008-website-discovery-crawler.md`
- `AGENTS.md`

---

### 13. Pre-Commit Enforcement System (new)

**Added:** Four-layer automated enforcement to prevent architectural drift

Architecture:
- **Layer 1 — Prettier:** Consistent formatting (semi, double quotes, 100 char width, LF)
- **Layer 2 — ESLint boundary rules:** `no-restricted-imports` enforces atomic design layer boundaries, deprecated path bans, and cross-feature isolation. No custom plugins needed.
- **Layer 3 — Manifest sync validation:** Zero-dependency Node.js script validates component files against `component-manifest.json` (5 checks: missing entries, orphaned entries, deprecated directories, missing story files, missing test files)
- **Layer 4 — Husky + lint-staged:** Pre-commit hook gates every `git commit` through all three layers. Prettier auto-fixes; ESLint and manifest errors block the commit.

Tooling:
- `prettier` + `.prettierrc.json` — workspace-level formatting
- `eslint-config-prettier` — disables ESLint formatting rules that conflict with Prettier
- `husky` — Git hook management, configured to bridge git root and workspace root
- `lint-staged` — runs checks only on staged files for fast feedback
- `scripts/manifest-sync-lite.mjs` — lightweight manifest validation (5 checks, zero external deps)

Manifest sync checks:
- `MISSING_MANIFEST_ENTRY` — component file has no manifest entry (ERROR)
- `ORPHAN_MANIFEST_ENTRY` — manifest entry points to missing file (ERROR)
- `DEPRECATED_DIRECTORY` — file in deprecated directory (ERROR)
- `MISSING_STORY_FILE` — shared component has no `.stories.tsx` (ERROR)
- `MISSING_TEST_FILE` — shared component has no `.test.tsx` (WARN, non-blocking)

CI validation script:
- `pnpm check:all` — chains ESLint → TypeScript type-check → Vitest tests → manifest sync. Agents run this before marking work complete.

Reasoning: After the atomic design restructure (v1.1.0), governance documents defined layer boundaries but nothing enforced them at commit time. Agents and developers could still import from deprecated paths, violate layer boundaries, or create components without manifest entries or stories. This system catches the critical violations automatically without the overhead of AST parsing or dependency graph analysis — appropriate for the current component count in early beta.

**Files updated:**
- `project-structure.md` (§ Pre-Commit Enforcement System)
- `CHAINS.md` (§ Review & Lint checks)
- `AGENTS.md` (§ Commit Enforcement, § Before Completing Work)
- `COMMANDS.md` (§ Code Quality & Formatting)
- `LOCAL-DEV.md` (§ Code Quality & Pre-Commit Hooks)
- `tech-stack.decisions.md` (§ Code Quality Enforcement)
- `08-agent-handoff-instructions.md` (§ Code quality enforcement)
- `ARCH-003-frontend-architecture.md` (§ Component File Convention, § Code Quality Enforcement)
- `ARCH-010-deployment-local-dev.md` (§ Code Quality Enforcement)

---

## Unchanged Decisions (Confirmed)

The following original decisions were reviewed and explicitly kept:

| Decision | Document |
|----------|----------|
| C# / ASP.NET Core backend | ARCH-004 |
| Controller-based REST APIs | ARCH-004 |
| Layered modular monolith (Api/Application/Domain/Infrastructure/Worker) | ARCH-004 |
| Command/Query handler pattern | ARCH-004 |
| PostgreSQL + EF Core + Npgsql | ARCH-005 |
| No generic repositories | ARCH-004 |
| No AutoMapper in v1 | ARCH-004 |
| FluentValidation | ARCH-004 |
| ProblemDetails for errors | ARCH-004 |
| Clerk for authentication | ARCH-009 |
| Workspace-based tenancy | ARCH-009 |
| Azure-native deployment | ARCH-010 |
| Azure Container Apps | ARCH-010 |
| Azure Service Bus (production) | ARCH-006 |
| Azurite for local blob storage | ARCH-010 |
| Postmark + Mailpit for email | ARCH-010 |
| Gotenberg for PDF generation | ARCH-010 |
| Application Insights + OpenTelemetry | ARCH-006 |
| Docker Compose for local infra, apps run directly | ARCH-010 |
| GitHub Actions CI/CD | ARCH-010 |
| React + TypeScript + Vite | ARCH-003 |
| Tailwind + shadcn/ui | ARCH-003 |
| TanStack Query for server state | ARCH-003 |
| React Context + URL params for client state (no Zustand) | ARCH-003 |
| TanStack Table | ARCH-003 |
| React Hook Form + Zod | ARCH-003 |
| Nivo for charts | ARCH-003 |
| MSW for API mocks | ARCH-003 |
| Storybook for component documentation | ARCH-003 |
| Vitest + React Testing Library | ARCH-001 |
| Playwright for E2E | ARCH-001 |
| xUnit + FluentAssertions + NSubstitute | ARCH-001 |
| Testcontainers PostgreSQL | ARCH-001 |
| WebApplicationFactory for API tests | ARCH-001 |
| AngleSharp for HTML parsing | ARCH-008 |
| Adapter pattern for AI providers | ARCH-007 |
| Two-speed discovery model | ARCH-008 |
| Centralized formatters.ts with Intl APIs | ARCH-003 |
| OpenAPI / Swagger | ARCH-001 |

---

## Final Unified Technology Summary

| Category | Technology |
|----------|-----------|
| Frontend Framework | React + TypeScript + Vite |
| Frontend Routing | **TanStack Router** (changed from React Router) |
| UI Framework | Tailwind CSS + shadcn/ui + **CVA** (added) |
| Design Tokens | **tokens.json → CSS vars → Tailwind** (added) |
| Server State | TanStack Query |
| Client State | React Context + URL params (no Zustand) |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Charts | Nivo |
| Testing (FE) | Vitest, React Testing Library, Playwright, MSW |
| Documentation | Storybook |
| Backend Language | C# / ASP.NET Core |
| API Pattern | Controller-based REST + OpenAPI/Swagger |
| Architecture | Layered modular monolith |
| Database | PostgreSQL + EF Core + Npgsql |
| Validation | FluentValidation (BE), Zod (FE) |
| Testing (BE) | xUnit, FluentAssertions, NSubstitute, Testcontainers, WebApplicationFactory |
| Auth | Clerk |
| Tenancy | Internal Workspace-based |
| Message Bus | **MassTransit** (added) → Azure Service Bus (prod), RabbitMQ (local) |
| Fast Jobs | **Hangfire** (added) with PostgreSQL persistence |
| Real-Time | **SignalR** (changed from SSE) |
| Blob Storage | Azure Blob Storage / Azurite |
| Email | Postmark (prod), Mailpit (local) |
| PDF | Gotenberg |
| Observability | Application Insights, OpenTelemetry |
| Cloud | Azure (Container Apps, ACR, Key Vault) |
| CI/CD | GitHub Actions |
| Package Manager | pnpm |
| Code Quality | **Prettier + ESLint boundaries + Husky + lint-staged + manifest sync (5 checks)** (added) — pre-commit enforcement + `check:all` CI script |
| Agent System | **BOLD framework adaptation** (added) — manifest, chains, protected changes |
