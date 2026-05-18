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

## Local Infra

```bash
docker compose up -d
```
