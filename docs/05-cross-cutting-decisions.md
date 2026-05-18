# Cross-Cutting Decisions

## Event-based operational model

Use an event-based system for:

- Operational monitoring metrics
- Audit logs
- Scan execution lifecycle events
- Progress updates
- Error/failure tracking
- Future analytics and reprocessing

Event schema is deferred to a future ADR.

Initial lifecycle events should include:

- Tracker created
- Prompts generated
- Prompts confirmed
- Scan run queued
- Scan run started
- Prompt run started
- Prompt run completed
- Prompt run failed
- Scan run completed
- Scan run partially completed
- Analysis queued
- Analysis completed

## Storage model

- Store structured entities in relational DB.
- Store extracted page text and full raw provider responses in object storage.
- Store summary/normalized fields in DB.

## Confidence and confirmation

- User confirmation is source of truth for Discovery.
- High-confidence suggestions may be preselected.
- Confidence thresholds configurable by concept.

## Immutable run principle

Tracker settings may change over time, but each ScanRun stores a snapshot of what was used at execution time.

## Action-first reporting

Metrics support Findings. Findings support Content Actions.
