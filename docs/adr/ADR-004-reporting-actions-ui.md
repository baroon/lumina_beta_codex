# ADR-004: Reporting & Actions UI

## Status

Accepted

## Context

The product is not intended to be only a metrics dashboard. Its differentiation is turning AI visibility analysis into actionable outcomes. Phase 3 produces structured signals, metrics, findings, and content actions. Phase 4 defines how those outputs are presented to users.

Users need to understand:

- what happened,
- why it matters,
- what evidence supports it,
- and what they should do next.

## Decision

Use a **findings-first reporting model**.

The primary Scan Results page will present:

1. Scan Summary
2. Top Findings
3. Recommended Content Actions
4. Core Metrics
5. Breakdown Charts
6. Prompt Evidence

Metrics support the findings; they should not dominate the first view.

## Core Scan Results metrics

The v1 Scan Results page will show these seven metrics:

1. Brand mention rate
2. Recommendation rate
3. Share of voice
4. Average position
5. Citation count
6. Owned citation share
7. Overall sentiment

Deferred from the main page:

- Visibility Score
- Blended Visibility
- Recommendation Quality
- Citation Quality
- Platform Drift
- Retrieval Rate
- Complex leaderboards

## Breakdown charts

The v1 Scan Results page will include:

1. Visibility by platform
2. Visibility by topic
3. Share of voice by brand/competitor
4. Sentiment distribution
5. Top cited sources

Visibility over time belongs on the Visibility Tracker dashboard, not on a single Scan Results page.

## Finding card design

Each Finding card must include:

- Title
- Finding type
- Severity
- Short summary
- Evidence summary
- Related topic
- Related visibility check
- Related platform/competitor, if applicable
- Primary CTA: View evidence

Finding statuses:

- New
- Reviewed
- Dismissed
- Archived

Sorting:

1. Severity descending
2. Confidence descending
3. Impact potential descending

## Content Action card design

Each Content Action card must include:

- Title
- Action type
- Priority
- Impact
- Effort
- Recommendation
- Related finding
- Related topic
- Primary CTA: View details

Content Action statuses:

- New
- Accepted
- In Progress
- Completed
- Dismissed
- Archived

Sorting:

1. Priority descending
2. Impact descending
3. Effort ascending

## Prompt Evidence view

When the user clicks View evidence from a Finding, show a Prompt Evidence view.

Required columns/fields:

- Prompt
- AI platform
- Topic
- Visibility Check
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
- Visibility Check
- Competitor
- Sentiment
- Mentioned / Not mentioned
- Recommended / Not recommended
- Citation type

Row actions:

- View full AI answer
- View citations
- Open related finding
- Open related content action

Full answer drawer:

- Prompt
- Platform
- Run timestamp
- Full AI answer
- Detected mentions
- Detected citations/sources
- Mapped topic/check/competitor

Evidence is read-only in v1.

## Visibility Tracker dashboard

The dashboard answers: how is this tracker performing over time?

Sections:

1. Latest scan summary
2. Trend over time
3. Current open findings
4. Current content actions
5. Platform trend
6. Topic trend
7. Recent scan runs

Trend metrics:

- Brand mention rate
- Recommendation rate
- Share of voice
- Average position
- Owned citation share
- Overall sentiment
- Open findings count
- Open content actions count

Recent scan runs table:

- Scan date
- Status
- Platforms
- Prompts
- Scan checks
- Findings
- Content actions
- Completed at
- View results

## Topic view

The Topic view answers: which subjects are strong or weak for my brand?

Topic table columns:

- Topic
- Brand mention rate
- Recommendation rate
- Share of voice
- Average position
- Sentiment
- Citation count
- Owned citation share
- Findings
- Content actions

Topic detail includes:

- Topic summary
- Related findings
- Related content actions
- Prompt evidence
- Platform breakdown
- Competitor comparison for this topic
- Top cited sources for this topic

## Competitor view

The Competitor view answers: which competitors are AI platforms mentioning or recommending instead of us?

Competitor table columns:

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

If no competitors are selected, show an empty state recommending that the user add competitors.

Empty state copy:

> No competitors are being tracked yet.
>
> Add competitors to see where AI platforms recommend other brands instead of yours, compare share of voice, and identify comparison-page opportunities.

Primary CTA: Add competitors

## Source / Citation view

The Source/Citation view answers: which sources are influencing AI answers about my brand, topics, and competitors?

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

Source types use the Phase 3 taxonomy:

- Owned
- Competitor
- Corporate
- UGC
- Editorial
- ReviewSite
- Social
- Institutional
- Reference
- Marketplace
- Other
- Unknown

Use language: “Sources found where available” because not all AI platforms expose citations consistently.

## PDF/export report

PDF reports are manual only in v1.

Use the same structure as Scan Results, compressed for sharing:

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

Report style:

- Action-first
- Findings before metrics
- Metrics as supporting evidence
- Prompt evidence in appendix

## Scheduled email summary

V1 email structure:

1. Tracker name + scan status
2. Scan date/time
3. Short summary
4. Top 3 findings
5. Top 3 content actions
6. Warning if partial/failed
7. CTA to view scan results

Principles:

- Short
- Action-first
- No full report in email
- Link back to scan results

Status-specific behavior:

- Completed: normal summary
- Partially Completed: summary with warning
- Failed: failure notification + retry/details link

## Status and empty states

V1 reporting statuses:

- Completed
- Partially Completed
- Analysis Running
- Failed
- Cancelled
- No Data Yet

Empty-state rule:

Every empty state must explain:

1. why it is empty,
2. what it means,
3. what the user can do next.

Key empty states:

- No competitors: Add competitors
- No sources/citations: explain citations may not be available from all platforms
- No topics: Add topics
- No findings: Run scan
- No content actions: Findings must be generated first
- No trends: Need at least two completed scans

## Consequences

### Positive

- Clear, action-first product experience
- Reporting surfaces align with product promise
- Users can trust findings through evidence views
- Metrics remain useful without overwhelming users
- PDF and email outputs are consistent with web UI

### Tradeoffs

- Requires Phase 3 data to be well-structured
- Requires evidence mappings from findings/actions back to prompts, answers, mentions, and citations
- More UI states need to be designed than a simple dashboard

## Implementation guidance

The reporting UI should read from structured Phase 3 data:

- ScanMetric
- Finding
- ContentAction
- Mention
- Citation
- AnswerSignal
- AIAnswer only in evidence/detail drawers

The reporting UI must not re-analyze raw AI answers.
