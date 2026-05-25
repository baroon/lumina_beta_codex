# ARCH-005: Data Storage

## Database

- PostgreSQL
- EF Core
- Npgsql
- EF Core migrations

## Data Modeling Rule

Use relational tables for core domain data.
Use JSON columns only for flexible metadata, snapshots, and provider-specific fields.

## Relational Data

Examples:

- Workspace
- User
- WorkspaceUser
- Brand
- BrandProfile
- Topic
- Competitor
- TrackerConfiguration
- Prompt
- ScanRun
- PromptRun
- AIAnswer clean text
- AnswerSignal
- Mention
- Source
- Citation
- Finding
- ContentAction
- ScanMetric
- AuditLog

## JSON / Flexible Data

Examples:

- TrackerSnapshotJson
- ResponseMetadataJson
- EvidenceJson
- Metric metadata
- Provider-specific metadata
- Application event attributes

## Blob Storage

Use Azure Blob Storage in cloud and Azurite locally for:

- Raw crawled page text
- Full crawl snapshots
- Raw AI provider responses
- Generated PDF reports
- Export files
- Future screenshots/artifacts

PostgreSQL stores references/blob keys and searchable metadata.

## Reference Data

Reference/taxonomy data lives in PostgreSQL and is seeded through idempotent seeders.

Seeded v1 data:

- Visibility Lenses
- TrustSignal types
- Source types
- Content Action types
- AI Platforms
- Prompt templates

Later seeders:

- Market reference data
- Industry taxonomy
- Category taxonomy
- Topic suggestion packs
- Known source/domain classification rules
- Competitor suggestion rules

Use stable `Code` fields as keys. Display names may change.
