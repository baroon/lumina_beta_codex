# Consolidated Schema — V1

This is an orientation schema. Phase-specific docs remain the detailed implementation source.

## Workspace / User

```text
Workspace
- WorkspaceId
- Name
- Status
- CreatedAt
- UpdatedAt

User
- UserId
- WorkspaceId
- Name
- Email
- Role
- Status
```

## Brand / Discovery

```text
Brand
- BrandId
- WorkspaceId
- Name
- WebsiteUrl
- Status
- CreatedAt
- UpdatedAt

BrandProfile
- BrandProfileId
- BrandId
- BrandName
- WebsiteUrl
- ShortDescription
- IndustryId optional
- CategoryId optional
- Positioning optional
- Source
- ConfidenceScore
- Status
- IsActive

WebsiteCrawlSnapshot
- CrawlSnapshotId
- BrandId
- WebsiteUrl
- Status
- StartedAt
- CompletedAt
- PageCount
- Summary
- RawStorageUrl optional

CrawledPage
- CrawledPageId
- CrawlSnapshotId
- Url
- PageType
- Title
- MetaDescription
- H1
- ExtractedTextStorageUrl optional
- ExtractedSummary
```

```text
ProductService
- ProductServiceId
- BrandId
- Name
- Description optional
- ProductType
- Source
- ConfidenceScore
- Status

Audience
- AudienceId
- BrandId
- Name
- Description optional
- Source
- ConfidenceScore
- Status

Market
- MarketId
- BrandId
- Name
- MarketType
- CountryCode optional
- Region optional
- City optional
- LanguageCode
- CurrencyCode optional
- IsCustom
- Source
- ConfidenceScore
- Status

Topic
- TopicId
- BrandId
- Name
- Description optional
- TopicType optional
- Source
- ConfidenceScore
- Status

Competitor
- CompetitorId
- BrandId
- Name
- Domain optional
- Description optional
- Source
- ConfidenceScore
- Status

TrustSignal
- TrustSignalId
- BrandId
- SignalTypeId
- DetectionStatus
- Source
- ConfidenceScore
- EvidenceSnippet optional
- Status
```

## Reference data

```text
Industry
- IndustryId
- Name
- Status

Category
- CategoryId
- IndustryId
- Name
- Status

TrustSignalType
- TrustSignalTypeId
- Code
- Name
- Description
- Status

VisibilityLens
- VisibilityLensId
- Code
- Name
- Description
- DisplayOrder
- Status

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

PromptTemplate
- PromptTemplateId
- VisibilityLensId
- Name
- TemplateText
- RequiredInputs
- OptionalInputs
- Version
- Status
```

## Tracker / Prompt / Execution

```text
TrackerConfiguration
- TrackerConfigurationId
- BrandId
- Name
- IsNameUserEdited
- PromptAllocation
- SelectedPlatformsJson
- Cadence
- Status
- NextRunAt
- LastRunAt
- NotificationEnabled
- CreatedAt
- UpdatedAt
```

Backend coverage tables:

```text
TrackerTopic
TrackerVisibilityLens
TrackerCompetitor
TrackerProductService
TrackerAudience
TrackerMarket
```

Each includes:

```text
- TrackerConfigurationId
- RelatedEntityId
- SelectionSource
- IsActive
- CreatedAt
```

```text
Prompt
- PromptId
- TrackerConfigurationId
- PromptTemplateId optional
- VisibilityLensId optional
- PrimaryTopicId optional
- PromptText
- Source: Generated | UserAdded
- Status: Draft | Active | Paused | Archived
- ReplacesPromptId optional
- ArchivedAt optional
- CreatedAt
- UpdatedAt
```

Prompt mapping tables:

```text
PromptTopic
PromptCompetitor
PromptProductService
PromptAudience
PromptMarket
```

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
```

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

```text
AIAnswer
- AIAnswerId
- PromptRunId
- AnswerText
- RawResponseStorageUrl
- ResponseMetadataJson
- CreatedAt
```

## Analysis

```text
AnalysisJob
- AnalysisJobId
- ScanRunId
- Status
- StartedAt
- CompletedAt
- ErrorMessage optional
```

```text
AnswerSignal
- AnswerSignalId
- AIAnswerId
- BrandMentioned
- BrandRecommended
- BrandMentionPosition
- BrandSentiment
- TopRecommendedEntity
- BrandRecommendationStrength
- AnswerHasRanking
- BrandRank
- AnswerHasComparison
- AnswerHasCitations
- OwnedSourceCited
- CompetitorSourceCited
- ThirdPartySourceCited
- ConfidenceScore
- CreatedAt
```

```text
Mention
- MentionId
- AIAnswerId
- EntityType: Brand | Competitor | Product | Other
- EntityId optional
- MentionText
- NormalizedName
- MentionPosition
- IsRecommended
- RecommendationStrength
- Sentiment
- ConfidenceScore
- EvidenceSnippet
```

```text
Source
- SourceId
- SourceName
- Domain nullable
- NormalizedDomain nullable
- CreatedAt

SourceUrl
- SourceUrlId
- SourceId
- Url
- NormalizedUrl
- Title optional

Citation
- CitationId
- AIAnswerId
- SourceId
- SourceUrlId nullable
- CitationPosition
- CitationText optional
- CitationType: ExplicitUrl | MentionedSource
- ConfidenceScore
```

```text
BrandSourceClassification
- BrandSourceClassificationId
- BrandId
- SourceId
- SourceUrlId optional
- SourceTypeId
- ConfidenceScore
- Source
- Status
```

```text
SourceType
- SourceTypeId
- Code
- Name
- Description
```

V1 SourceType values:

```text
Owned, Competitor, Corporate, UGC, Editorial, ReviewSite, Social, Institutional, Reference, Marketplace, Other, Unknown
```

```text
ScanMetric
- ScanMetricId
- ScanRunId
- MetricScope
- ScopeId optional
- MetricName
- MetricValue
- MetadataJson
- CreatedAt
```

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

Finding mapping tables:

```text
FindingTopic
FindingVisibilityLens
FindingPrompt
FindingCompetitor
FindingCitation
FindingSource
```

```text
ContentActionType
- ContentActionTypeId
- Code
- Name
- Description
- Status

ContentAction
- ContentActionId
- ScanRunId
- BrandId
- FindingId optional
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

ContentAction mapping tables:

```text
ContentActionTopic
ContentActionVisibilityLens
ContentActionCompetitor
ContentActionPrompt
```

## Reporting

```text
Report
- ReportId
- ScanRunId
- BrandId
- Title
- Format
- Status
- StorageUrl
- GeneratedAt
```

Reporting should read structured data. It should not re-analyze AI answers.
