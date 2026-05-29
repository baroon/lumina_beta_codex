export interface CreateBrandRequest {
  name: string;
  websiteUrl: string;
}

export interface CreateBrandResponse {
  brandId: string;
  discoveryRunId: string;
}

export interface BrandDto {
  id: string;
  name: string;
  websiteUrl: string;
  createdAt: string;
  latestDiscovery: LatestDiscoveryDto | null;
}

export interface LatestDiscoveryDto {
  id: string;
  status: DiscoveryStatus;
  startedAt: string;
  completedAt: string | null;
  pagesCrawled: number;
}

export type DiscoveryStatus =
  | "Pending"
  | "Crawling"
  | "Extracting"
  | "AwaitingConfirmation"
  | "Completed"
  | "Failed";
export type CandidateSource = "WebsiteCrawl" | "LLMSuggested" | "UserAdded";

export interface DiscoveryResultsDto {
  brandId: string;
  brandName: string;
  status: DiscoveryStatus;
  brandProfile: BrandProfileDto | null;
  products: CandidateDto[];
  audiences: CandidateDto[];
  markets: CandidateDto[];
  topics: CandidateDto[];
  competitors: CandidateDto[];
  trustSignals: CandidateDto[];
  aliases: string[];
}

export interface BrandProfileDto {
  id: string;
  shortDescription: string | null;
  industry: string | null;
  category: string | null;
  positioning: string | null;
  confidence: number;
  source: CandidateSource;
  shortDescriptionSource?: CandidateSource;
  industrySource?: CandidateSource;
  categorySource?: CandidateSource;
  positioningSource?: CandidateSource;
}

export interface CandidateDto {
  id: string;
  name: string;
  description: string | null;
  confidence: number;
  source: CandidateSource;
  metadata: Record<string, string>;
}

export interface ConfirmCandidateInput {
  name: string;
  description: string | null;
  confidence: number;
  source: CandidateSource;
  metadata?: Record<string, string> | null;
}

export interface ConfirmBrandProfileInput {
  shortDescription: string | null;
  industry: string | null;
  category: string | null;
  positioning: string | null;
  confidence: number;
  source: CandidateSource;
}

export interface ConfirmDiscoveryRequest {
  brandProfile: ConfirmBrandProfileInput | null;
  products: ConfirmCandidateInput[];
  audiences: ConfirmCandidateInput[];
  markets: ConfirmCandidateInput[];
  topics: ConfirmCandidateInput[];
  competitors: ConfirmCandidateInput[];
  trustSignals: ConfirmCandidateInput[];
  aliases?: string[];
}

export interface ResuggestRequest {
  industry: string | null;
  category: string | null;
  products: string[];
  audiences: string[];
  markets: string[];
}

export interface ResuggestCandidateDto {
  name: string;
  description: string | null;
  confidence: number;
  source: CandidateSource;
  metadata: Record<string, string>;
}

export interface ResuggestResponse {
  competitors: ResuggestCandidateDto[];
  topics: ResuggestCandidateDto[];
}

export type Lens = "products" | "audiences" | "markets" | "topics" | "competitors" | "trustSignals";

export interface RegenerateLensRequest {
  lens: Lens;
  industry: string | null;
  category: string | null;
  products: string[];
  audiences: string[];
  markets: string[];
  // Names already shown, removed, or user-added for this lens — so regeneration returns new items.
  exclude?: string[];
}

export interface RegenerateLensResponse {
  lens: string;
  candidates: ResuggestCandidateDto[];
}

export interface DiscoveryProgressMessage {
  brandId: string;
  status: DiscoveryStatus;
  message: string;
  pagesCrawled: number;
  step: number;
  totalSteps: number;
}

// ── Trackers (Phase 2) ──────────────────────────────────────────────

export interface TrackerSetupPreview {
  brandId: string;
  brandName: string;
  suggestedName: string;
  marketName: string | null;
  category: string | null;
  topicCount: number;
  competitorCount: number;
  productCount: number;
  audienceCount: number;
  marketCount: number;
  lensCount: number;
  promptAllocation: number;
}

export interface CreateTrackerRequest {
  name: string | null;
}

export interface CreateTrackerResponse {
  trackerId: string;
  name: string;
}

export interface PromptDto {
  id: string;
  text: string;
  status: string;
  source: string;
  lensId: string;
  lensName: string;
  topics: string[];
  reviewReason: string | null;
}

export interface PromptOption {
  id: string;
  name: string;
}

export interface PromptList {
  promptAllocation: number;
  count: number;
  prompts: PromptDto[];
  checks: PromptOption[];
  topics: PromptOption[];
}

export interface AddCustomPromptRequest {
  text: string;
  lensId: string;
  primaryTopicId?: string | null;
}

export interface GeneratePromptsResult {
  count: number;
}

export interface ConfirmPromptsResult {
  activatedCount: number;
}

export interface PlatformOption {
  id: string;
  code: string;
  name: string;
  configured: boolean;
}

export interface TrackerScheduleSetup {
  trackerId: string;
  trackerName: string;
  cadence: string;
  timezone: string;
  activePromptCount: number;
  platforms: PlatformOption[];
  selectedPlatformIds: string[];
}

export interface ConfigureTrackerScheduleRequest {
  platformIds: string[];
  cadence: string;
  timezone?: string | null;
}

export interface ConfigureTrackerScheduleResult {
  scanCheckCount: number;
  cadence: string;
}

export interface RunScanResult {
  scanRunId: string;
  scanCheckCount: number;
}

export interface ScanStatus {
  scanRunId: string;
  status: string;
  triggerType: string;
  scanCheckCount: number;
  completedCount: number;
  failedCount: number;
  startedAt: string;
  completedAt: string | null;
}

// --- Scan Results (Slice (d) reporting) ----------------------------------
//
// Mirrors AIVisibility.Application.Queries.Scans.ScanResultsDto. Returned by
// GET /api/scans/{scanRunId}/results. Nullable rate fields are null when the
// aggregator skipped emission (e.g. AverageBrandRank with no ranked signals,
// BrandShareOfVoice with denominator zero) — keep them nullable on the
// frontend so the UI can distinguish missing data from a real zero.

export interface ScanResultsDto {
  scanRunId: string;
  summary: ScanSummaryDto;
  coreMetrics: CoreMetricsDto;
  breakdowns: BreakdownsDto;
}

export interface ScanSummaryDto {
  trackerId: string;
  trackerName: string;
  brandId: string;
  brandName: string;
  startedAt: string;
  completedAt: string | null;
  scanStatus: string; // ScanRunStatus.ToString()
  analysisStatus: string; // AnalysisJobStatus.ToString()
  analysisError: string | null;
  scanCheckCount: number;
  completedCount: number;
  failedCount: number;
  platforms: ScanResultsPlatformDto[];
}

export interface ScanResultsPlatformDto {
  platformId: string;
  code: string;
  name: string;
}

export interface CoreMetricsDto {
  brandMentionRate: number | null;
  brandRecommendationRate: number | null;
  brandShareOfVoice: number | null;
  averageBrandRank: number | null;
  competitorMentionCount: number;
  productMentionCount: number;
  citationCount: number;
  ownedCitationCount: number;
  competitorCitationCount: number;
  thirdPartyCitationCount: number;
  unknownCitationCount: number;
  // Keyed by sentiment value ("Positive" | "Neutral" | "Negative" | "Mixed" | "Unknown").
  // Only observed values appear — absent keys mean zero signals at that value.
  brandSentimentDistribution: Record<string, number>;
  topCitedSources: TopCitedSourceDto[];
}

export interface TopCitedSourceDto {
  rank: number;
  sourceName: string;
  citationCount: number;
}

export interface BreakdownsDto {
  byPlatform: PlatformBreakdownDto[];
  byLens: LensBreakdownDto[];
  byTopic: TopicBreakdownDto[];
  byCompetitor: CompetitorBreakdownDto[];
}

export interface PlatformBreakdownDto {
  platformId: string;
  platformName: string;
  brandMentionRate: number | null;
  brandRecommendationRate: number | null;
  brandShareOfVoice: number | null;
  citationCount: number;
  brandSentimentDistribution: Record<string, number>;
}

export interface LensBreakdownDto {
  lensId: string;
  lensName: string;
  brandMentionRate: number | null;
  brandRecommendationRate: number | null;
  brandShareOfVoice: number | null;
  citationCount: number;
  brandSentimentDistribution: Record<string, number>;
}

export interface TopicBreakdownDto {
  topicId: string;
  topicName: string;
  brandMentionRate: number | null;
  brandRecommendationRate: number | null;
  brandShareOfVoice: number | null;
  citationCount: number;
}

export interface CompetitorBreakdownDto {
  competitorId: string;
  competitorName: string;
  mentionCount: number;
  recommendationCount: number;
}

// --- All Scans list (temporary navigation utility) -----------------------

export interface ScanListItemDto {
  scanRunId: string;
  trackerId: string;
  trackerName: string;
  brandId: string;
  brandName: string;
  startedAt: string;
  completedAt: string | null;
  scanStatus: string;
  analysisStatus: string | null; // null when the AnalysisJob row has not been created yet
  scanCheckCount: number;
  completedCount: number;
  failedCount: number;
}

// --- Source/Citation view (Phase 4 Slice 2) ------------------------------
//
// Mirrors AIVisibility.Application.Queries.Sources.ScanSourcesDto and the
// SourceTypes reference table. Codes (SourceType, Status, ProvenanceSource)
// are stringified backend enums — UI display names come from the source-types
// reference cache, not from the enum value itself.

export interface ScanSourcesDto {
  scanRunId: string;
  brandId: string;
  sources: SourceListItemDto[];
}

export interface SourceListItemDto {
  sourceId: string;
  sourceName: string;
  domain: string | null;
  normalizedDomain: string | null;
  /** SourceType enum code. Matches source_types.code. */
  sourceType: string;
  /** ClassificationStatus enum code (Suggested / Active / UserCorrected / Unknown). */
  status: string;
  /** ClassificationSource enum code — drives the provenance icon. */
  provenanceSource: string;
  confidenceScore: number;
  citationCount: number;
  platforms: SourcePlatformDto[];
}

export interface SourcePlatformDto {
  platformId: string;
  code: string;
  name: string;
}

export interface ScanSourceCitationsDto {
  scanRunId: string;
  sourceId: string;
  sourceName: string;
  domain: string | null;
  citations: SourceCitationDto[];
}

export interface SourceCitationDto {
  citationId: string;
  aiAnswerId: string;
  citationType: string;
  url: string | null;
  answerSnippet: string;
  promptText: string;
  platformCode: string;
  platformName: string;
  lensName: string | null;
  citedAt: string;
}

export interface SourceTypeReferenceDto {
  id: string;
  code: string;
  name: string;
  description: string;
  displayOrder: number;
}

export interface UpdateClassificationRequest {
  /** SourceType enum code (e.g. "Editorial"). */
  sourceType: string;
}

export interface UpdateSourceClassificationResult {
  classificationId: string;
  brandId: string;
  sourceId: string;
  sourceType: string;
  status: string;
  provenanceSource: string;
  confidenceScore: number;
  updatedAt: string;
}

// --- Topic view (Phase 4 Slice 3) ----------------------------------------
//
// Mirrors AIVisibility.Application.Queries.Topics.*. List endpoint pivots
// pre-computed Topic-scope ScanMetric rows; detail endpoint adds a runtime
// Topic×Platform sub-aggregation + top cited sources within the topic.

export interface ScanTopicsDto {
  scanRunId: string;
  topics: TopicListItemDto[];
}

export interface TopicListItemDto {
  topicId: string;
  topicName: string;
  brandMentionRate: number | null;
  brandRecommendationRate: number | null;
  brandShareOfVoice: number | null;
  averageBrandRank: number | null;
  citationCount: number;
  /** Owned citations / total citations within this topic, [0..1]. Null when CitationCount=0. */
  ownedCitationShare: number | null;
  /** Most-observed sentiment value (mode of BrandSentimentDistribution). Null when topic has no signals. */
  dominantSentiment: string | null;
}

export interface ScanTopicDetailDto {
  scanRunId: string;
  topicId: string;
  topicName: string;
  metrics: TopicMetricsDto;
  byPlatform: TopicPlatformBreakdownDto[];
  topCitedSources: TopicTopCitedSourceDto[];
}

export interface TopicMetricsDto {
  brandMentionRate: number | null;
  brandRecommendationRate: number | null;
  brandShareOfVoice: number | null;
  averageBrandRank: number | null;
  citationCount: number;
  ownedCitationCount: number;
  competitorCitationCount: number;
  thirdPartyCitationCount: number;
  unknownCitationCount: number;
  brandSentimentDistribution: Record<string, number>;
}

export interface TopicPlatformBreakdownDto {
  platformId: string;
  platformCode: string;
  platformName: string;
  answerCount: number;
  brandMentionRate: number | null;
  brandRecommendationRate: number | null;
  brandShareOfVoice: number | null;
  citationCount: number;
}

export interface TopicTopCitedSourceDto {
  sourceId: string;
  sourceName: string;
  citationCount: number;
}

// --- Competitor view (Phase 4 Slice 4) -----------------------------------
//
// Mirrors AIVisibility.Application.Queries.Competitors.*. List endpoint
// pivots pre-computed Competitor-scope ScanMetric rows; detail endpoint
// adds the set of sources cited on answers that mentioned the competitor.

export interface ScanCompetitorsDto {
  scanRunId: string;
  competitors: CompetitorListItemDto[];
}

export interface CompetitorListItemDto {
  competitorId: string;
  name: string;
  domain: string | null;
  mentionCount: number;
  recommendationCount: number;
  /** MentionCount / total scan answer count, [0..1]. Null when the scan has no successful answers. */
  mentionRate: number | null;
  /** RecommendationCount / MentionCount when MentionCount > 0; null otherwise. */
  recommendationRate: number | null;
}

export interface ScanCompetitorDetailDto {
  scanRunId: string;
  competitorId: string;
  name: string;
  domain: string | null;
  metrics: CompetitorMetricsDto;
  sourcesMentioningCompetitor: CompetitorMentionSourceDto[];
}

export interface CompetitorMetricsDto {
  mentionCount: number;
  recommendationCount: number;
  mentionRate: number | null;
  recommendationRate: number | null;
}

export interface CompetitorMentionSourceDto {
  sourceId: string;
  sourceName: string;
  normalizedDomain: string | null;
  citationCount: number;
}

// --- Tracker list --------------------------------------------------------

export interface TrackerListItemDto {
  trackerId: string;
  name: string;
  brandId: string;
  brandName: string;
  /** TrackerStatus enum code (Draft / Active / Paused / Archived). */
  status: string;
  createdAt: string;
  scanCount: number;
  /** CompletedAt of the most recent Completed scan; null when no scan has completed yet. */
  latestScanCompletedAt: string | null;
}

// --- Shared workspace overview row shapes --------------------------------
//
// These records are returned by the three /api/overview endpoints. The
// workspace-scoped DTOs (WorkspaceOverviewDto etc.) embed them.

export interface EntityTrendSeriesDto {
  /** "Brand" or "Competitor". */
  entityType: string;
  entityId: string;
  entityName: string;
  metricName: string;
  /** "Numeric" or "Categorical". */
  seriesKind: string;
  points: EntityTrendPointDto[];
}

export interface EntityTrendPointDto {
  scanRunId: string;
  capturedAt: string;
  /** Numeric metric value. Null for categorical and aggregator-skipped. */
  value: number | null;
  /** Categorical metric value (e.g. sentiment mode). Null for numeric. */
  category: string | null;
}

export interface DomainRowDto {
  sourceId: string;
  sourceName: string;
  normalizedDomain: string | null;
  /** 12-bucket SourceType enum code. */
  sourceType: string;
  citationCount: number;
  /** 0..1 share of total citations in window. */
  citationRate: number;
}

export interface DomainTypeShareDto {
  sourceType: string;
  citationCount: number;
  /** 0..1 share of total citations across visible types. */
  share: number;
}

export interface EntityMentionDto {
  /** "Brand" or "Competitor". */
  entityType: string;
  entityId: string;
  name: string;
  isTrackedBrand: boolean;
  mentionCount: number;
  /** 0..1 share of total brand+competitor mentions in window. */
  share: number;
}

export interface CompetitiveGapDto {
  competitorId: string;
  competitorName: string;
  brandMentions: number;
  competitorMentions: number;
  /** Positive means brand is ahead. */
  mentionsGap: number;
  brandRecommendations: number;
  competitorRecommendations: number;
  recommendationsGap: number;
}

export interface EntityRateDto {
  entityType: string;
  entityId: string;
  name: string;
  isTrackedBrand: boolean;
  mentionCount: number;
  /** Recommendation mentions / total mentions, [0..1]. Null when mentionCount=0. */
  recommendationRate: number | null;
}

export interface PlatformMentionDto {
  platformId: string;
  platformCode: string;
  platformName: string;
  answerCount: number;
  brandMentionCount: number;
  /** brandMentionCount / answerCount, [0..1]. Null when no answers. */
  brandMentionRate: number | null;
}

export interface SentimentSliceDto {
  /** "Positive" | "Neutral" | "Negative" | "Mixed" | "Unknown". */
  sentiment: string;
  count: number;
  /** 0..1 share of brand mentions in window. */
  share: number;
}

export interface HeatmapDto {
  rows: string[];
  columns: string[];
  cells: HeatmapCellDto[];
}

export interface HeatmapCellDto {
  row: string;
  column: string;
  value: number;
}

// -----------------------------------------------------------------
// Workspace Overview read model
// -----------------------------------------------------------------
// Cross-tracker, cross-brand rollup powering /overview. Hero counts +
// per-entity trend series + Top Entities table aggregated across every
// TrackerConfiguration in the workspace. The competitive + depth
// sibling endpoints layer in further sections.

/**
 * Per-lens mention count for the current workspace + date window.
 * Drives the count chip rendered next to each lens row in
 * {@link import("@/components/molecules/LensSelector").LensSelector}.
 */
export interface LensCountDto {
  lensCode: string;
  mentionCount: number;
}

/**
 * Per-topic mention count, deduped by topic name (case-insensitive)
 * since the same name can map to multiple Topic rows across brands /
 * discovery runs. Drives the count chip rendered next to each topic
 * row in `TopicSelector`.
 */
export interface TopicCountDto {
  topicName: string;
  mentionCount: number;
}

/**
 * Per-product mention count, deduped by product name (case-insensitive).
 * Same shape + semantics as {@link TopicCountDto}. Drives the count chip
 * rendered next to each product row in `ProductSelector`.
 */
export interface ProductCountDto {
  productName: string;
  mentionCount: number;
}

/**
 * Per-market mention count, deduped by market name (case-insensitive).
 * Drives the count chip in `MarketSelector`.
 */
export interface MarketCountDto {
  marketName: string;
  mentionCount: number;
}

/**
 * Workspace discovery summary — names + counts for every dimension the
 * user captured during the brand-discovery flow. Drives the inline
 * "Tracking 5 products · 2 markets · …" strip at the top of the
 * Workspace Overview. Purely informational; not a filter source.
 */
export interface DiscoverySummaryDto {
  products: DiscoveryDimensionDto[];
  markets: DiscoveryDimensionDto[];
  audiences: DiscoveryDimensionDto[];
  topics: DiscoveryDimensionDto[];
  trustSignals: DiscoveryDimensionDto[];
}

export interface DiscoveryDimensionDto {
  id: string;
  name: string;
}

export interface WorkspaceOverviewDto {
  workspaceId: string;
  /** Effective window lower bound (ISO). Null when caller asked for "All time". */
  from: string | null;
  /** Effective window upper bound (ISO). Resolves to UTC now when caller omitted. */
  to: string;
  trackedBrands: TrackedBrandDto[];
  competitors: WorkspaceCompetitorDto[];
  scanCount: number;
  hero: WorkspaceHeroDto;
  /**
   * Hero counts for the equivalent window immediately before {@link from}
   * (same length, shifted back). Null when "All time" was requested or
   * when no scans landed in that span. Used to render the up/down delta
   * chip on each hero tile.
   */
  previousHero: WorkspaceHeroDto | null;
  series: EntityTrendSeriesDto[];
  topEntities: WorkspaceTopEntityRowDto[];
}

export interface TrackedBrandDto {
  brandId: string;
  name: string;
}

export interface WorkspaceCompetitorDto {
  competitorId: string;
  name: string;
}

export interface WorkspaceHeroDto {
  queries: number;
  mentions: number;
  citations: number;
  /** [0..1]; null when no answers landed. */
  brandMentionRate: number | null;
}

export interface WorkspaceTopEntityRowDto {
  entityType: string;
  entityId: string;
  name: string;
  isTrackedBrand: boolean;
  visibility: number | null;
  visibilityDelta: number | null;
  shareOfVoice: number | null;
  shareOfVoiceDelta: number | null;
  sentiment: string | null;
  /**
   * Numeric Δ vs the previous scan, derived from the categorical
   * OverallSentiment mode (Positive=+1, Neutral=0, Mixed=0,
   * Negative=−1). Range [-2, +2]. Null when fewer than two scans
   * have sentiment data or either side is Unknown.
   */
  sentimentDelta: number | null;
}

// -----------------------------------------------------------------
// Phase 4 v3 Slice B — workspace competitive intelligence
// -----------------------------------------------------------------
// Top domains / domain types / mention distribution / per-tracked-brand
// competitive gap groups / recommendation rates. Reuses the v2 nested
// DTO shapes (DomainRowDto, DomainTypeShareDto, EntityMentionDto,
// CompetitiveGapDto, EntityRateDto) so chart components carry over.

export interface WorkspaceCompetitiveDto {
  workspaceId: string;
  /** Effective window lower bound (ISO). Null when caller asked for "All time". */
  from: string | null;
  /** Effective window upper bound (ISO). Resolves to UTC now when caller omitted. */
  to: string;
  topDomains: DomainRowDto[];
  domainTypes: DomainTypeShareDto[];
  mentionDistribution: EntityMentionDto[];
  /** One gap group per tracked brand (multi-brand workspace shape). */
  competitiveGaps: BrandCompetitiveGapGroupDto[];
  recommendationRates: EntityRateDto[];
}

export interface BrandCompetitiveGapGroupDto {
  trackedBrandId: string;
  trackedBrandName: string;
  gaps: CompetitiveGapDto[];
}

// -----------------------------------------------------------------
// Phase 4 v3 Slice C — workspace depth + recent chats
// -----------------------------------------------------------------

export interface WorkspaceDepthDto {
  workspaceId: string;
  /** Effective window lower bound (ISO). Null when caller asked for "All time". */
  from: string | null;
  /** Effective window upper bound (ISO). Resolves to UTC now when caller omitted. */
  to: string;
  mentionsByPlatform: PlatformMentionDto[];
  sentimentDistribution: SentimentSliceDto[];
  topicHeatmap: TopicHeatmapDto;
  recentChats: WorkspaceRecentChatDto[];
}

/**
 * Topic Coverage heatmap shape. Each cell carries both answer count and
 * citation count so the FE can toggle which metric to render without a
 * refetch. Row ranking is by AnswerCount desc on the backend.
 */
export interface TopicHeatmapDto {
  rows: string[];
  columns: string[];
  cells: TopicHeatmapCellDto[];
}

export interface TopicHeatmapCellDto {
  row: string;
  column: string;
  answerCount: number;
  citationCount: number;
}

/**
 * Workspace recent-chat row. Brand name is carried for the in-list chip
 * so the multi-tracker UI can label each card with the owning brand.
 * Tracker identity is intentionally omitted.
 */
export interface WorkspaceRecentChatDto {
  answerId: string;
  promptRunId: string;
  promptText: string;
  platformId: string;
  platformCode: string;
  platformName: string;
  lensCode: string;
  lensName: string;
  answerSnippet: string;
  capturedAt: string;
  mentionCount: number;
  citationCount: number;
  brandSentiment: string | null;
  brandName: string;
}
