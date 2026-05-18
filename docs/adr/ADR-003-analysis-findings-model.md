# ADR-003: Analysis & Findings Model

## Status

Accepted.

## Context

Phase 2 produces raw AI answers from Visibility Tracker Scan Runs. Those answers are not directly useful to users unless converted into evidence, patterns, and actions.

The product must combine Peec-style tracking signals with our action-oriented layer.

Peec-like tracking signals include:

- Mentions
- Position/rank
- Sentiment
- Share of voice
- Citations
- Source/domain intelligence
- Platform breakdowns
- Topic breakdowns

Our differentiator is turning those signals into:

- Findings
- Content Actions

## Decision

Use a staged analysis pipeline.

```text
AnalysisJob
  → Extract Signals
  → Aggregate Metrics
  → Generate Findings
  → Generate Content Actions
```

Do not use one monolithic analysis call.

## Rationale

A staged pipeline provides:

- Traceability
- Easier retries
- Better debugging
- Lower risk than one giant LLM call
- Evidence-backed findings
- Reprocessing support later if logic changes

## Phase 3 Inputs

Phase 3 receives:

- ScanRun
- TrackerSnapshotJson
- PromptRuns
- AIAnswers
- Prompt mappings
- Execution warnings/errors
- Partial completion status where applicable

## Phase 3 Outputs

Phase 3 produces:

- AnalysisJob status
- AnswerSignal
- Mention
- Source
- SourceUrl
- Citation
- BrandSourceClassification
- ScanMetric
- Finding
- ContentAction

## Deferred Outputs

The following are deferred to a later AirOps-style phase:

- ContentBrief
- Full content generation
- Workflow execution
- CMS/social publishing
- Approval flows

## AnalysisJob

Represents one analysis pipeline execution for a ScanRun.

```text
AnalysisJob
- AnalysisJobId
- ScanRunId
- Status
- StartedAt
- CompletedAt
- ErrorMessage optional
- AnalysisVersion
- CreatedAt
```

Suggested statuses:

```text
Queued
ExtractingSignals
AggregatingMetrics
GeneratingFindings
GeneratingActions
Completed
PartiallyCompleted
Failed
Cancelled
```

## Extract Signals

Extract Signals converts each AIAnswer into structured evidence.

It creates:

- Mentions
- Citations / Sources
- AnswerSignal

It does not create Findings or Content Actions.

## AnswerSignal

`AnswerSignal` is a stored summary entity for each AIAnswer.

Purpose:

```text
AIAnswer = raw evidence
Mention = detailed entity mentions
Citation = detailed source references
AnswerSignal = structured summary of what this answer means
```

Schema:

```text
AnswerSignal
- AnswerSignalId
- AIAnswerId
- BrandMentioned
- BrandRecommended
- BrandMentionPosition nullable
- BrandRank nullable
- BrandSentiment
- BrandRecommendationStrength
- TopRecommendedEntity nullable
- AnswerHasRanking
- AnswerHasComparison
- AnswerHasCitations
- OwnedSourceCited
- CompetitorSourceCited
- ThirdPartySourceCited
- ConfidenceScore
- CreatedAt
```

Sentiment values:

```text
Positive
Neutral
Negative
Mixed
Unknown
```

RecommendationStrength values:

```text
Strong
Moderate
Weak
NotRecommended
Unknown
```

If the tracked brand is not mentioned:

```text
BrandMentioned = false
BrandSentiment = Unknown
```

Absence is not treated as negative sentiment.

## Mention

A Mention is every detected reference to the tracked brand, competitor, product, or meaningful other entity inside an AI answer.

Schema:

```text
Mention
- MentionId
- AIAnswerId
- EntityType
- EntityId nullable
- MentionText
- NormalizedName
- MentionPosition
- IsRecommended
- RecommendationStrength
- Sentiment
- ConfidenceScore
- EvidenceSnippet
- CreatedAt
```

EntityType values:

```text
Brand
Competitor
Product
Other
```

Sentiment values:

```text
Positive
Neutral
Negative
Mixed
Unknown
```

RecommendationStrength values:

```text
Strong
Moderate
Weak
NotRecommended
Unknown
```

### Other Mentions

Store meaningful `Other` mentions when they are:

- Recommended alternatives
- Ranked/listed brands
- Repeatedly mentioned
- Cited as sources/authorities
- Clearly relevant to the prompt topic

Avoid noisy generic entities such as:

- tool
- website
- pricing
- job seeker
- resume

Other mentions can later become suggested competitors/entities.

## Mention Position and Recommendation

Store both:

- MentionPosition
- RecommendationStrength

Rules:

- Explicit ranked list: use explicit rank.
- No explicit ranking: use first meaningful recommendation order.
- Negative/caveated mention: `IsRecommended = false`.

## Citation / Source Model

The system stores both explicit citations and mentioned sources.

A mentioned source should be stored even if no URL is available.

Examples:

- Reddit
- Trustpilot
- G2
- Wikipedia

### Source

```text
Source
- SourceId
- SourceName
- Domain nullable
- NormalizedDomain nullable
- CreatedAt
```

### SourceUrl

```text
SourceUrl
- SourceUrlId
- SourceId
- Url
- NormalizedUrl
- Title optional
- CreatedAt
```

### Citation

```text
Citation
- CitationId
- AIAnswerId
- SourceId
- SourceUrlId nullable
- CitationPosition
- CitationText optional
- CitationType
- ConfidenceScore
- CreatedAt
```

CitationType values:

```text
ExplicitUrl
MentionedSource
```

Avoid inferred sources in v1 unless confidence is very high. Explicit citations and mentioned sources are enough for v1.

## Source Type Taxonomy

Use a controlled taxonomy for source classification.

V1 source types:

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

Definitions:

- Owned: user’s own brand/domain
- Competitor: known competitor domain/source
- Corporate: another company/vendor site not tracked as competitor
- UGC: Reddit, Quora, forums, community discussions
- Editorial: media, blogs, publications, articles
- ReviewSite: Trustpilot, G2, Capterra, Yelp, etc.
- Social: LinkedIn, X, YouTube, Instagram, etc.
- Institutional: government, university, nonprofit, standards body
- Reference: Wikipedia, dictionaries, documentation/reference sites
- Marketplace: app stores, directories, marketplaces
- Other: known but uncategorized
- Unknown: could not classify

## BrandSourceClassification

Source classification is contextual to Brand.

Example:

```text
livecareer.com = Owned for LiveCareer
livecareer.com = Competitor for Zety
```

Schema:

```text
BrandSourceClassification
- BrandSourceClassificationId
- BrandId
- SourceId
- SourceUrlId nullable
- SourceType
- ConfidenceScore
- Source
- Status
- CreatedAt
- UpdatedAt
```

Source values:

```text
RuleBased
KnownDomainList
LLMClassified
UserConfirmed
UserCorrected
```

Status values:

```text
Suggested
Active
UserCorrected
Unknown
```

## Source Normalization TODO

Create source taxonomy and normalization rules.

Minimum rules:

- Canonicalize domain
- Remove protocol
- Normalize www/non-www
- Lowercase domain
- Strip tracking parameters from URLs
- Resolve redirects where possible
- Group subdomains where appropriate
- Detect brand-owned domains
- Detect competitor domains
- Map known domains to source types
- Allow brand-context classification
- Allow user correction

## Aggregation

Store scan-level aggregate metrics.

Schema:

```text
ScanMetric
- ScanMetricId
- ScanRunId
- MetricScope
- ScopeId nullable
- MetricName
- MetricValue
- MetadataJson
- CreatedAt
```

MetricScope values:

```text
Overall
Platform
Topic
VisibilityCheck
Competitor
SourceType
```

Initial metrics:

```text
BrandMentionRate
CompetitorMentionRate
ShareOfVoice
AverageMentionPosition
BrandRecommendationRate
CompetitorRecommendationRate
SentimentDistribution
CitationCount
OwnedCitationCount
CompetitorCitationCount
ThirdPartyCitationCount
TopCitedSources
```

Raw signals remain stored so metrics can be reprocessed later if formulas change.

## Finding Generation

Finding generation uses a hybrid model.

```text
Rules detect the finding.
LLM writes the user-friendly explanation.
```

Rules decide:

- Whether a Finding should be created
- FindingType
- Evidence and related dimensions
- Initial severity/confidence

LLM helps produce:

- User-friendly title
- Summary
- Severity rationale
- Evidence explanation
- Action framing

## V1 Finding Types

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

## Finding Schema

```text
Finding
- FindingId
- ScanRunId
- BrandId
- FindingType
- Title
- Summary
- Severity
- ConfidenceScore
- EvidenceSummary
- Status
- CreatedAt
```

Severity values:

```text
Low
Medium
High
Critical
```

Status values:

```text
New
Reviewed
Dismissed
Archived
```

Finding mapping tables:

```text
FindingTopic
- FindingId
- TopicId

FindingVisibilityCheck
- FindingId
- VisibilityCheckId

FindingPrompt
- FindingId
- PromptId

FindingCompetitor
- FindingId
- CompetitorId

FindingCitation
- FindingId
- CitationId

FindingSource
- FindingId
- SourceId
```

## Content Action Generation

Content Actions are first-class v1 outputs.

They are recommendations, not workflow execution artifacts.

Use normalized `ContentActionType` reference data. LLM writes user-friendly title/recommendation text.

### ContentActionType

```text
ContentActionType
- ContentActionTypeId
- Code
- Name
- Description
- Status
```

V1 action types:

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

### ContentAction

```text
ContentAction
- ContentActionId
- ScanRunId
- BrandId
- FindingId nullable
- ContentActionTypeId
- Title
- Recommendation
- Priority
- Impact
- Effort
- Status
- EvidenceSummary
- CreatedAt
- UpdatedAt
```

Priority / Impact / Effort values:

```text
Low
Medium
High
```

Status values:

```text
New
Accepted
InProgress
Completed
Dismissed
Archived
```

Content Action mapping tables:

```text
ContentActionTopic
- ContentActionId
- TopicId

ContentActionVisibilityCheck
- ContentActionId
- VisibilityCheckId

ContentActionCompetitor
- ContentActionId
- CompetitorId

ContentActionPrompt
- ContentActionId
- PromptId

ContentActionSource
- ContentActionId
- SourceId
```

## Mapping Finding Types to Content Actions

Suggested default mappings:

| Finding Type | Likely Content Actions |
|---|---|
| LowVisibility | CreateNewPage, CreateTopicCluster, RefreshExistingPage |
| LowRecommendation | ImproveTrustMessaging, RefreshExistingPage, CreateFAQ |
| CompetitorDominance | CreateComparisonPage, CreateAlternativePage, RefreshExistingPage |
| NegativeSentiment | ImproveTrustMessaging, ImprovePricingClarity, CreateFAQ |
| CitationGap | BuildCitationTarget, CreateNewPage, AddSchemaMarkup |
| CompetitorCitationGap | BuildCitationTarget, CreateComparisonPage, RefreshExistingPage |
| ContentGap | CreateNewPage, CreateFAQ, CreateTopicCluster |
| StrongVisibility | RefreshExistingPage, BuildCitationTarget |
| EmergingCompetitor | CreateComparisonPage, CreateAlternativePage |

## Decisions Deferred

The following are deferred:

- Exact finding trigger thresholds
- Severity formulas
- Confidence formulas
- Low sample size handling
- Full source taxonomy implementation details
- Event payload schemas
- Reprocessing/versioning behavior
- User feedback loop details
- Reporting dashboard UX
- Content Brief generation
- Workflow execution
