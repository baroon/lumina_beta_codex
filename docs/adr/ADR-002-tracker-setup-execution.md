# ADR-002: Tracker Setup & Execution Model

## Status

Accepted / Locked for v1 planning.

## Context

After Phase 1 Discovery, the user has confirmed the brand understanding and the scan ingredients. Phase 2 must turn those confirmed inputs into a durable tracking setup and execute scan runs across selected AI platforms.

The object previously considered as a scan/project is now named **Visibility Tracker** for users and `TrackerConfiguration` internally.

The tracker is a durable setup. A scan run is one execution of that setup.

## Decision summary

We will use:

```text
User-facing: Visibility Tracker
Internal: TrackerConfiguration
Execution event: ScanRun
Unit of execution: Scan Check = Prompt × AI Platform
```

A Visibility Tracker is created after Discovery is confirmed. It has a suggested name, editable by the user. Platforms/models and prompt allocation are fixed after tracker creation. Cadence and prompt set can change later within the fixed allocation.

Scan execution runs asynchronously in background workers and emits live progress through SSE/WebSocket. Each scan run stores a snapshot of the tracker setup used for that run.

## 1. User-facing Phase 2 flow

```text
Discovery confirmed
→ Ready screen with suggested tracker name
→ Create Visibility Tracker
→ Generate draft prompts
→ Review / remove / add / regenerate prompts
→ Confirm prompts
→ Select platforms and cadence
→ Run first scan
→ Live progress screen
→ Scan complete / partial / failed / cancelled
→ Automatically trigger analysis job if complete or partial
```

## 2. Visibility Tracker naming

A tracker name should be system-generated but editable.

Recommended naming pattern:

```text
{Market} {Category/Product} Visibility Tracker
```

Examples:

```text
US Resume Builder Visibility Tracker
India Customer Support SaaS Visibility Tracker
Global AI Chatbot Visibility Tracker
Pricing & Competitor Visibility Tracker
```

Rules:

```text
System generates initial name.
User can edit it.
If user edits it, IsNameUserEdited = true.
Do not overwrite user-edited names automatically.
```

## 3. TrackerConfiguration

`TrackerConfiguration` is the internal durable setup for a user-facing Visibility Tracker.

Suggested fields:

```text
TrackerConfiguration
- TrackerConfigurationId
- BrandId
- Name
- IsNameUserEdited
- PromptAllocation
- SelectedPlatformsJson or normalized platform mapping
- Cadence
- Timezone
- Status
- NextRunAt
- LastRunAt
- CreatedAt
- UpdatedAt
```

Status values:

```text
Draft
Active
Paused
Archived
```

Cadence values:

```text
OnDemand
Daily
Weekly
Monthly
```

## 4. Tracker coverage

Coverage remains a **backend concept only**.

Coverage represents what the tracker is intended to monitor. It is created automatically from confirmed Discovery outputs and default Visibility Lenses.

Coverage is not a separate user-facing step.

Coverage may include:

```text
Topics
Visibility Lenses
Competitors
Products / Services
Audiences
Markets
```

Recommended backend mapping tables:

```text
TrackerTopic
TrackerLens
TrackerCompetitor
TrackerProduct
TrackerAudience
TrackerMarket
```

Why keep Coverage:

```text
Prompt generation
Prompt regeneration
Analytics by intended tracking scope
Detecting prompt coverage gaps
Report grouping
Future advanced tracker editing
```

Important UX rule:

```text
Do not show users a separate Coverage screen immediately after Discovery.
```

## 5. Prompt Library and Prompt Templates

The product requires a reusable Prompt Library.

Prompt templates are used for:

```text
Initial prompt suggestions during tracker setup
Future prompt expansion/regeneration
Prompt packs by visibility lens and later industry/category
```

A prompt library contains:

```text
Prompt templates
Prompt examples
Visibility-check-specific patterns
Industry/category-specific prompt packs, later
```

V1 can start with:

```text
Lens → PromptTemplates
```

Future extension:

```text
PromptLibrary
PromptPack
Industry/category-specific prompt packs
```

Suggested schema:

```text
PromptTemplate
- PromptTemplateId
- LensId
- Name
- TemplateText
- RequiredInputs
- OptionalInputs
- Status
- Version
```

## 6. Prompt generation

Prompts are generated from:

```text
BrandProfile
Category
Products / Services
Topics
Competitors
Market
Audience, optional
Visibility Lenses
PromptAllocation
Prompt Templates
```

Prompt generation should balance across:

```text
Visibility Lenses
Topics
Competitors, if selected
Products / Services, if available
```

Not every combination should produce a prompt. Prompt count must remain within `PromptAllocation`.

## 7. Prompt allocation

Prompt allocation is fixed per Visibility Tracker.

Locked rule:

```text
PromptAllocation = maximum number of Active prompts allowed for the tracker.
PromptAllocation is fixed after tracker creation.
```

User can:

```text
Add prompts within allocation
Remove/archive prompts
Regenerate prompts
Replace prompt set
Pause prompts
```

User cannot:

```text
Increase/decrease allocation on the same tracker in v1.
```

Platform selection does not dynamically change available prompt count.

Scan checks remain internal:

```text
Scan checks = Active prompts × selected platforms
```

Scan checks are used for progress, execution cost tracking, and operational metrics, not user-facing allocation logic.

## 8. Prompt review

Generated prompts start as `Draft`.

User must review and confirm prompts before first scan.

Allowed v1 prompt actions:

```text
Review prompts
Remove prompt
Add custom prompt
Regenerate all prompts
Regenerate by Topic
Regenerate by Visibility Lens
Regenerate by Topic + Visibility Lens
Confirm prompts
```

Not allowed in v1:

```text
Editing existing prompt text directly
```

If a user wants to change a prompt, they can remove it and add a custom prompt.

## 9. Prompt lifecycle

Prompt statuses:

```text
Draft
Active
Paused
Archived
```

Behavior:

```text
Generated → Draft
User confirms → Active
User removes → Archived
User adds custom → Draft → Active after confirmation
Regenerated prompts → Draft replacements
```

Suggested schema:

```text
Prompt
- PromptId
- TrackerConfigurationId
- PromptText
- LensId
- PrimaryTopicId optional
- PromptTemplateId optional
- Status
- Source: Generated | UserAdded
- ReplacesPromptId optional
- ArchivedAt optional
- CreatedAt
- UpdatedAt
```

## 10. Prompt-to-dimension mappings

Prompt mappings are hidden system metadata.

They should not create UX friction.

For generated prompts, the system knows the mappings automatically.

For custom prompts:

```text
User enters prompt text
System infers mappings
System suggests mapped values with confidence
High-confidence mappings are preselected
User can edit if required
User confirmation finalizes the custom prompt
```

Mappings to infer/store:

```text
Topic
Visibility Lens
Competitor, if present
Product / Service, if relevant
Audience, if relevant
Market, if relevant
PromptTemplate, if generated from one
```

Suggested mapping tables:

```text
PromptTopic
PromptCompetitor
PromptProduct
PromptAudience
PromptMarket
```

## 11. Platform selection

Initial v1 platforms:

```text
ChatGPT
ChatGPT Search
Gemini
Claude
```

Platform setup is static/reference-data driven in v1.

Suggested reference entity:

```text
AIPlatform
- AIPlatformId
- Code
- Name
- Provider
- SurfaceType
- SupportsCitations
- SupportsLocationContext
- SupportsWebSearch
- Status
- DisplayOrder
```

Implementation rule:

```text
AIPlatform = reference data
Provider execution logic = code adapters
Secrets/config = environment or secret manager
No per-workspace/brand platform configuration in v1
```

## 12. Platform/model immutability

Selected platforms/models are fixed after Visibility Tracker creation.

If user wants a different platform/model mix, they must create another Visibility Tracker.

User-facing copy:

```text
Platform selection is fixed for this Visibility Tracker. To track different AI platforms, create a new Visibility Tracker.
```

## 13. Editable vs fixed tracker settings

Editable after creation:

```text
Tracker name
Cadence
Topics
Competitors
Products/services
Audiences
Prompt list within allocation
Active / paused status
```

Fixed after creation:

```text
Selected platforms/models
Prompt allocation
```

All changes apply only to future scan runs.

Past scan runs remain immutable.

## 14. Platform/cadence selection timing

Platform and cadence selection happens after prompt review.

Flow:

```text
Create tracker
→ Review prompts
→ Select platforms/cadence
→ Run first scan
```

Default:

```text
Platforms: all selected
Cadence: Weekly
```

Available cadence:

```text
On demand
Daily
Weekly
Monthly
```

## 15. Scan Run execution model

When the user clicks “Run first scan”:

```text
1. Create ScanRun
2. Create PromptRuns for each Active Prompt × selected AIPlatform
3. Queue PromptRuns
4. Execute PromptRuns as background jobs
5. Store AIAnswer for each successful PromptRun
6. Retry failures according to policy
7. Mark ScanRun Completed / PartiallyCompleted / Failed / Cancelled
8. Automatically enqueue AnalysisJob if Completed or PartiallyCompleted
```

## 16. Scan Check

User-facing progress should use **scan checks**.

Definition:

```text
1 scan check = 1 prompt × 1 AI platform
```

Example:

```text
30 prompts × 4 platforms = 120 scan checks
```

Progress copy:

```text
Running your prompts across AI platforms...
36 / 120 scan checks complete
```

## 17. ScanRun

Suggested schema:

```text
ScanRun
- ScanRunId
- TrackerConfigurationId
- TriggerType: Manual | Scheduled | Retry
- Status
- TrackerSnapshotJson
- StartedAt
- CompletedAt
- PromptCount
- PlatformCount
- TotalPromptRuns
- CreatedAt
```

Status values:

```text
Queued
Running
Completed
PartiallyCompleted
Failed
Cancelled
AnalysisQueued
Analyzing
AnalysisCompleted
ResultsReady
```

## 18. Tracker snapshot per ScanRun

Every `ScanRun` stores a snapshot of the tracker setup at execution time.

`TrackerSnapshotJson` should include:

```text
Tracker name
Selected platforms/models
Prompt allocation
Active prompts used
Prompt text used
Prompt-to-dimension mappings
Topics used
Competitors used
Products/services used
Audiences used
Market/language
Cadence at run time
Trigger type
```

Purpose:

```text
Past reports remain explainable.
Old scan results do not change when the tracker is edited later.
Historical runs can be audited and reinterpreted if needed.
```

## 19. PromptRun

Suggested schema:

```text
PromptRun
- PromptRunId
- ScanRunId
- PromptId
- AIPlatformId
- Status
- StartedAt
- CompletedAt
- AttemptCount
- ErrorMessage optional
- WarningMessage optional
```

Status values:

```text
Queued
Running
Completed
CompletedWithWarning
Retrying
Failed
Cancelled
```

## 20. AIAnswer storage

For v1, store both:

```text
Clean answer text in DB
Full raw provider response in object storage
```

Suggested schema:

```text
AIAnswer
- AIAnswerId
- PromptRunId
- AnswerText
- RawResponseStorageUrl
- ResponseMetadataJson
- CreatedAt
```

Rules:

```text
If PromptRun succeeds → AIAnswer created.
If PromptRun fails → no AIAnswer; error stored on PromptRun.
If response is incomplete/empty but usable → PromptRun = CompletedWithWarning; AIAnswer stored.
```

Execution should capture answers only. Analysis happens in Phase 3.

## 21. Background job execution

All scan execution runs as background jobs.

API behavior:

```text
Create ScanRun
Create PromptRuns
Queue work
Return ScanRunId immediately
UI receives progress through SSE/WebSocket
```

Execution model:

```text
Independent parallel PromptRun jobs
Controlled by platform-specific concurrency limits
```

Required controls:

```text
Global concurrency limit
Platform-specific concurrency limit
Workspace/brand scan limit
Retry policy
Timeout policy
Cancellation support
```

## 22. Retry policy

Default v1 policy:

```text
Retry failed PromptRuns up to 2 times.
Use exponential backoff.
Retry provider timeouts/rate limits.
Do not retry validation/user errors.
```

## 23. Cancellation behavior

User should be able to cancel a running scan.

When cancelled:

```text
ScanRun = Cancelled
Queued PromptRuns = Cancelled
Running PromptRuns = allowed to finish or best-effort cancelled
Completed PromptRuns remain stored
No new PromptRuns start
Do not generate final findings by default
```

UI copy:

```text
Scan was cancelled. Completed scan checks were saved, but findings were not generated.
```

## 24. Partial completion behavior

Generate findings for `PartiallyCompleted` scans, but label results as partial.

Completion rules:

```text
Completed = all PromptRuns completed
PartiallyCompleted = at least one completed and at least one failed after retries
Failed = no PromptRuns completed
Cancelled = user/system cancelled before completion
```

UI copy:

```text
Scan completed with partial results. Some scan checks failed after retries. Findings are based on available answers only.
```

Visual treatment:

```text
Completed = success theme
Partially Completed = warning theme
Failed = error theme
Cancelled = neutral/disabled theme
```

## 25. Live scan progress

We will use SSE/WebSockets for live scan progress.

Preference:

```text
SSE first, WebSocket if broader real-time needs emerge
```

Fallback:

```text
Polling fallback for environments where SSE/WebSocket fails
```

Progress event example:

```json
{
  "scanRunId": "123",
  "status": "Running",
  "totalChecks": 120,
  "completedChecks": 36,
  "failedChecks": 2,
  "platformStatus": {
    "ChatGPT": "Running",
    "ChatGPTSearch": "Running",
    "Gemini": "Queued",
    "Claude": "Running"
  },
  "message": "Looking for competitor mentions and citations..."
}
```

## 26. Scan progress UI vocabulary

Use:

```text
Visibility Tracker
Scan
Scan Run
Prompt
AI platform
Finding
Content Action
Citation
Brand mention
Competitor mention
Sentiment
Times recommended
Scan check
```

Avoid:

```text
Project
Query
Opportunity
Insight
Prompt Set
Focus Area
Workflow
```

Progress copy:

```text
Running your prompts across AI platforms...
36 / 120 scan checks complete
LIVE SCAN SIGNALS
Brand mentions
Citations found
Times recommended
Sentiment
```

Rotating progress messages should be educational/product-led, not unsupported external stats.

Examples:

```text
We’re checking how AI platforms mention, compare, and cite your brand.
We’re analyzing your prompts across ChatGPT, ChatGPT Search, Gemini, and Claude.
We’re looking for visibility gaps, competitor mentions, citations, and sentiment signals.
We’re preparing findings and content actions from the scan results.
```

Completion copy:

```text
Your first scan is complete!
Your Visibility Tracker has completed its first scan across 30 prompts.
SCAN SUMMARY
Your results include findings, visibility gaps, and content actions to improve your AI visibility.
View scan results →
```

## 27. Scheduled scan behavior

Minimum scheduled cadence is daily.

No complex overlapping-scan logic in v1.

Rules:

```text
If Tracker is Active and Cadence is Daily/Weekly/Monthly and NextRunAt is due → create scheduled ScanRun.
If Tracker is Paused → do not run.
If no Active prompts → do not run; mark warning.
If platform configuration invalid → do not run; mark warning.
If a ScanRun is already Running for the same Tracker, skip and log.
```

## 28. Scheduled scan outputs

Scheduled scans automatically generate:

```text
Findings
Content Actions
Email summary
Link to scan results
```

Scheduled scans do **not** automatically generate PDF reports in v1.

PDF reports are manual/user-initiated.

## 29. Tracker notification settings

Tracker-level email notification settings are required.

Suggested schema:

```text
TrackerNotificationSetting
- TrackerNotificationSettingId
- TrackerConfigurationId
- IsEnabled
- NotifyOnScheduledRun
- NotifyOnManualRun
- EmailSubjectTemplate optional
```

```text
TrackerNotificationRecipient
- TrackerNotificationRecipientId
- TrackerNotificationSettingId
- Email
- Name optional
- Status: Active | Removed
```

Scheduled scan email includes:

```text
Tracker name
Scan date
Scan status
Top findings
Top content actions
Link to web results
Partial/failure warning if applicable
```

Email behavior:

```text
Completed → send normal summary
PartiallyCompleted → send warning summary
Failed → send failure notification
Cancelled → no scheduled email unless user-initiated later
```

## 30. Phase 2 → Phase 3 handoff

When a `ScanRun` reaches:

```text
Completed
PartiallyCompleted
```

the system automatically enqueues an `AnalysisJob`.

Do not auto-trigger analysis for:

```text
Failed
Cancelled
```

unless a future manual “Analyze partial results” action is added.

ScanRun status flow:

```text
Queued
→ Running
→ Completed / PartiallyCompleted
→ AnalysisQueued
→ Analyzing
→ AnalysisCompleted
→ ResultsReady
```

Phase 2 output to AnalysisJob:

```text
ScanRun
TrackerSnapshotJson
PromptRuns
AIAnswers
Prompt mappings
Execution error/warning summary
Partial-completion status, if any
```

## 31. Event-based operational model

The system should emit events for operational monitoring, audit logging, scan progress, and future analytics/reprocessing.

Event schema is deferred to a future ADR.

Phase 2 should emit lifecycle events such as:

```text
Tracker created
Prompts generated
Prompts confirmed
Scan run queued
Scan run started
Prompt run started
Prompt run completed
Prompt run failed
Scan run completed
Scan run partially completed
Analysis queued
Notification sent
```

Future ADR required:

```text
ADR-00X Eventing, Audit & Observability
```

## Consequences

### Positive

```text
Clear durable tracker model
Strong separation between setup and execution
Flexible backend coverage without UX friction
Prompt allocation and platform behavior remain simple
Historical runs remain explainable through snapshots
Live scan UX supports long-running jobs
Scheduled scans produce value automatically
Phase 3 receives clean execution outputs
```

### Tradeoffs

```text
TrackerCoverage adds backend complexity even though hidden from UI
SnapshotJson creates duplicate historical data
Platform/model changes require new tracker
Prompt allocation changes require new tracker
SSE/WebSocket introduces infrastructure complexity
Email notification settings add early product surface area
```

## Open questions / deferred

```text
Exact event schema
Exact provider adapter contracts
Exact concurrency limit values
Exact timeout values per platform
Exact email template copy/design
Exact prompt allocation defaults
Pricing/plan limits
Advanced prompt library management
```

