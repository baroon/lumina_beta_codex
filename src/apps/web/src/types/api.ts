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
