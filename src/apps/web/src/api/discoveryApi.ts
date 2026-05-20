import { apiClient } from "./apiClient";
import type {
  ConfirmDiscoveryRequest,
  DiscoveryResultsDto,
  RegenerateLensRequest,
  RegenerateLensResponse,
  ResuggestRequest,
  ResuggestResponse,
} from "@/types/api";

export const discoveryApi = {
  getResults: (brandId: string) =>
    apiClient.get<DiscoveryResultsDto>(`/api/brands/${brandId}/discovery`),

  confirm: (brandId: string, data: ConfirmDiscoveryRequest) =>
    apiClient.post<void>(`/api/brands/${brandId}/discovery/confirm`, data),

  resuggest: (brandId: string, data: ResuggestRequest) =>
    apiClient.post<ResuggestResponse>(`/api/brands/${brandId}/discovery/resuggest`, data),

  regenerateLens: (brandId: string, data: RegenerateLensRequest) =>
    apiClient.post<RegenerateLensResponse>(
      `/api/brands/${brandId}/discovery/regenerate-lens`,
      data,
    ),
};
