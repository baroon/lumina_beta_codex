# REQ-003: Analysis & Findings Requirements

## Purpose

Phase 3 converts raw AI answers into structured signals, aggregate metrics, Findings, and Content Actions.

This phase is responsible for turning scan execution data into actionable user-facing outcomes.

## Scope

In scope:

- AnalysisJob lifecycle
- Signal extraction
- Mention extraction
- Citation/source extraction
- Source classification
- AnswerSignal storage
- ScanMetric aggregation
- Finding generation
- Content Action generation

Out of scope:

- Content Brief generation
- Full content generation
- Workflow execution
- CMS/social publishing
- Reporting dashboard design
- Pricing/plan logic

## Inputs

Phase 3 receives:

- ScanRun
- TrackerSnapshotJson
- PromptRuns
- AIAnswers
- Prompt mappings
- Platform metadata
- Execution status/errors/warnings

## Outputs

Phase 3 creates:

- AnalysisJob
- AnswerSignal
- Mentions
- Sources
- SourceUrls
- Citations
- BrandSourceClassifications
- ScanMetrics
- Findings
- ContentActions

## Functional Requirements

### FR-001 Analysis job creation

When a ScanRun reaches `Completed` or `PartiallyCompleted`, the system must automatically create/enqueue an AnalysisJob.

Analysis should not automatically start for `Failed` or `Cancelled` ScanRuns.

### FR-002 Staged pipeline

The pipeline must execute in stages:

```text
Extract Signals
Aggregate Metrics
Generate Findings
Generate Content Actions
```

Each stage should be retryable independently where practical.

### FR-003 Signal extraction

For each AIAnswer, the system must extract:

- Brand mention
- Competitor mentions
- Product mentions where relevant
- Meaningful Other entity mentions
- Mention position
- Recommendation status
- Recommendation strength
- Entity-level sentiment
- Citations/sources
- Brand-level answer signal

### FR-004 Other entity mentions

The system must store meaningful `Other` mentions when they are:

- Recommended alternatives
- Ranked/listed brands
- Repeatedly mentioned
- Clearly relevant to the prompt topic

The system should avoid generic/noisy entities.

### FR-005 Citation/source extraction

The system must store:

- Explicit citations with URLs
- Mentioned sources with domains
- Mentioned source names without URLs/domains

The system must support sources such as Reddit, Trustpilot, G2, and Wikipedia even when no URL is available.

### FR-006 Source classification

Sources must be classified using a controlled v1 taxonomy:

```text
Owned
Competitor
Corporate
UGC
Editorial
ReviewSite
Social
Institutional
Reference
Marketplace
Other
Unknown
```

Classification must be contextual to the Brand.

### FR-007 AnswerSignal storage

For every AIAnswer, store one AnswerSignal summary.

The AnswerSignal must capture:

- BrandMentioned
- BrandRecommended
- BrandMentionPosition
- BrandRank
- BrandSentiment
- BrandRecommendationStrength
- TopRecommendedEntity
- AnswerHasRanking
- AnswerHasComparison
- AnswerHasCitations
- OwnedSourceCited
- CompetitorSourceCited
- ThirdPartySourceCited
- ConfidenceScore

### FR-008 Sentiment extraction

Store sentiment at two levels:

- Mention.Sentiment for each entity
- AnswerSignal.BrandSentiment for the tracked brand

Allowed values:

```text
Positive
Neutral
Negative
Mixed
Unknown
```

If the tracked brand is not mentioned, `BrandSentiment = Unknown`.

### FR-009 Recommendation and position extraction

The system must store both:

- MentionPosition
- RecommendationStrength

RecommendationStrength values:

```text
Strong
Moderate
Weak
NotRecommended
Unknown
```

Use explicit ranking when present. Otherwise use first meaningful recommendation order.

### FR-010 Aggregate metrics

The system must store scan-level aggregate metrics.

Metrics must support these scopes:

```text
Overall
Platform
Topic
VisibilityLens
Competitor
SourceType
```

Initial metrics:

- BrandMentionRate
- CompetitorMentionRate
- ShareOfVoice
- AverageMentionPosition
- BrandRecommendationRate
- CompetitorRecommendationRate
- SentimentDistribution
- CitationCount
- OwnedCitationCount
- CompetitorCitationCount
- ThirdPartyCitationCount
- TopCitedSources

### FR-011 Finding generation

The system must generate Findings using a hybrid model:

- Rules detect patterns and evidence.
- LLM writes user-friendly title/summary/action framing.

V1 Finding types:

```text
LowVisibility
LowRecommendation
CompetitorDominance
NegativeSentiment
CitationGap
CompetitorCitationGap
ContentGap
StrongVisibility
EmergingCompetitor
```

### FR-012 Finding evidence

Every Finding must include:

- Title
- Summary
- Severity
- ConfidenceScore
- EvidenceSummary
- Related mappings where applicable

Mappings may include:

- Topic
- VisibilityLens
- Prompt
- Competitor
- Citation
- Source

### FR-013 Content Action generation

The system must generate Content Actions from Findings.

Content Actions must be normalized by ContentActionType.

The LLM may generate user-friendly title and recommendation text, but the action type must be structured.

V1 Content Action types:

```text
CreateNewPage
RefreshExistingPage
CreateFAQ
CreateComparisonPage
CreateTopicCluster
ImproveTrustMessaging
ImprovePricingClarity
BuildCitationTarget
CreateAlternativePage
AddSchemaMarkup
```

### FR-014 Content Briefs excluded

The system must not generate Content Briefs in v1.

Content Briefs, workflows, and publishing belong to a future AirOps-style phase.

## Non-Functional Requirements

### NFR-001 Traceability

All Findings and Content Actions must be traceable back to evidence:

- AIAnswer
- Prompt
- Topic
- VisibilityLens
- Mention
- Citation
- Source

### NFR-002 Reprocessability

Raw AIAnswer data and extracted signals must be retained so that analysis can be rerun later if formulas or logic change.

### NFR-003 Partial scans

Analysis must support PartiallyCompleted ScanRuns.

Findings from partial scans must clearly indicate that they are based on available answers only.

### NFR-004 User trust

The system must not infer negative sentiment from absence. If the brand is not mentioned, sentiment is Unknown.

### NFR-005 Controlled taxonomies

Source types, Finding types, and ContentAction types must be controlled reference data.

Topics remain more flexible/free-form from earlier phases.

## Open TODOs

- Define exact finding thresholds.
- Define severity formula.
- Define confidence formula.
- Define source normalization rules in detail.
- Define known-domain taxonomy/seeding strategy.
- Define event schema for analysis pipeline.
- Define reprocessing/versioning behavior.
- Define user feedback behavior for dismissed findings/actions.
