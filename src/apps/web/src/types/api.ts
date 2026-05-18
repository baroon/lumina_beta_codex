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

export type DiscoveryStatus = "Pending" | "Crawling" | "Extracting" | "AwaitingConfirmation" | "Completed" | "Failed";
export type CandidateStatus = "Suggested" | "Confirmed" | "Dismissed" | "UserAdded";
export type CandidateSource = "WebsiteCrawl" | "LLMSuggested" | "SearchSuggested" | "UserAdded" | "SystemTemplate";

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
}

export interface BrandProfileDto {
  id: string;
  shortDescription: string | null;
  industry: string | null;
  category: string | null;
  positioning: string | null;
  confidence: number;
  source: CandidateSource;
  status: CandidateStatus;
}

export interface CandidateDto {
  id: string;
  name: string;
  description: string | null;
  confidence: number;
  source: CandidateSource;
  status: CandidateStatus;
  metadata: Record<string, string>;
}

export interface ConfirmDiscoveryRequest {
  confirmedIds: string[];
  dismissedIds: string[];
}

export interface DiscoveryProgressMessage {
  brandId: string;
  status: DiscoveryStatus;
  message: string;
  pagesCrawled: number;
  step: number;
  totalSteps: number;
}
