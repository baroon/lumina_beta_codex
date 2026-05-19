# Commands

## Frontend

```bash
pnpm --dir apps/web install
pnpm --dir apps/web dev
pnpm --dir apps/web typecheck
pnpm --dir apps/web lint
pnpm --dir apps/web test
pnpm --dir apps/web build
pnpm --dir apps/web storybook
pnpm --dir apps/web storybook:build
pnpm --dir apps/web e2e
```

## Backend

```bash
dotnet restore apps/api/AIVisibility.sln
dotnet build apps/api/AIVisibility.sln
dotnet test apps/api/AIVisibility.sln
dotnet format apps/api/AIVisibility.sln --verify-no-changes
```

## Database

```bash
dotnet ef database update \
  --project apps/api/src/AIVisibility.Infrastructure \
  --startup-project apps/api/src/AIVisibility.Api
```

## Code Quality & Formatting

```bash
pnpm format              # Auto-fix formatting with Prettier
pnpm format:check        # Check formatting without modifying (CI-friendly)
pnpm lint:web            # Run ESLint on frontend (includes boundary rules)
pnpm manifest:check      # Validate component manifest sync (includes story/test checks)
pnpm --filter web typecheck  # Run TypeScript type-check (not in pre-commit)
pnpm check:all           # Full CI validation: ESLint → typecheck → tests → manifest sync
```

All formatting and lint checks run automatically on `git commit` via Husky pre-commit hooks. Run `pnpm check:all` before marking work as complete — it chains all validation into a single command.

## Local Infra

```bash
docker compose up -d
```
