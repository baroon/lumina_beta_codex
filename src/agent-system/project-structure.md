# Project Folder Structure

## Lumina AI Visibility Platform

**Status:** Decided
**Version:** 1.3.0
**Date:** 2026-05-19
**Owner:** Chief Technical Architect

> This document is the canonical folder structure reference.
> Agents must never create files outside these defined locations without
> first registering a new location in this document via a formal change.
> When in doubt about where a file goes — read this document, do not guess.

---

## Repository Root

```
/
├── apps/
│   ├── web/                    React + Vite frontend
│   └── api/                    ASP.NET Core backend
├── agent-system/               AI agent infrastructure
├── design-tokens/              Design token source files
├── docs/                       Architecture & UX documentation
└── [config files]              Root configs (pnpm-workspace, docker-compose, etc.)
```

**Purpose:** The monorepo root organizes the Lumina AI Visibility Platform into clearly separated frontend, backend, agent infrastructure, design system, and documentation layers.

**Ownership rules:**

- Root-level config files (pnpm-workspace.yaml, docker-compose.yml, .editorconfig, etc.) are shared infrastructure and must not contain application logic.
- Each top-level directory has its own ownership rules defined below.

**File naming conventions:**

- Config files use kebab-case (e.g., `docker-compose.yml`, `pnpm-workspace.yaml`).
- No application source code lives at the root level.

**Agent instructions:**

- Always determine which top-level directory your change belongs in before creating files.
- If a file does not clearly fit into one of these directories, stop and consult this document.

---

## Frontend: `apps/web/`

This is the React + Vite single-page application. It provides the user interface for brand management, tracker configuration, discovery workflows, scan monitoring, finding review, content action planning, and reporting dashboards.

**Purpose:** All frontend application code, including routing, API communication, shared components, feature modules, and utilities.

**Ownership rules:**

- The frontend depends on `design-tokens/` for visual tokens but never imports from `apps/api/`.
- Communication with the backend is exclusively through HTTP calls defined in `src/api/` and SignalR connections defined in `src/hooks/`.

**File naming conventions:**

- React components: PascalCase (e.g., `TrackerNameEditor.tsx`)
- Hooks: camelCase prefixed with `use` (e.g., `useTrackers.ts`)
- API modules: camelCase suffixed with `Api` (e.g., `trackersApi.ts`)
- Type files: camelCase (e.g., `types.ts`)
- Utility files: camelCase (e.g., `formatters.ts`)

**Agent instructions:**

- Before creating a new component, check whether an existing component in `components/` or the relevant `features/` module already covers the need.
- Every new feature module must follow the `components/`, `hooks/`, `types.ts` structure.
- Never place domain-specific logic in `components/atoms/`, `components/molecules/`, or `components/organisms/`.

```
apps/web/
├── src/
│   ├── app/
│   │   ├── App.tsx                     Root component
│   │   ├── router.tsx                  TanStack Router configuration
│   │   ├── routeTree.gen.ts            Generated route tree (do not edit)
│   │   └── providers.tsx               Context providers wrapper
│   │
│   ├── api/
│   │   ├── apiClient.ts                Shared HTTP client (fetch wrapper)
│   │   ├── brandsApi.ts                Brand endpoints
│   │   ├── discoveryApi.ts             Discovery/crawl endpoints
│   │   ├── trackersApi.ts              Tracker CRUD endpoints
│   │   ├── scanRunsApi.ts              Scan run endpoints
│   │   ├── findingsApi.ts              Finding endpoints
│   │   ├── contentActionsApi.ts        Content action endpoints
│   │   └── reportsApi.ts              Report/analytics endpoints
│   │
│   ├── components/
│   │   ├── atoms/                      UI primitives (Button, Input, Card, Badge, etc.)
│   │   ├── molecules/                  Composed components (PageHeader, ErrorPage, LoadingPage)
│   │   ├── organisms/                  Complex sections (AppShell, Sidebar, ErrorBoundary)
│   │   ├── data-display/              DataTable, MetricCard, StatusBadge, etc.
│   │   └── charts/                     Nivo chart wrappers (BarChartWrapper, etc.)
│   │
│   ├── features/
│   │   ├── brands/
│   │   │   ├── components/             Brand-specific components
│   │   │   ├── hooks/                  Brand-specific hooks (useBrands, useBrand)
│   │   │   └── types.ts               Brand types
│   │   ├── discovery/
│   │   │   ├── components/             DiscoveryConfirmationScreen, SuggestionCard, etc.
│   │   │   │   └── wizard/            Wizard step components (BrandIdentity, Products, AudiencesMarkets, CompetitiveLandscape, Review)
│   │   │   ├── hooks/                  useDiscovery, useResuggestDiscovery, useCrawlProgress
│   │   │   ├── confidence.ts           Confidence thresholds, level helpers, preselection utilities
│   │   │   └── types.ts
│   │   ├── trackers/
│   │   │   ├── components/             TrackerNameEditor, PromptCard, PlatformSelector, etc.
│   │   │   ├── hooks/                  useTrackers, useTracker, useCreateTracker
│   │   │   └── types.ts
│   │   ├── prompts/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   ├── scan-progress/
│   │   │   ├── components/             ScanProgressScreen, PlatformStatusCard, etc.
│   │   │   ├── hooks/                  useScanProgress (SignalR)
│   │   │   └── types.ts
│   │   ├── scan-results/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   ├── findings/
│   │   │   ├── components/             FindingCard, FindingDetailDrawer, etc.
│   │   │   ├── hooks/                  useFindings, useFinding
│   │   │   └── types.ts
│   │   ├── content-actions/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   ├── topics/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   ├── competitors/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   ├── sources/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── types.ts
│   │   └── reports/
│   │       ├── components/             CoreMetricsRow, PromptEvidenceTable, TrackerDashboard, etc.
│   │       ├── hooks/                  useReport, useReportFilters
│   │       └── types.ts
│   │
│   ├── hooks/                          Shared hooks (useSignalR, useDebounce, etc.)
│   ├── lib/
│   │   ├── utils.ts                    cn() helper, general utilities
│   │   └── formatters.ts              Intl-based formatting (date, number, currency)
│   ├── types/                          Shared TypeScript types
│   └── content/                        Centralized copy/vocabulary constants
│
├── public/                             Static assets
├── index.html                          Vite entry point
├── vite.config.ts
├── tailwind.config.ts                  Extends design tokens via tailwind-tokens.js
├── tsconfig.json
└── .storybook/                         Storybook configuration
```

### Component Directory Ownership

Each component subdirectory under `src/components/` has strict ownership rules that agents must respect.

#### `components/atoms/`

**Purpose:** Low-level UI primitives sourced from shadcn/ui with CVA for variants. These are the smallest building blocks of the interface: Button, Input, Card, Badge, Tooltip, Label, etc.

**Ownership rules:**

- No domain knowledge. These components know nothing about brands, trackers, findings, or any Lumina concept.
- No API calls. No fetch, no SignalR, no side effects.
- No feature imports. Must never import from `features/`, `api/`, or `hooks/`.
- May import from `lib/` (e.g., `cn()` utility).

**Agent instructions:** When modifying an atom, preserve its generic interface. If you need domain-specific behavior, wrap it in a feature component instead. All atoms use CVA for variant management.

#### `components/molecules/`

**Purpose:** Composed components built from 2+ atoms. These handle small, reusable patterns: PageHeader, ErrorPage, LoadingPage, etc.

**Ownership rules:**

- No domain knowledge. No API calls. No feature imports.
- May import from `components/atoms/` and `lib/`.

**Agent instructions:** Molecules combine atoms into reusable patterns but remain generic. Feature-specific page content belongs in `features/{name}/components/`.

#### `components/organisms/`

**Purpose:** Complex, often stateful sections that compose atoms and molecules: AppShell, Sidebar, ErrorBoundary, etc.

**Ownership rules:**

- May compose `components/atoms/` and `components/molecules/`.
- May use shared hooks from `hooks/` for navigation or layout state.
- No feature imports. Must not import from `features/`.

**Agent instructions:** Organisms define application-level structure, not domain content. Feature-specific page content belongs in `features/{name}/components/`.

#### `components/data-display/`

**Purpose:** Reusable data presentation components: DataTable, MetricCard, StatusBadge, KPITile, etc.

**Ownership rules:**

- May reference `components/atoms/` for visual primitives.
- No feature imports. Must not import from `features/`.
- Receives all data as props. No direct API calls.

**Agent instructions:** These components should be generic enough to display data from any feature. Column definitions and data transformations happen in the feature layer, not here.

#### `components/charts/`

**Purpose:** Nivo chart wrappers that provide consistent styling and responsive behavior: BarChartWrapper, LineChartWrapper, PieChartWrapper, etc.

**Ownership rules:**

- Receive data as props. No API calls. No feature imports.
- May reference design tokens for consistent chart theming.

**Agent instructions:** Chart components accept pre-formatted data arrays and configuration props. Data fetching and transformation belong in the feature hooks, not in chart components.

### Feature Module Structure

Each directory under `src/features/` encapsulates a single domain concept.

**Purpose:** Feature modules contain all components, hooks, and types specific to one domain area of Lumina (brands, trackers, findings, reports, etc.).

**Ownership rules:**

- May import from `components/`, `hooks/`, `lib/`, `types/`, and `api/`.
- Must NOT import from other feature modules. Cross-feature communication goes through shared hooks, shared types, or URL parameters.
- Each feature module must contain `components/`, `hooks/`, and `types.ts`.

**File naming conventions:**

- Feature directories use kebab-case (e.g., `scan-progress/`, `content-actions/`).
- Components within features use PascalCase (e.g., `ScanProgressScreen.tsx`).

**Agent instructions:**

- When adding a new feature, create the full directory structure: `components/`, `hooks/`, `types.ts`.
- If you find yourself importing from another feature, refactor the shared logic into `hooks/`, `lib/`, or `types/` at the `src/` level instead.

### API Layer (`src/api/`)

**Purpose:** HTTP client and endpoint functions that communicate with the ASP.NET Core backend.

**Ownership rules:**

- API functions only. No React. No components. No hooks.
- Each file corresponds to a backend controller (e.g., `trackersApi.ts` maps to `TrackersController.cs`).
- All functions use the shared `apiClient.ts` for HTTP communication.

**Agent instructions:** API functions return typed promises. Error handling and loading states are managed by the hooks that call these functions, not by the API layer itself.

### Shared Hooks (`src/hooks/`)

**Purpose:** React hooks shared across multiple features.

**Ownership rules:**

- May import from `api/` and `lib/`.
- No component imports. Hooks return data and callbacks, not JSX.

**Agent instructions:** A hook belongs here (not in a feature) when two or more features need the same reactive behavior. The `useSignalR` hook is a key example, providing real-time connection management used by multiple features.

### Shared Utilities (`src/lib/`)

**Purpose:** Pure utility functions with no React or API dependencies.

**Ownership rules:**

- No React. No API. No component imports.
- Pure functions only. Must be testable without any React testing infrastructure.

**Agent instructions:** The `cn()` helper (clsx + tailwind-merge) and `formatters.ts` (Intl-based formatting) live here. If a utility is specific to one feature, it belongs in that feature's directory instead.

---

## Backend: `apps/api/`

The backend is an ASP.NET Core solution following Clean Architecture (Domain, Application, Infrastructure, API, Worker). It handles brand management, tracker configuration, AI platform scanning, finding analysis, content action tracking, and report generation.

**Purpose:** All server-side code including the REST API, domain logic, data access, external provider integrations (OpenAI, Anthropic, Google, Perplexity), background job processing, and tests.

**File naming conventions:**

- C# files: PascalCase matching the class name (e.g., `BrandsController.cs`, `Brand.cs`)
- Directories: PascalCase (e.g., `Controllers/`, `Commands/`, `Entities/`)
- Test files: PascalCase suffixed with `Tests` (e.g., `BrandServiceTests.cs`)

**Agent instructions:**

- Always determine which project layer a change belongs in before creating files.
- Follow the dependency rules strictly: Domain has no dependencies, Application depends on Domain, Infrastructure depends on Domain and Application, Api depends on Application, Worker depends on Application and Infrastructure.

```
apps/api/
├── AIVisibility.Api/
│   ├── Controllers/
│   │   ├── BrandsController.cs
│   │   ├── TrackersController.cs
│   │   ├── DiscoveryController.cs
│   │   ├── ScanRunsController.cs
│   │   ├── FindingsController.cs
│   │   ├── ContentActionsController.cs
│   │   └── ReportsController.cs
│   ├── Hubs/
│   │   └── ProgressHub.cs              SignalR hub for real-time updates
│   ├── DTOs/                           Request/response DTOs
│   ├── Filters/                        API filters (auth, validation, etc.)
│   └── Program.cs
│
├── AIVisibility.Application/
│   ├── Commands/                       Command + handler pairs
│   │   ├── Brands/
│   │   ├── Trackers/
│   │   ├── Discovery/
│   │   ├── ScanRuns/
│   │   └── ContentActions/
│   ├── Queries/                        Query + handler pairs
│   │   ├── Brands/
│   │   ├── Trackers/
│   │   ├── Findings/
│   │   └── Reports/
│   ├── Validators/                     FluentValidation validators
│   └── Interfaces/                     Application service interfaces
│
├── AIVisibility.Domain/
│   ├── Entities/
│   │   ├── Brand.cs
│   │   ├── Tracker.cs
│   │   ├── Prompt.cs
│   │   ├── ScanRun.cs
│   │   ├── Finding.cs
│   │   ├── ContentAction.cs
│   │   └── ...
│   ├── Enums/
│   ├── ValueObjects/
│   └── Rules/                          Domain rules/specifications
│
├── AIVisibility.Infrastructure/
│   ├── Data/
│   │   ├── AppDbContext.cs
│   │   ├── Configurations/             EF Core entity configurations
│   │   └── Migrations/
│   ├── Providers/
│   │   ├── OpenAI/                     ChatGPT adapter
│   │   ├── Anthropic/                  Claude adapter
│   │   ├── Google/                     Gemini adapter
│   │   └── Perplexity/                 Perplexity adapter
│   ├── Crawling/                       Website crawler implementation
│   ├── Storage/                        Azure Blob Storage adapter
│   ├── Email/                          Postmark adapter
│   └── Messaging/                      MassTransit configuration
│
├── AIVisibility.Worker/
│   ├── Consumers/                      MassTransit message consumers
│   │   ├── ScanExecutionConsumer.cs
│   │   ├── PromptRunConsumer.cs
│   │   ├── AnalysisConsumer.cs
│   │   └── ReportGenerationConsumer.cs
│   ├── Jobs/                           Hangfire jobs
│   │   ├── DiscoveryCrawlJob.cs
│   │   └── ScheduledScanJob.cs
│   └── Program.cs
│
└── AIVisibility.Tests/
    ├── Unit/
    ├── Integration/
    └── Api/                            WebApplicationFactory tests
```

### Backend Project Ownership

Each project in the solution has strict dependency rules that enforce Clean Architecture.

#### `AIVisibility.Domain`

**Purpose:** Core business entities, enums, value objects, and domain rules. This is the innermost layer that everything else depends on.

**Ownership rules:**

- No dependencies on other projects. Pure C# only.
- No NuGet packages that impose infrastructure concerns (no EF Core, no HTTP, no serialization attributes).
- Entities define behavior and invariants, not data shapes.

**Agent instructions:** Domain entities must encapsulate their own validation. If you need to add a new entity, it goes here with its enums and value objects. Never reference `Infrastructure`, `Application`, or `Api` from this project.

#### `AIVisibility.Application`

**Purpose:** Application logic layer containing CQRS commands/queries with their handlers, validators, and interface definitions.

**Ownership rules:**

- Depends on Domain only.
- Defines interfaces (e.g., `IScanService`, `IProviderFactory`) that Infrastructure implements.
- Contains no concrete implementations of external services.

**Agent instructions:** Each command or query lives in its own subdirectory under the relevant domain area (e.g., `Commands/Trackers/CreateTrackerCommand.cs` and `CreateTrackerCommandHandler.cs`). Validators use FluentValidation and live in `Validators/`.

#### `AIVisibility.Infrastructure`

**Purpose:** Concrete implementations of all external concerns: database access, AI provider adapters, crawling, storage, email, and messaging.

**Ownership rules:**

- Depends on Domain and Application.
- Implements interfaces defined in Application.
- Contains all EF Core configuration, migrations, and DbContext.

**Agent instructions:** When adding a new external integration, create a dedicated subdirectory (e.g., `Providers/Anthropic/`). Each provider adapter implements an interface from Application, ensuring the core logic never couples to specific external services.

#### `AIVisibility.Api`

**Purpose:** The ASP.NET Core web API project. Thin controllers that delegate to Application handlers via MediatR.

**Ownership rules:**

- Depends on Application only (Infrastructure is registered via DI in `Program.cs`).
- Controllers are thin. No business logic in controllers.
- DTOs in `DTOs/` define the HTTP contract. They are mapped to/from Application commands and queries.

**Agent instructions:** Each controller maps to a frontend API module (e.g., `TrackersController.cs` corresponds to `trackersApi.ts`). Keep controllers thin — validation belongs in Application validators, logic belongs in handlers.

#### `AIVisibility.Worker`

**Purpose:** Background processing host for long-running jobs and message consumers.

**Ownership rules:**

- Depends on Application and Infrastructure.
- MassTransit consumers in `Consumers/` handle async message processing for scans, analysis, and report generation.
- Hangfire jobs in `Jobs/` handle scheduled tasks like discovery crawls and recurring scans.

**Agent instructions:** Consumers and jobs should delegate to Application handlers. They are orchestration entry points, not business logic containers.

#### `AIVisibility.Tests`

**Purpose:** All automated tests for the backend solution.

**Ownership rules:**

- `Unit/` — Tests for Domain entities, Application handlers, and validators. No external dependencies.
- `Integration/` — Tests that verify Infrastructure implementations against real or containerized services.
- `Api/` — End-to-end API tests using `WebApplicationFactory` to spin up the full HTTP pipeline.

**Agent instructions:** Every new command handler, query handler, or domain entity should have corresponding unit tests. Integration tests are required for new provider adapters or data access code.

---

## Supporting Directories

### Agent System (`agent-system/`)

**Purpose:** AI agent infrastructure that governs how agents interact with the Lumina codebase. Contains decision trees, structural references, architectural decisions, and component registries.

**Ownership rules:**

- This directory is the single source of truth for agent behavior.
- Changes to files here affect how all agents operate across the entire codebase.

**File naming conventions:**

- Markdown files: UPPER-CASE or kebab-case (e.g., `CHAINS.md`, `tech-stack.decisions.md`)
- JSON files: kebab-case (e.g., `component-manifest.json`)

**Agent instructions:** Always consult this directory before making structural decisions. `CHAINS.md` defines the decision trees agents must follow. `tech-stack.decisions.md` contains immutable decisions that must not be overridden. `component-manifest.json` is the registry of all UI components.

```
agent-system/
├── CHAINS.md                           Decision tree & chain definitions
├── project-structure.md                This file
├── tech-stack.decisions.md             Immutable architecture decisions
└── component-manifest.json             UI component registry

scripts/
└── manifest-sync-lite.mjs             Manifest sync validation (pre-commit)
```

### Design Tokens (`design-tokens/`)

**Purpose:** The single source of truth for all visual design tokens consumed by the frontend via CSS custom properties and Tailwind configuration.

**Ownership rules:**

- `tokens.json` is the source of truth. All other files are generated from it.
- `tokens.css` and `tailwind-tokens.js` are generated outputs — do not edit them directly.
- Changes to tokens must start in `tokens.json` and be regenerated via `generate-css.js`.

**File naming conventions:**

- Token files: kebab-case (e.g., `tokens.json`, `tokens.css`)
- Scripts: kebab-case (e.g., `generate-css.js`)

**Agent instructions:** Never edit `tokens.css` or `tailwind-tokens.js` directly. Modify `tokens.json` and run the generation script. The frontend's `tailwind.config.ts` extends `tailwind-tokens.js` to make tokens available as Tailwind utilities.

```
design-tokens/
├── tokens.json                         Token source of truth
├── TOKENS.md                           Human-readable reference
├── generate-css.js                     CSS generation script
├── tokens.css                          Generated CSS (do not edit directly)
└── tailwind-tokens.js                  Generated Tailwind config (do not edit directly)
```

### Documentation (`docs/`)

**Purpose:** Architecture decision records, agent documentation, developer guides, and UX foundations.

**Ownership rules:**

- `architecture/` contains numbered architecture decision records (ARCH-001 through ARCH-010).
- `agents/` contains agent behavior documentation (AGENTS.md, PLANS.md).
- `addendum/` contains follow-up decisions that amend existing architecture records.
- `dev/` contains developer-facing guides for local development and common commands.
- `ux/` contains UX foundations and design principles.

**File naming conventions:**

- Architecture records: `ARCH-NNN-description.md`
- Agent docs: UPPER-CASE (e.g., `AGENTS.md`, `PLANS.md`)
- Dev guides: UPPER-CASE (e.g., `LOCAL-DEV.md`, `COMMANDS.md`)

**Agent instructions:** Architecture decision records are append-only. Do not modify existing records — create addendums instead. Developer guides should be updated when new tools, commands, or workflows are introduced.

```
docs/
├── architecture/                       ARCH-001 through ARCH-010
├── agents/                             AGENTS.md, PLANS.md
├── addendum/                           Architecture decision addendums
├── dev/                                Developer guides (LOCAL-DEV, COMMANDS)
└── ux/                                 UX-FOUNDATIONS.md
```

---

## Key Rules for Agents

### Layer Decision (ask this first)

Before creating any file, determine which layer it belongs in:

```
Is it a thin REST endpoint?                    → apps/api/AIVisibility.Api/Controllers/
Is it a command, query, or handler?            → apps/api/AIVisibility.Application/
Is it a domain entity, enum, or value object?  → apps/api/AIVisibility.Domain/
Is it a database, provider, or external adapter? → apps/api/AIVisibility.Infrastructure/
Is it a background job or message consumer?    → apps/api/AIVisibility.Worker/

Is it a generic UI primitive (Button, Input)?  → apps/web/src/components/atoms/
Does it compose 2+ atoms (PageHeader)?         → apps/web/src/components/molecules/
Is it a complex section (AppShell, Sidebar)?   → apps/web/src/components/organisms/
Is it a reusable data component (DataTable)?   → apps/web/src/components/data-display/
Is it a chart wrapper?                         → apps/web/src/components/charts/
Is it specific to one domain feature?          → apps/web/src/features/{feature}/components/
Is it an API call function?                    → apps/web/src/api/
Is it a shared React hook?                     → apps/web/src/hooks/
Is it a pure utility function?                 → apps/web/src/lib/
Is it a shared TypeScript type?                → apps/web/src/types/

Is it a design token?                          → design-tokens/tokens.json
Is it an architecture decision?                → docs/architecture/
Is it an agent behavior rule?                  → agent-system/
```

### Frontend Import Rules

```typescript
// Shared component importing from atoms — CORRECT
import { Button } from "@/components/atoms/button";
import { cn } from "@/lib/utils";

// Feature importing from shared components — CORRECT
import { DataTable } from "@/components/data-display/DataTable";
import { MetricCard } from "@/components/data-display/MetricCard";

// Feature importing from shared hooks — CORRECT
import { useSignalR } from "@/hooks/useSignalR";

// Feature importing from API layer — CORRECT
import { getTrackers } from "@/api/trackersApi";

// Feature importing from another feature — NEVER ALLOWED
import { useBrand } from "@/features/brands/hooks/useBrand"; // WRONG from trackers feature

// Atom/molecule/organism importing from features — NEVER ALLOWED
import { useFindings } from "@/features/findings/hooks/useFindings"; // WRONG in components/atoms/

// API layer importing React — NEVER ALLOWED
import { useState } from "react"; // WRONG in api/ files
```

### Backend Import Rules

```csharp
// Domain — no project dependencies
// CORRECT: pure C# only
public class Tracker { /* domain logic */ }

// Application — depends on Domain only
// CORRECT
using AIVisibility.Domain.Entities;
using AIVisibility.Domain.Enums;

// WRONG — Application must not reference Infrastructure
using AIVisibility.Infrastructure.Data; // NEVER in Application

// Infrastructure — depends on Domain and Application
// CORRECT
using AIVisibility.Domain.Entities;
using AIVisibility.Application.Interfaces;

// Api — depends on Application only
// CORRECT
using AIVisibility.Application.Commands.Trackers;

// WRONG — Api must not reference Infrastructure directly
using AIVisibility.Infrastructure.Providers.OpenAI; // NEVER in Api controllers
```

### File Creation Checklist

Before creating any new file, agents must confirm:

```
1. Which layer does it belong in? (frontend component, feature, API, backend project)
2. Which specific directory within that layer? (consult the Layer Decision tree above)
3. Is there an existing file or component it should extend instead of creating new?
4. For UI components: does a component-manifest.json entry exist for this component?
5. For backend: does the new file respect Clean Architecture dependency rules?
6. For features: will the feature module include components/, hooks/, and types.ts?
```

### Frontend Component Conventions

When creating any new component — shared (in `components/`) or feature (in `features/{name}/components/`) — follow these conventions:

```
ComponentName.tsx           ← Implementation
ComponentName.test.tsx      ← Unit tests (all variants covered)
ComponentName.stories.tsx   ← Storybook stories (one per variant)
index.ts                    ← Barrel export
```

Agents must never create a component (shared or feature) without the accompanying test and story files. The frontend maintains complete test coverage; no component layer is test-exempt, and hooks, the API layer, and `lib/` utilities are covered by tests as well.

> **Note:** Story and test files exist for all shared components; feature components, hooks, the API layer, and `lib/` utilities are being brought up to the same complete-coverage standard.

### Backend Handler Conventions

When creating a new command or query handler, follow these conventions:

```
Commands/
└── Trackers/
    ├── CreateTrackerCommand.cs         ← Command record (request shape)
    └── CreateTrackerCommandHandler.cs  ← Handler (business logic)

Queries/
└── Findings/
    ├── GetFindingsQuery.cs             ← Query record (filter parameters)
    └── GetFindingsQueryHandler.cs      ← Handler (read logic)
```

Each command and query is a separate class. Handlers implement `IRequestHandler<TRequest, TResponse>` from MediatR.

---

## Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "design-tokens"
```

```jsonc
// Root package.json (scripts only)
{
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:api": "dotnet watch --project apps/api/AIVisibility.Api",
    "build:web": "pnpm --filter web build",
    "build:api": "dotnet build apps/api/AIVisibility.Api",
    "test:web": "pnpm --filter web test",
    "test:api": "dotnet test apps/api/AIVisibility.Tests",
    "storybook": "pnpm --filter web storybook",
    "tokens:generate": "node design-tokens/generate-css.js",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint:web": "pnpm --filter web lint",
    "manifest:check": "node scripts/manifest-sync-lite.mjs",
    "check:all": "pnpm lint:web && pnpm --filter web typecheck && pnpm --filter web test && pnpm manifest:check",
    "prepare": "cd .. && husky src/.husky",
  },
}
```

```typescript
// apps/web/tailwind.config.ts — extends design tokens
import tokens from "../../design-tokens/tailwind-tokens.js";

export default {
  presets: [tokens],
  content: ["./src/**/*.{ts,tsx}"],
  // No new tokens here — all tokens live in design-tokens/
};
```

---

## Pre-Commit Enforcement System

Lumina uses a four-layer enforcement system to prevent structural drift. All checks run automatically on `git commit` via a Husky pre-commit hook.

### Layer 1: Prettier (formatting consistency)

**Config:** `src/.prettierrc.json` — semi, double quotes, 100 char width, LF line endings.
**Ignore:** `src/.prettierignore` — skips generated files (routeTree.gen.ts, tokens.css, tailwind-tokens.js).

```bash
pnpm format         # auto-fix all files
pnpm format:check   # check without modifying (CI-friendly)
```

### Layer 2: ESLint structural rules

The ESLint config (`apps/web/eslint.config.js`) enforces architectural boundaries using `no-restricted-imports`. No custom plugins required.

| Rule Group                | Scope                                                | What it prevents                                                                  |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| Deprecated path ban       | All files                                            | Imports from `@/components/ui/`, `@/components/layout/`, `@/components/feedback/` |
| Atom boundary             | `components/atoms/**`                                | Imports from molecules, organisms, data-display, charts, features, api, hooks     |
| Molecule boundary         | `components/molecules/**`                            | Imports from organisms, features, api                                             |
| Organism boundary         | `components/organisms/**`                            | Imports from features, api                                                        |
| Shared component boundary | `components/data-display/**`, `components/charts/**` | Imports from features, api                                                        |
| Cross-feature ban         | Each `features/{name}/**`                            | Imports from any other feature directory                                          |

```bash
pnpm lint:web       # run ESLint on the web app
```

**Important:** ESLint flat config replaces `no-restricted-imports` when multiple config objects match the same file. Each layer-specific rule group includes the deprecated path patterns alongside its boundary patterns.

### Layer 3: Manifest sync validation

**Script:** `src/scripts/manifest-sync-lite.mjs` — zero external dependencies (Node.js builtins only).

| Check                    | Severity | What                                                                                          |
| ------------------------ | -------- | --------------------------------------------------------------------------------------------- |
| `MISSING_MANIFEST_ENTRY` | ERROR    | `.tsx` file in atoms/molecules/organisms/data-display/charts exists but has no manifest entry |
| `ORPHAN_MANIFEST_ENTRY`  | ERROR    | Manifest entry with `status: "implemented"` points to non-existent file                       |
| `DEPRECATED_DIRECTORY`   | ERROR    | Any `.tsx` file exists in `components/ui/`, `components/layout/`, `components/feedback/`      |
| `MISSING_STORY_FILE`     | ERROR    | Shared component `.tsx` has no matching `.stories.tsx` in the same directory                   |
| `MISSING_TEST_FILE`      | WARN     | Component `.tsx` (shared or feature) has no matching `.test.tsx` in the same directory. Required for all components per convention; currently non-blocking, to become blocking once frontend coverage is complete. |

```bash
pnpm manifest:check          # validate all files (includes story/test existence checks)
node scripts/manifest-sync-lite.mjs --staged   # validate only staged files (used in pre-commit)
pnpm check:all               # full CI validation: ESLint → TypeScript → tests → manifest sync
```

### Layer 4: Husky + lint-staged (pre-commit gating)

**Hook:** `src/.husky/pre-commit` runs on every commit:

1. `lint-staged` — Prettier auto-fix + ESLint fix on staged files
2. `manifest-sync-lite.mjs --staged` — manifest validation on staged files

**lint-staged config** (`src/.lintstagedrc.json`):

- `apps/web/**/*.{ts,tsx}` → Prettier write + ESLint fix
- `apps/web/**/*.{css,json,md}` → Prettier write
- `agent-system/component-manifest.json` → Prettier write

**Agent instructions:**

- The pre-commit hook runs automatically. Agents do not need to run these checks manually before committing.
- If a commit fails due to ESLint errors, fix the violation — do not bypass the hook.
- When creating a new shared component, always add a manifest entry first or the `MISSING_MANIFEST_ENTRY` check will fail. You must also create a `.stories.tsx` file or the `MISSING_STORY_FILE` check will block the commit.
- Run `pnpm check:all` before marking work as complete. This chains ESLint, TypeScript type-check, tests, and manifest sync into a single command.

### What's deliberately excluded

| Not included                        | Reason                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------- |
| TypeScript type-check in pre-commit | `tsc --noEmit` is slow; use `pnpm --filter web typecheck` manually or in CI |
| AST-based validation                | Overkill for 18 components; `no-restricted-imports` covers critical cases   |
| Dependency graph builder            | Useful at 100+ components; ESLint covers import boundaries now              |
| Commit message linting              | Adds cognitive overhead; can add later                                      |

---

## Change Log

| Version | Date       | Change                                                                                              | Approved By |
| ------- | ---------- | --------------------------------------------------------------------------------------------------- | ----------- |
| 1.0.0   | 2026-05-18 | Initial structure defined                                                                           | CTA         |
| 1.1.0   | 2026-05-19 | Atomic design restructure (atoms/molecules/organisms), CVA standardization, Storybook configuration | CTA         |
| 1.2.0   | 2026-05-19 | Pre-commit enforcement system (Prettier, ESLint boundaries, manifest sync, Husky)                   | CTA         |
| 1.3.0   | 2026-05-19 | Story/test existence checks (MISSING_STORY_FILE, MISSING_TEST_FILE) and check:all CI script         | CTA         |
