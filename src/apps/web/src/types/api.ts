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

export interface UpdateBrandAliasesRequest {
  aliases: string[];
}

export interface UpdateBrandAliasesResult {
  aliases: string[];
}

export interface UpdateBrandProfileRequest {
  shortDescription: string | null;
  industry: string | null;
  category: string | null;
  positioning: string | null;
}

export interface UpdateBrandProfileResult {
  shortDescription: string | null;
  industry: string | null;
  category: string | null;
  positioning: string | null;
}

export interface AddBrandTopicRequest {
  name: string;
}

export interface AddBrandTopicResult {
  topicId: string;
  name: string;
}

export interface AddBrandCompetitorRequest {
  name: string;
}

export interface AddBrandCompetitorResult {
  competitorId: string;
  name: string;
}

export interface AddBrandAudienceRequest {
  name: string;
}

export interface AddBrandAudienceResult {
  audienceId: string;
  name: string;
}

export interface AddBrandMarketRequest {
  name: string;
}

export interface AddBrandMarketResult {
  marketId: string;
  name: string;
}

export interface AddBrandProductRequest {
  name: string;
}

export interface AddBrandProductResult {
  productId: string;
  name: string;
}

export interface AddBrandTrustSignalRequest {
  name: string;
}

export interface AddBrandTrustSignalResult {
  trustSignalId: string;
  name: string;
}

export interface RenameTrackerRequest {
  name: string;
}

export interface RenameTrackerResult {
  trackerId: string;
  name: string;
}

export interface RenameBrandRequest {
  name: string;
}

export interface RenameBrandResult {
  brandId: string;
  name: string;
}

export interface UpdateBrandWebsiteUrlRequest {
  websiteUrl: string;
}

export interface UpdateBrandWebsiteUrlResult {
  brandId: string;
  websiteUrl: string;
}

export interface GenerateInsightsNarrativeRequest {
  from?: string | null;
  to?: string | null;
  trackerIds?: string[] | null;
}

export interface InsightsNarrativeDto {
  narrative: string;
  platformCode: string;
}

/** Shared rename payload for every brand dimension row. */
export interface RenameBrandDimensionRequest {
  name: string;
}

/** Shared rename response. */
export interface RenameBrandDimensionResult {
  name: string;
}

export interface UpdateBrandCompetitorAliasesRequest {
  aliases: string[];
}

export interface UpdateBrandCompetitorAliasesResult {
  aliases: string[];
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
  /** "Also known as" — populated for Product and Competitor candidates. Empty for other types. */
  aliases?: string[];
}

export interface ConfirmCandidateInput {
  name: string;
  description: string | null;
  confidence: number;
  source: CandidateSource;
  metadata?: Record<string, string> | null;
  /** Round-trips Product.Aliases / Competitor.Aliases through confirm. Omit / null for other candidate types. */
  aliases?: string[] | null;
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
  /** Tracked brand name — drives the prompt-generation progress title. */
  brandName: string;
  trackerName: string;
  prompts: PromptDto[];
  checks: PromptOption[];
  topics: PromptOption[];
}

/** Workspace-wide prompt inventory row returned by GET /api/prompts. */
export interface WorkspacePromptRowDto {
  promptId: string;
  text: string;
  lensId: string;
  lensName: string;
  topics: string[];
  trackerId: string;
  trackerName: string;
  brandId: string;
  brandName: string;
  /** Distinct scan runs in the window where this prompt was executed. */
  scanCount: number;
  /** Most recent ScanRun.CompletedAt for this prompt in window. ISO string; null when no runs. */
  lastScanAt: string | null;
  /** Distinct platform codes the prompt ran on (e.g. "openai"). */
  platformCodes: string[];
  /**
   * Fraction of in-window AI answers to this prompt that contained at
   * least one mention of the prompt's tracked brand, [0..1]. Null when
   * there are no in-window answers (FE renders "—" rather than 0%).
   */
  visibilityRate: number | null;
  /** Total tracked-brand mention occurrences across in-window answers. */
  brandMentionCount: number;
  /** Dominant Sentiment enum ("Positive" | "Neutral" | "Negative" | "Mixed" | "Unknown") across brand mentions; null when no mentions. */
  dominantSentiment: string | null;
  /** Average <c>FirstMentionPosition</c> [0..1]; lower = more prominent. Null when no mentions. */
  averageFirstMentionPosition: number | null;
}

export interface WorkspacePromptsDto {
  workspaceId: string;
  /** Window lower bound (ISO). Null = "all time". */
  from: string | null;
  /** Window upper bound (ISO). Resolves to UTC now when caller omits. */
  to: string;
  prompts: WorkspacePromptRowDto[];
}

/** Domain-level citation source row from GET /api/sources/domains. */
export interface WorkspaceDomainRowDto {
  sourceId: string;
  sourceName: string;
  /** Canonical domain (lowercase, "www." stripped). Null when the citation was a mentioned source without URL. */
  normalizedDomain: string | null;
  /** Dominant SourceType across the workspace's brand classifications. "Unknown" when no classification exists. */
  sourceType: string;
  /** Curated authority score, 0–100. Null when the domain isn't on the curated list. */
  authorityScore: number | null;
  /** Total citations across in-window scans. */
  citationCount: number;
  /** Distinct ScanRuns in window that cited this Source. */
  retrievedInScans: number;
  /** Most recent ScanRun.CompletedAt that cited this Source. ISO; null when no scans. */
  lastSeenAt: string | null;
}

export interface WorkspaceDomainsDto {
  workspaceId: string;
  from: string | null;
  to: string;
  domains: WorkspaceDomainRowDto[];
}

/** URL-level citation source row from GET /api/sources/urls. */
export interface WorkspaceUrlRowDto {
  sourceUrlId: string;
  url: string;
  normalizedUrl: string;
  /** Page title scraped at extraction time. Null when extraction couldn't pull one. */
  title: string | null;
  sourceId: string;
  sourceName: string;
  normalizedDomain: string | null;
  /** Dominant SourceType across the workspace's brand classifications. "Unknown" when none exists. */
  sourceType: string;
  citationCount: number;
  retrievedInScans: number;
  lastSeenAt: string | null;
}

export interface WorkspaceUrlsDto {
  workspaceId: string;
  from: string | null;
  to: string;
  urls: WorkspaceUrlRowDto[];
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

/** A single Visibility Lens row for the tracker lens picker. */
export interface LensOptionDto {
  id: string;
  code: string;
  name: string;
  description: string;
  displayOrder: number;
}

/** GET /api/trackers/{id}/lenses — lens catalog + tracker's current selection. */
export interface TrackerLensesSetupDto {
  trackerId: string;
  trackerName: string;
  lenses: LensOptionDto[];
  selectedLensIds: string[];
}

export interface UpdateTrackerLensesRequest {
  lensIds: string[];
}

export interface UpdateTrackerLensesResult {
  selectedLensCount: number;
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
  /** Tracked brand name — drives the scan-progress title. */
  brandName: string;
  /** Per-platform progress slice, ordered alphabetically by platform name. */
  platforms: ScanPlatformProgress[];
  /** Live aggregates joined to this scan's answers; updates every poll. */
  liveCounters: LiveCounters;
}

export interface ScanPlatformProgress {
  platformId: string;
  code: string;
  name: string;
  completed: number;
  failed: number;
  total: number;
  /** "Pending" | "Running" | "Done" | "Failed". */
  status: string;
}

export interface LiveCounters {
  mentions: number;
  citations: number;
  recommended: number;
  sentiment: SentimentDistribution;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
  mixed: number;
  unknown: number;
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
  /** Lead share — fraction of answers where the brand was first-named by position. Null when no mentions in scope. */
  brandFirstMentionRate: number | null;
  /** Average ranked-list size the brand was ranked against. Null when no rank universe captured. */
  averageBrandRankUniverseSize: number | null;
  /** Mean recommendation score in [-1, +1]. Null when no answers in scope had the brand mentioned. */
  brandRecommendationScore: number | null;
  /** Brand's share of all recommendations in the scan. Null when nobody was recommended. */
  brandRecommendationShare: number | null;
  /** Fraction of answers where the brand is entirely absent (no mention, no owned citation). Null when no answers in scope. */
  brandAbsenceRate: number | null;
  /** Mean answer certainty (how confidently the AI itself stated claims). Range [0,1]. Null when no answers. */
  averageAnswerCertainty: number | null;
  /** Fraction of answers (with ≥1 recommendation) where brand is the top pick. Null when no recs. */
  brandTopRecommendationShare: number | null;
  /** Average brand position in answers where it appeared in the recommendation list. Null when never recommended. */
  averageBrandRecommendationPosition: number | null;
  /** Count of risk flags attached to brand mentions in scope. */
  brandRiskFlagCount: number;
  /** Head-to-head comparisons the brand wins on the named aspect. */
  brandWinningComparisonCount: number;
  /** Head-to-head comparisons the brand loses on the named aspect. */
  brandLosingComparisonCount: number;
  /** Recommended for X scenario count attached to brand mentions. */
  brandRecommendedForCount: number;
  /** With caveats count attached to brand mentions. */
  brandWithCaveatsCount: number;
  /** Per-topic rows where the brand IS recommended for the topic. */
  brandTopicRecommendedCount: number;
  /** Per-topic rows where the brand is explicitly NOT recommended. */
  brandTopicNotRecommendedCount: number;
  /** Citations from curated high-authority domains (score >= 70). */
  highAuthorityCitationCount: number;
  /** Citations from curated low-authority domains (score < 70). Null-authority sources excluded. */
  lowAuthorityCitationCount: number;
  /** Change in BrandMentionRate vs previous scan. Null on first scan. */
  brandMentionRateMomentum: number | null;
  /** Change in BrandShareOfVoice vs previous scan. Null on first scan. */
  brandShareOfVoiceMomentum: number | null;
  /** Change in BrandAbsenceRate vs previous scan. Inverse direction — positive = worse. Null on first scan. */
  brandAbsenceRateMomentum: number | null;
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
  /** Top-N attributes the AI ascribed to the brand at Overall scope. Empty when none extracted. */
  topBrandAttributes: BrandAttributeDto[];
}

export interface TopCitedSourceDto {
  rank: number;
  sourceName: string;
  citationCount: number;
}

/** One brand attribute aggregated across the scan. */
export interface BrandAttributeDto {
  rank: number;
  name: string;
  /** 'Positive' | 'Neutral' | 'Negative' — mode polarity across mentions of the attribute. */
  polarity: string;
  mentionCount: number;
}

/** Scan-scoped factual claims (Phase 4 measurement-model expansion, item #14). */
export interface ScanClaimsDto {
  scanRunId: string;
  claims: FactualClaimDto[];
}

export interface FactualClaimDto {
  id: string;
  entityName: string;
  entityType: string;
  claimText: string;
  subject: string;
  assertedValue: string;
  evidenceSnippet: string;
  /** 'Verifiable' | 'Subjective' | 'Unverifiable'. */
  verifiability: string;
  /** 'Pending' | 'Verified' | 'Disputed'. */
  reviewStatus: string;
  confidenceScore: number;
  createdAt: string;
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
  /** Share of voice — competitor's mentions / (brand + competitor mentions) across the scan. Null when missing. */
  shareOfVoice: number | null;
  /** Share of recommendations — competitor's recs / total recs across the scan. Null when no recs in scan. */
  recommendationShare: number | null;
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
  /** Topic ownership score [0..1] — fraction of answers on this topic that mention the brand. Defaults to 0 when missing. */
  ownershipScore: number;
  /** Banded ownership for display: 'Owned' (>=0.66), 'Contested' (0.33-0.66), 'Lost' (<0.33). */
  ownershipBand: string;
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
  /** Competitor's mentions / (brand + competitor mentions) across the scan. Null when missing. */
  shareOfVoice: number | null;
  /** Competitor's recs / total recs across the scan. Null when no recs in scan. */
  recommendationShare: number | null;
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
 * Per-audience mention count, deduped by audience name. Drives the
 * count chip in `AudienceSelector`.
 */
export interface AudienceCountDto {
  audienceName: string;
  mentionCount: number;
}

/**
 * Workspace discovery summary — names + counts for every dimension the
 * user captured during the brand-discovery flow, grouped per brand.
 * Each tracker dropdown on the Workspace Overview renders one section
 * per brand using these groups so the user can see which dimensions
 * belong to which brand. Filter behavior on the overview is still
 * name-based, so shared names across brands toggle together.
 */
export interface DiscoverySummaryDto {
  products: BrandedDimensionGroupDto[];
  markets: BrandedDimensionGroupDto[];
  audiences: BrandedDimensionGroupDto[];
  topics: BrandedDimensionGroupDto[];
  trustSignals: BrandedDimensionGroupDto[];
}

/**
 * One brand's slice of a dimension list. Items are deduplicated within
 * the brand by the BE (a brand discovered twice doesn't show the same
 * topic row twice); duplicates ACROSS brands are kept so each brand's
 * section is complete.
 */
export interface BrandedDimensionGroupDto {
  brandId: string;
  brandName: string;
  items: DiscoveryDimensionDto[];
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
