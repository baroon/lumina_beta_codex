import { apiClient } from "./apiClient";
import type { GenerateInsightsNarrativeRequest, InsightsNarrativeDto } from "@/types/api";

export const insightsApi = {
  generateNarrative: (data: GenerateInsightsNarrativeRequest) =>
    apiClient.post<InsightsNarrativeDto>("/api/insights/narrative", data),
};
