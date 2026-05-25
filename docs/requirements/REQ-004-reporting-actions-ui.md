# REQ-004: Reporting & Actions UI Requirements

## Objective

Present scan results in a way that helps users understand AI visibility gaps, trust the evidence, and act on recommended content actions.

## In scope

- Scan Results page
- Core metrics row
- Breakdown charts
- Finding cards
- Content Action cards
- Prompt Evidence table and answer drawer
- Visibility Tracker dashboard
- Topic view
- Competitor view
- Source/Citation view
- Manual PDF/export report
- Scheduled email summary
- Status and empty states
- Reporting view models/API requirements

## Out of scope for v1

- Full content briefs
- Full content generation
- Workflow execution
- CMS/social publishing
- Approval workflows
- Complex visibility scoring
- Platform drift analysis
- Retrieval rate
- Advanced leaderboard experiences

## Functional requirements

### Scan Results page

The Scan Results page must be findings-first.

Section order:

1. Scan Summary
2. Top Findings
3. Recommended Content Actions
4. Core Metrics
5. Breakdown Charts
6. Prompt Evidence

### Scan Summary

Must show:

- Brand
- Visibility Tracker
- Scan date/time
- Scan status
- Platforms
- Prompt count
- Scan check count
- Market/language
- Partial/failure warning where applicable

### Core Metrics

Must show:

- Brand mention rate
- Recommendation rate
- Share of voice
- Average position
- Citation count
- Owned citation share
- Overall sentiment

### Breakdown Charts

Must show:

- Visibility by platform
- Visibility by topic
- Share of voice by brand/competitor
- Sentiment distribution
- Top cited sources

Visibility over time is shown on the Visibility Tracker dashboard, not the single Scan Results page.

### Finding Cards

Each Finding card must show:

- Title
- Finding type
- Severity
- Short summary
- Evidence summary
- Related topic
- Related visibility lens
- Related platform/competitor, if applicable
- Primary CTA: View evidence

Supported Finding statuses:

- New
- Reviewed
- Dismissed
- Archived

### Content Action Cards

Each Content Action card must show:

- Title
- Action type
- Priority
- Impact
- Effort
- Recommendation
- Related finding
- Related topic
- Primary CTA: View details

Supported Content Action statuses:

- New
- Accepted
- In Progress
- Completed
- Dismissed
- Archived

### Prompt Evidence View

Must include a table with:

- Prompt
- AI platform
- Topic
- Visibility Lens
- Brand mentioned
- Recommended
- Position
- Sentiment
- Citations
- Answer snippet
- Scan date

Filters:

- Platform
- Topic
- Visibility Lens
- Competitor
- Sentiment
- Mentioned / Not mentioned
- Recommended / Not recommended
- Citation type

Must include a full answer drawer with:

- Prompt
- Platform
- Run timestamp
- Full AI answer
- Detected mentions
- Detected citations/sources
- Mapped topic/check/competitor

Evidence is read-only in v1.

### Visibility Tracker Dashboard

Must show:

- Latest scan summary
- Trend over time
- Current open findings
- Current content actions
- Platform trend
- Topic trend
- Recent scan runs

Trend metrics:

- Brand mention rate
- Recommendation rate
- Share of voice
- Average position
- Owned citation share
- Overall sentiment
- Open findings count
- Open content actions count

Recent scan runs table columns:

- Scan date
- Status
- Platforms
- Prompts
- Scan checks
- Findings
- Content actions
- Completed at
- View results

### Topic View

Must include a Topic table with:

- Topic
- Brand mention rate
- Recommendation rate
- Share of voice
- Average position
- Sentiment
- Citation count
- Owned citation share
- Findings count
- Content actions count

Topic detail page/drawer must show:

- Topic summary
- Related findings
- Related content actions
- Prompt evidence
- Platform breakdown
- Competitor comparison for this topic
- Top cited sources for this topic

### Competitor View

If competitors exist, show table with:

- Competitor
- Mention rate
- Recommendation rate
- Share of voice
- Average position
- Sentiment
- Citation count
- Competitor source citations
- Related topics
- Related findings

If no competitors exist, show empty state and Add competitors CTA.

### Source / Citation View

Must show sources found where available.

Source table columns:

- Source
- Source type
- Domain / name
- Citation count
- Citation rate
- Owned / competitor / third-party
- Related topics
- Related platforms
- Related findings

If no sources are detected, explain that not all AI platforms provide citations.

### PDF / Export Report

PDF export is manual in v1.

Report structure mirrors the Scan Results page:

1. Report metadata
2. Executive summary
3. Top findings
4. Recommended content actions
5. Core metrics
6. Key charts
7. Topic performance
8. Competitor performance, if configured
9. Source/citation summary
10. Prompt evidence appendix

### Scheduled Email Summary

Scheduled scan emails must include:

- Tracker name + scan status
- Scan date/time
- Short summary
- Top 3 findings
- Top 3 content actions
- Warning if partial/failed
- CTA to view scan results

No automatic PDF attachment in v1.

## View models / API data contracts

### ScanResultsSummary

- ScanRunId
- TrackerName
- BrandName
- Status
- ScanDate
- Platforms
- PromptCount
- ScanCheckCount
- Market
- CoreMetrics
- TopFindings
- TopContentActions

### CoreMetrics

- BrandMentionRate
- RecommendationRate
- ShareOfVoice
- AveragePosition
- CitationCount
- OwnedCitationShare
- OverallSentiment

### FindingCard

- FindingId
- Type
- Title
- Severity
- Summary
- EvidenceSummary
- RelatedTopic
- RelatedVisibilityLens
- RelatedPlatform optional
- RelatedCompetitor optional
- Status

### ContentActionCard

- ContentActionId
- ActionType
- Title
- Priority
- Impact
- Effort
- Recommendation
- RelatedFinding
- RelatedTopic
- Status

### PromptEvidenceRow

- PromptId
- PromptText
- Platform
- Topic
- VisibilityLens
- BrandMentioned
- BrandRecommended
- Position
- Sentiment
- CitationsCount
- AnswerSnippet
- ScanDate

### SourceCitationRow

- SourceName
- Domain
- SourceType
- CitationCount
- CitationRate
- RelatedTopics
- RelatedPlatforms
- RelatedFindings

### TopicPerformanceRow

- Topic
- BrandMentionRate
- RecommendationRate
- ShareOfVoice
- AveragePosition
- Sentiment
- CitationCount
- OwnedCitationShare
- FindingsCount
- ContentActionsCount

### CompetitorPerformanceRow

- Competitor
- MentionRate
- RecommendationRate
- ShareOfVoice
- AveragePosition
- Sentiment
- CitationCount
- RelatedTopics
- RelatedFindings

## Non-functional requirements

- Reporting UI must not re-analyze raw AI answers.
- Raw AI answers are opened only in evidence/detail drawers.
- Partial scan results must be visibly marked.
- Empty states must include a next action.
- PDF generation must be asynchronous if it takes more than a short request window.
- Reporting views should support later trend/history expansion.
