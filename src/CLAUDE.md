# Lumina Project Conventions

## Quick Reference

- **Frontend:** React + TypeScript + Vite + TailwindCSS + Storybook
- **Backend:** .NET 8 + MediatR (CQRS) + EF Core + PostgreSQL
- **Monorepo root:** `src/`
- **Path alias:** `@/` maps to `apps/web/src/`

---

## Component Architecture (Atomic Design)

Components live in `apps/web/src/components/` organized by layer:

| Layer | Path | Description | Stories | Tests |
|-------|------|-------------|---------|-------|
| **Atoms** | `components/atoms/` | Primitives (Button, Input, Badge, etc.) | Required | Required |
| **Molecules** | `components/molecules/` | Simple compositions (PageHeader, Stepper) | Required | Required |
| **Organisms** | `components/organisms/` | Complex layouts (AppShell, Sidebar) | Required | Required |
| **Feature components** | `features/{name}/components/` | Domain-specific UI | Required | Required |

### Rules

- **Every component `.tsx` file MUST have a co-located `.stories.tsx` file.**
- **Every component `.tsx` file MUST also have a co-located `.test.tsx` file** — shared and feature components alike. We maintain complete test coverage across the frontend; no component layer is test-exempt. This extends to hooks, the API layer, and `lib/` utilities, which must also be covered by tests.
- **Every new or modified component MUST be reflected in `agent-system/component-manifest.json`** (add entry, update dependencies, update notes). Update `agent-system/project-structure.md` if new directories are introduced.
- When modifying a component, always update its `.stories.tsx` and `.test.tsx` to reflect the changes.
- When creating a new component, create the story, test, and manifest entry at the same time as the component.

### File Naming

- Components: `PascalCase.tsx` (e.g., `PageHeader.tsx`)
- Stories: `PascalCase.stories.tsx` (e.g., `PageHeader.stories.tsx`)
- Tests: `PascalCase.test.tsx` (e.g., `PageHeader.test.tsx`)
- Utilities/hooks: `camelCase.ts` (e.g., `useDiscovery.ts`)

### No Barrel Exports for Shared Components

Atoms, molecules, and organisms do NOT use `index.ts` barrel files. Import directly:

```tsx
import { Button } from "@/components/atoms/button";
import { PageHeader } from "@/components/molecules/PageHeader";
```

Feature subdirectories MAY use barrel files when grouping related components (e.g., `wizard/index.ts`).

---

## Storybook Conventions

Story title follows the directory layer:

- Atoms: `"Atoms/ComponentName"`
- Molecules: `"Molecules/ComponentName"`
- Organisms: `"Organisms/ComponentName"`
- Features: `"Features/{FeatureName}/{ComponentName}"`

Standard story structure:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MyComponent } from "./MyComponent";

const meta: Meta<typeof MyComponent> = {
  title: "Layer/MyComponent",
  component: MyComponent,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
  args: { /* ... */ },
};
```

Global decorators (applied automatically): `withRouter` (TanStack Router), `withQueryClient` (React Query).

---

## Test Conventions

Tests use Vitest + Testing Library. Pattern:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("renders the title", () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByRole("heading", { name: "Hello" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

- Prefer `screen.getByRole()` for semantic queries.
- Use `vi.fn()` for mocks (Vitest globals are enabled).
- Config: `vitest.config.ts` with `jsdom` environment, `passWithNoTests: true`.

---

## ESLint Layer Boundaries

ESLint enforces strict import rules between layers:

- **Atoms** cannot import from molecules, organisms, features, or api.
- **Molecules** cannot import from organisms, features, or api.
- **Organisms** cannot import from features or api.
- **Features** cannot import from other features (no cross-feature imports).

---

## Styling

- **TailwindCSS** with design tokens generated from `src/design-tokens/tokens.json`.
- **Do not edit** `tailwind-tokens.js` directly; it's auto-generated.
- **CVA (Class Variance Authority)** for component variants.
- **`cn()` utility** from `@/lib/utils` merges classes via `clsx` + `tailwind-merge`.
- Color system: `primary-*`, `accent-*`, `neutral-*`, `semantic-{success,warning,error,info}-*`.

---

## Content / Copy

All user-facing strings are centralized in `apps/web/src/content/` as `as const` objects.

- `discovery.ts` → `DISCOVERY_COPY`
- `app.ts` → `APP_COPY`
- `brands.ts` → `BRANDS_COPY`

Placeholders use `{variableName}` syntax: `"Confirm Discovery: {brandName}"`.

Never hardcode UI text in components; add it to the appropriate content file.

---

## API Types

All API DTOs and type aliases live in `apps/web/src/types/api.ts`. When adding a new endpoint, add request/response types here.

API client methods live in `apps/web/src/api/` (e.g., `discoveryApi.ts`). React Query hooks live in the feature's `hooks/` directory.

---

## Backend Architecture (Clean Architecture + CQRS)

### Adding a New Endpoint

1. **DTO** — `AIVisibility.Api/DTOs/MyRequest.cs`
2. **Command/Query** — `AIVisibility.Application/Commands/MyCommand.cs` (record implementing `IRequest<T>`)
3. **Handler** — `AIVisibility.Application/Commands/MyCommandHandler.cs` (implements `IRequestHandler<TCommand, TResult>`)
4. **Service interface** (if needed) — `AIVisibility.Application/Interfaces/IMyService.cs`
5. **Implementation** (if needed) — `AIVisibility.Infrastructure/Providers/.../MyService.cs`
6. **DI registration** (if new service) — `AIVisibility.Infrastructure/DependencyInjection.cs`
7. **Controller action** — `AIVisibility.Api/Controllers/MyController.cs`

MediatR auto-discovers handlers via assembly scanning. New services need explicit registration in `DependencyInjection.cs`.

### Conventions

- Controllers only dispatch to MediatR; no business logic.
- `CancellationToken` on all async methods.
- `[ProducesResponseType]` attributes on all actions.
- Records for commands, queries, and DTOs.

---

## Git Commit Style

- Imperative mood, capitalized: `Add`, `Fix`, `Enhance`, `Refactor` (not past tense).
- Descriptive: explain what changed, not just "update files".
- Examples:
  - `Add discovery confirmation wizard with 5-step flow`
  - `Fix brand profile null handling in confirmation screen`
  - `Enhance competitor suggestions with geographic context`

---

## Component Manifest

The file `agent-system/component-manifest.json` is the canonical registry of all UI components. When creating or modifying shared components:

- **New shared component** (atoms, molecules, organisms, data-display, charts): Add an entry to the manifest with `status: "implemented"`.
- **New feature component**: Add an entry under the appropriate `Feature — *` category.
- **Updated dependencies**: If a component gains or loses dependencies, update the `dependencies` array in its manifest entry.
- **Pre-commit enforcement**: `scripts/manifest-sync-lite.mjs` validates that every `.tsx` in shared directories has a manifest entry, and every `"implemented"` manifest entry points to an existing file.

Also update `agent-system/project-structure.md` if the change introduces new directories.

---

## Scripts

```bash
# Frontend (from apps/web/)
pnpm dev          # Vite dev server
pnpm test         # Vitest run
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm storybook    # Storybook on port 6006

# Backend (from apps/api/)
dotnet build
dotnet run --project AIVisibility.Api
```
