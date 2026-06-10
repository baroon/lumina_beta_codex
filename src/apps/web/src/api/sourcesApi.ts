import { apiClient } from "./apiClient";
import type { DateRange } from "@/components/molecules/DateRangePicker";
import type {
  ScanSourceCitationsDto,
  ScanSourcesDto,
  SourceTypeReferenceDto,
  UpdateClassificationRequest,
  UpdateSourceClassificationResult,
  WorkspaceDomainsDto,
  WorkspaceUrlsDto,
} from "@/types/api";

/**
 * Build the `?from=&to=&trackerIds=` query string for the workspace
 * sources endpoint(s). Same convention as overviewApi + promptsApi.
 */
function buildWorkspaceSourcesQuery(range: DateRange, trackerIds: readonly string[]): string {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from.toISOString());
  if (range.to) params.set("to", range.to.toISOString());
  for (const id of trackerIds) params.append("trackerIds", id);
  const s = params.toString();
  return s ? `?${s}` : "";
}

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

  /**
   * Workspace-wide domain-level citation source view at
   * GET /api/sources/domains. Aggregates citations across selected
   * trackers in window, one row per Source.
   */
  workspaceDomains: (range: DateRange, trackerIds: readonly string[] = []) =>
    apiClient.get<WorkspaceDomainsDto>(
      `/api/sources/domains${buildWorkspaceSourcesQuery(range, trackerIds)}`,
    ),

  /**
   * Workspace-wide URL-level citation source view at
   * GET /api/sources/urls. One row per SourceUrl — mentioned-source
   * citations without a URL only appear on /sources/domains.
   */
  workspaceUrls: (range: DateRange, trackerIds: readonly string[] = []) =>
    apiClient.get<WorkspaceUrlsDto>(
      `/api/sources/urls${buildWorkspaceSourcesQuery(range, trackerIds)}`,
    ),
};

export const sourceTypesApi = {
  list: () => apiClient.get<SourceTypeReferenceDto[]>(`/api/source-types`),
};
