# ARCH-004: Backend Architecture

## Foundation

- C# / ASP.NET Core
- Controller-based REST APIs
- Modular monolith
- Command/query handlers
- EF Core DbContext used directly in handlers
- Explicit DTO mapping
- FluentValidation
- ProblemDetails for errors

## Backend Projects

```text
AIVisibility.Api
AIVisibility.Application
AIVisibility.Domain
AIVisibility.Infrastructure
AIVisibility.Worker
```

## Project Responsibilities

### AIVisibility.Api

- Controllers
- Request/response DTOs
- OpenAPI/Swagger
- Auth middleware
- API filters
- ProblemDetails configuration

### AIVisibility.Application

- Commands
- Queries
- Handlers
- Validators
- Application services/interfaces
- Use-case orchestration

### AIVisibility.Domain

- Entities
- Enums
- Value objects
- Domain rules

### AIVisibility.Infrastructure

- EF Core DbContext
- External providers/adapters
- Blob storage
- Queue implementations
- Email sender
- AI provider clients
- Website crawler implementation

### AIVisibility.Worker

- Background job processing
- Scheduled scan worker
- Discovery enrichment jobs
- Prompt run jobs
- Analysis jobs
- Email jobs
- Report generation jobs

## Rules

- Controllers stay thin.
- Commands mutate state.
- Queries read state.
- Handlers orchestrate use cases.
- Handlers can use EF Core DbContext directly.
- Do not create generic repositories.
- Do not use AutoMapper in v1.
- Use explicit mapping methods/classes.
- Provider-specific logic belongs in Infrastructure.
- Workers execute background jobs; controllers do not run long-running work directly.
