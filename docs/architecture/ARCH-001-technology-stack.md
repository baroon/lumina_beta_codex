# ARCH-001: Technology Stack

## Frontend

- React
- TypeScript
- Vite
- pnpm
- TanStack Router (type-safe file-based routing)
- Tailwind CSS
- shadcn/ui
- CVA (class-variance-authority) for variant-driven component styling
- TanStack Query for server state
- TanStack Table for tabular data
- React Hook Form
- Zod
- Nivo for charts
- MSW for API mocks
- Storybook for reusable components and complex UI states
- Vitest + React Testing Library
- Playwright for E2E/smoke flows

## Backend

- C# / ASP.NET Core
- Controller-based REST APIs
- OpenAPI / Swagger
- FluentValidation
- ProblemDetails for standardized error responses
- PostgreSQL
- Entity Framework Core
- Npgsql provider
- EF Core migrations
- MassTransit for message bus abstraction
- Hangfire for fast fire-and-forget background jobs
- SignalR for real-time client communication
- xUnit + FluentAssertions + NSubstitute
- Testcontainers PostgreSQL
- WebApplicationFactory for API tests

## Cloud / Infrastructure

- Azure Container Apps
- Azure Container Registry
- Azure Database for PostgreSQL
- Azure Blob Storage
- Azure Service Bus
- Azure Key Vault
- Application Insights
- OpenTelemetry
- Postmark for production email
- Gotenberg for PDF generation

## Local Development

- Docker Compose for local infrastructure
- PostgreSQL container
- RabbitMQ container (local transport for MassTransit, replacing Azure Service Bus)
- Azurite for Blob Storage emulation
- Mailpit for local email
- Gotenberg container for local PDF generation
