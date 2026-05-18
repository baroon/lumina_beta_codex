# Master Kanban Plan

## Epic 0 — Foundation

- Set up repo structure
- Configure environment/secrets
- Set up database migrations
- Seed reference data framework
- Establish object storage abstraction
- Establish event/audit abstraction placeholder
- Set up background worker framework
- Set up UI shell and design system

## Epic 1 — Discovery

- Brand create API/UI
- Website crawl service
- Crawl snapshot storage
- BrandProfile extraction
- Product/Service extraction
- Audience extraction
- Market selection/confirmation
- Topic extraction/confirmation
- Competitor discovery suggestions
- TrustSignal detection
- Combined Discovery confirmation screen
- Discovery completion rules

## Epic 2 — Visibility Tracker Setup

- TrackerConfiguration entity/API
- Suggested tracker name generation
- Ready-to-create tracker screen
- Backend coverage mappings
- Prompt Library / PromptTemplate seeding
- Prompt generation service
- Prompt review UI
- Custom prompt mapping suggestion
- Prompt regeneration by all/topic/check/topic+check
- Platform selection
- Cadence selection
- Notification recipient configuration

## Epic 3 — Scan Execution

- ScanRun entity/API
- PromptRun job creation
- Background job execution
- AIPlatform adapter interface
- Provider adapters for ChatGPT, ChatGPT Search, Gemini, Claude
- Raw provider response object storage
- AIAnswer storage
- Retry/failure/partial completion handling
- SSE/WebSocket live progress
- Scheduled scan runner
- Scheduled email summary trigger
- AnalysisJob enqueue on completion

## Epic 4 — Analysis & Findings

- AnalysisJob lifecycle
- Extract signals service
- Mention extraction
- Citation/source extraction
- Source classification
- AnswerSignal storage
- ScanMetric aggregation
- Finding rule engine
- LLM finding explanation generation
- ContentActionType reference data
- ContentAction generation
- Status/dismiss/archive support

## Epic 5 — Reporting & Actions UI

- Scan Results page
- Core metric cards
- Breakdown charts
- Finding cards
- Content Action cards
- Prompt evidence table
- Full answer drawer
- Tracker dashboard
- Topic view
- Competitor view
- Source/Citation view
- Manual PDF report generation
- Scheduled email summary layout
- Empty states and status styling

## Epic 6 — Cross-cutting TODOs

- Event schema ADR
- Source taxonomy/normalization rules
- Industry/category taxonomy
- Market reference data
- Authorization model
- Data retention/deletion policy
- Monitoring dashboards
