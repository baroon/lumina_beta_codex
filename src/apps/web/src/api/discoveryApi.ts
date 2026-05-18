import { apiClient } from "./apiClient";
import type { ConfirmDiscoveryRequest, DiscoveryResultsDto } from "@/types/api";

export const discoveryApi = {
  getResults: (brandId: string) =>
    apiClient.get<DiscoveryResultsDto>(`/api/brands/${brandId}/discovery`),

  confirm: (brandId: string, data: ConfirmDiscoveryRequest) =>
    apiClient.post<void>(`/api/brands/${brandId}/discovery/confirm`, data),
};
