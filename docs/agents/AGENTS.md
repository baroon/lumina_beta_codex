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

## Before Completing Work

Run relevant checks:

- frontend typecheck/lint/test/build for frontend changes
- backend build/test for backend changes
- migrations validation for schema changes
- Storybook build for reusable UI changes where practical
