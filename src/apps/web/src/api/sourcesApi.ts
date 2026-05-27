import { apiClient } from "./apiClient";
import type {
  ScanSourceCitationsDto,
  ScanSourcesDto,
  SourceTypeReferenceDto,
  UpdateClassificationRequest,
  UpdateSourceClassificationResult,
} from "@/types/api";

/**
 * Source/Citation view API surface (Phase 4 Slice 2). Three GETs scoped
 * to a scan + one cross-scan PUT for the user-correction flow (D11/D20).
 */
export const sourcesApi = {
  forScan: (scanRunId: string) => apiClient.get<ScanSourcesDto>(`/api/scans/${scanRunId}/sources`),

  citationsForSource: (scanRunId: string, sourceId: string) =>
    apiClient.get<ScanSourceCitationsDto>(`/api/scans/${scanRunId}/sources/${sourceId}/citations`),

  updateClassification: (sourceId: string, brandId: string, body: UpdateClassificationRequest) =>
    apiClient.put<UpdateSourceClassificationResult>(
      `/api/sources/${sourceId}/classification?brandId=${brandId}`,
      body,
    ),
};

export const sourceTypesApi = {
  list: () => apiClient.get<SourceTypeReferenceDto[]>(`/api/source-types`),
};
