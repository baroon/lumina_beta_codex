# ARCH-006: Background Jobs, Events, Audit, Observability

## Jobs

Jobs make work happen. Two tiers handle different latency requirements.

### Tier 1: Fast Fire-and-Forget Jobs (Hangfire)

Used for low-latency, API-orchestrated work that must feel near-instant to the user.

- Hangfire with PostgreSQL persistence (no additional infrastructure)
- Jobs: DiscoveryCrawlJob, lightweight background enrichment triggers
- Progress pushed to frontend via SignalR
- Not routed through the message bus to avoid queue latency during onboarding

### Tier 2: Durable Queued Jobs (MassTransit)

Used for long-running, retryable, orchestrated work.

Bus abstraction: **MassTransit**

Cloud transport: Azure Service Bus queues

Local transport: RabbitMQ (Docker container, MassTransit swaps transport via configuration)

MassTransit provides: saga/state machine orchestration, retry policies, dead-letter handling, scheduled delivery, and transport abstraction.

Job types (Tier 2):

- BackgroundEnrichmentJob
- PromptRunJob
- AnalysisJob
- ScheduledScanJob
- EmailNotificationJob
- ReportGenerationJob

### Real-Time Progress

Use **SignalR** for server-to-client push.

- Discovery crawl progress (pages found, extraction status)
- Scan execution progress (prompts completed, platforms queried)
- Analysis pipeline progress

SignalR hubs scoped per user/workspace. TypeScript client on frontend.

## Eventing

Application events are async, best-effort, provider-agnostic, and not mission-critical.

They should not block business workflows.

Use:

```csharp
IApplicationEventPublisher
```

Events are implementation-agnostic and can later be sent to:

- PostgreSQL event table
- Application Insights
- Azure Event Hub
- Kafka
- Azure Service Bus Topic
- Console/local log

V1 uses a lightweight async event pipeline with Postgres/Application Insights/local logging as practical sinks.

## Event Schema Direction

Use semi-flexible event shape:

```text
ApplicationEvent
- EventId
- WorkspaceId
- EntityType
- EntityId
- EventType
- EventName
- Severity optional
- CorrelationId
- CausationId optional
- ActorUserId optional
- OccurredAtUtc
- PayloadJson
- AttributesJson
- Status
```

`AttributesJson` stores event-specific name/value pairs for dashboards and alerts.

## Audit Logs

Audit logs are separate from operational events.

Audit logs answer: who did what, when?

Audit logs are durable and DB-backed.

```text
AuditLog
- AuditLogId
- WorkspaceId
- UserId
- EntityType
- EntityId
- Action
- BeforeJson optional
- AfterJson optional
- CreatedAtUtc
```

Save audit logs synchronously with important user/business actions where practical.

## Observability

Use:

- Application Insights
- OpenTelemetry
- Structured logging
- Correlation IDs
- W3C trace context

Capture:

- API request duration/errors
- Job duration/errors
- Provider latency/failures
- Queue latency
- Scan/check durations
- Crawl failures
- Email/PDF failures
- Uncaught exceptions

## Trace Fields

Include where available:

- CorrelationId
- TraceId
- WorkspaceId
- UserId
- BrandId
- TrackerConfigurationId
- ScanRunId
- PromptRunId
- AIPlatformCode
- JobType
- Status
- DurationMs

## Service Bus Trace Propagation

Queue messages include:

- CorrelationId
- TraceParent
- TraceState
- WorkspaceId
- JobType
- EntityId
