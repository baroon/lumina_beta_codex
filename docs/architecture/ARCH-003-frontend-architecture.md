# ARCH-003: Frontend Architecture

## Foundation

- React + TypeScript + Vite
- pnpm
- TanStack Router (type-safe file-based routing)
- Tailwind CSS + shadcn/ui
- CVA (class-variance-authority) for variant-driven component styling
- TanStack Query for server state
- React state/context + URL search params for client state
- React Hook Form + Zod for forms
- TanStack Table for tabular data
- Nivo for charts
- MSW for mocks
- Storybook for reusable components and complex states

## Folder Structure

```text
/apps/web/src
  /app
    App.tsx
    router.tsx          (TanStack Router configuration)
    routeTree.gen.ts    (TanStack Router generated route tree)
    providers.tsx

  /api
    apiClient.ts
    brandsApi.ts
    discoveryApi.ts
    trackersApi.ts
    scanRunsApi.ts
    findingsApi.ts
    contentActionsApi.ts
    reportsApi.ts

  /components
    /atoms              UI primitives (Button, Input, Card, Badge, etc.)
    /molecules          Composed components (PageHeader, ErrorPage, LoadingPage)
    /organisms          Complex sections (AppShell, Sidebar, ErrorBoundary)
    /data-display       DataTable, MetricCard, StatusBadge, KPITile, etc.
    /charts             Nivo chart wrappers (BarChartWrapper, etc.)

  /features
    /brands
    /discovery
    /trackers
    /prompts
    /scan-progress
    /scan-results
    /findings
    /content-actions
    /topics
    /competitors
    /sources
    /reports

  /hooks
  /lib
  /types
  /content
```

> **Note:** The deprecated `/components/ui/`, `/components/layout/`, and `/components/feedback/` directories must not be used. ESLint blocks imports from these paths. All shared components use the atomic design structure above.

## Shared Component File Convention

Every shared component in `/components/` (atoms, molecules, organisms, data-display, charts) must include these files:

```text
ComponentName.tsx           ← Implementation (CVA variants, cn() merging, design tokens)
ComponentName.stories.tsx   ← Storybook stories (one per variant, required)
ComponentName.test.tsx      ← Unit tests (Vitest + React Testing Library, required)
index.ts                    ← Barrel export (named exports only)
```

The pre-commit hook enforces this:

- Missing `.stories.tsx` → `MISSING_STORY_FILE` ERROR (blocks commit)
- Missing `.test.tsx` → `MISSING_TEST_FILE` WARN (non-blocking during test backlog phase)
- Missing manifest entry → `MISSING_MANIFEST_ENTRY` ERROR (blocks commit)

Register every new shared component in `agent-system/component-manifest.json` before implementing.

## Code Quality Enforcement

A four-layer pre-commit system prevents architectural drift from day one:

1. **Prettier** — auto-formats staged files
2. **ESLint boundary rules** — enforces atomic design layer boundaries and cross-feature isolation
3. **Manifest sync** — validates component files, story/test existence, and manifest consistency
4. **Husky + lint-staged** — gates every commit through all three layers

Run `pnpm check:all` before marking work complete (chains ESLint → typecheck → tests → manifest sync).

See `src/agent-system/project-structure.md` § Pre-Commit Enforcement System for full details.

## Frontend Rules

- No direct `fetch` calls inside React components.
- API calls go through `/src/api` and TanStack Query hooks.
- Server data must not be stored in Context.
- Use URL search params for report filters where possible.
- Use shadcn/ui components first.
- Use CVA for all component variant styling. Never use string concatenation for conditional classes.
- Use Nivo through chart wrapper components.
- Charts receive prepared view models and must not calculate business metrics.
- Use centralized copy constants for product vocabulary.
- Use design tokens for all visual values. Never use raw hex, rgb, or arbitrary Tailwind values.

## Design Token System

Single source of truth: `design-tokens/tokens.json`

Flow: `tokens.json` → `generate-css.js` → CSS custom properties → Tailwind theme extension → component classes.

Rules:

- Never use raw color values (hex, rgb) in components.
- Always check `design-tokens/TOKENS.md` for existing tokens before creating new ones.
- Token changes propagate automatically through the build pipeline.
- All Tailwind theme values must reference CSS custom properties from tokens.

## Client State

Use:

- React local state
- React Context for small app-level UI state
- URL search params for filters

Do not use Zustand by default in v1.

## Regional Formatting

Support from day one:

- Workspace timezone
- Workspace locale
- Workspace currency
- Date/time formatting
- Number formatting
- Currency formatting

Use centralized `formatters.ts` with browser `Intl` APIs.

Language translation is deferred.
