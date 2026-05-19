# AGENTS.md

Instructions for AI coding agents working in this repository.

## Product Vocabulary

Use these terms:

- Brand
- Visibility Tracker
- Topic
- Visibility Check
- Prompt
- Scan Run
- Finding
- Content Action
- Source
- Citation

Avoid these user-facing terms unless specifically working on migration/import code:

- Project
- Query
- Opportunity
- Insight
- Focus Area
- Prompt Set

## Repository Structure

```text
/apps/web
/apps/api
/agent-system
/design-tokens
/docs
/tools
```

Backend projects:

```text
AIVisibility.Api
AIVisibility.Application
AIVisibility.Domain
AIVisibility.Infrastructure
AIVisibility.Worker
```

## Frontend Rules

- Use React + TypeScript + Vite.
- Use TanStack Router for type-safe routing.
- Use shadcn/ui + Tailwind for UI.
- Use CVA (class-variance-authority) for all component variant styling.
- Use design tokens for all visual values. Never use raw hex/rgb or arbitrary Tailwind values.
- Use TanStack Query for server state.
- Use TanStack Table for data tables.
- Use React Hook Form + Zod for forms.
- Use Nivo for charts.
- Use MSW for mocks.
- No direct fetch calls in components.
- Charts receive prepared view models.
- Do not calculate business metrics in chart components.
- Use centralized copy/product vocabulary constants.
- Respect atomic design layer boundaries (atoms → molecules → organisms). ESLint enforces these automatically.
- Never import from deprecated paths (`@/components/ui/`, `@/components/layout/`, `@/components/feedback/`). Use atoms/molecules/organisms.
- Never import across feature boundaries. Shared logic goes in `hooks/`, `lib/`, or `types/`.

## Backend Rules

- Use controller-based ASP.NET Core REST APIs.
- Controllers stay thin.
- Use command/query handlers.
- Handlers use EF Core DbContext directly.
- Do not create generic repositories.
- Do not use AutoMapper in v1.
- Use explicit DTO mapping.
- Use FluentValidation.
- Use MassTransit for all queued/durable background jobs.
- Use Hangfire for fast fire-and-forget jobs (e.g., discovery crawl).
- Use SignalR for real-time progress to the frontend.
- Provider-specific logic belongs in Infrastructure.
- Workers execute background jobs.
- Long-running work must not run inside controllers.

## Agent System (BOLD Framework Adaptation)

This project uses an agent-first development methodology adapted from the BOLD framework.

Key artifacts:

- `agent-system/CHAINS.md` — decision tree for which chain to use.
- `agent-system/component-manifest.json` — source of truth for all UI components.
- `agent-system/project-structure.md` — canonical folder structure reference.
- `agent-system/tech-stack.decisions.md` — immutable architecture decisions.
- `design-tokens/tokens.json` — single source of truth for all design token values.

Rules:

- Read `agent-system/CHAINS.md` before starting any task.
- Pick the correct chain for the task type and follow it exactly.
- Every UI component must be registered in the component manifest before implementation.
- Protected changes (state schema, routing, component deletion) require human approval.
- Chain steps are ordered and non-skippable.

## Testing Rules

Frontend:

- Vitest + React Testing Library for unit/component tests.
- Playwright for critical flows.
- MSW for deterministic API mocks.

Backend:

- xUnit + FluentAssertions + NSubstitute.
- Testcontainers PostgreSQL for integration tests.
- WebApplicationFactory for API tests.

## Architecture Boundaries

- Application code depends on interfaces for external systems.
- Infrastructure implements adapters.
- Same business workflows run locally and in Azure.
- Only adapters/configuration differ.

## Commit Enforcement

The following checks run automatically on every `git commit` via Husky pre-commit hooks:

- **Prettier** — Auto-fixes formatting (semi, double quotes, 100 char width, LF line endings)
- **ESLint** — Enforces architectural boundaries:
  - No imports from deprecated paths (`@/components/ui/`, `@/components/layout/`, `@/components/feedback/`)
  - Atoms cannot import from molecules, organisms, features, api, or hooks
  - Molecules cannot import from organisms, features, or api
  - Organisms cannot import from features or api
  - Shared components (data-display, charts) cannot import from features or api
  - No cross-feature imports (each feature is isolated)
- **Manifest sync** — Validates component registry consistency:
  - Every `.tsx` file in shared component dirs must have a manifest entry
  - Every `implemented` manifest entry must point to an existing file
  - No `.tsx` files in deprecated directories

If a commit fails:

1. Read the error message to understand which rule was violated
2. Prettier issues are auto-fixed — just re-stage the files
3. ESLint boundary violations require manual fixes — move the import or restructure
4. Manifest issues require adding/updating entries in `component-manifest.json`
5. Stage the corrected files and commit again

Agents cannot bypass these gates. They exist to prevent architectural drift.

## Before Completing Work

Run relevant checks:

- frontend typecheck/lint/test/build for frontend changes
- backend build/test for backend changes
- migrations validation for schema changes
- Storybook build for reusable UI changes where practical
