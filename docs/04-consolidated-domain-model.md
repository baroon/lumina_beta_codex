# Consolidated Domain Model

## Tenant and brand layer

```text
Workspace
→ Users
→ Brands
```

Brand owns:

```text
BrandProfile
WebsiteCrawlSnapshots
Products/Services
Audiences
Markets
Topics
Competitors
TrustSignals
Visibility Trackers
```

## Tracker layer

```text
Brand
→ TrackerConfiguration
  → backend coverage mappings
  → Prompts
  → ScanRuns
```

Backend coverage mappings include:

```text
TrackerTopic
TrackerVisibilityCheck
TrackerCompetitor
TrackerProduct
TrackerAudience
TrackerMarket
```

These are not user-facing steps.

## Execution layer

```text
ScanRun
→ PromptRuns
  → AIAnswers
```

A scan check is:

```text
1 Prompt × 1 AI Platform
```

## Analysis layer

```text
AIAnswer
→ AnswerSignal
→ Mentions
→ Citations
→ Sources
→ ScanMetrics
→ Findings
→ ContentActions
```

## Reporting layer

```text
ScanResults
TrackerDashboard
TopicView
CompetitorView
SourceView
PromptEvidenceView
Report
EmailSummary
```

## Future workflow layer

Later:

```text
FocusArea
→ Workflows
→ ContentBriefs
→ ContentAssets
→ Publishing/Approvals
```
