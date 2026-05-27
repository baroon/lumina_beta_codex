import { useQuery } from "@tanstack/react-query";
import { sourceTypesApi } from "@/api/sourcesApi";

/**
 * Caches the 12-row source_types reference table so the editable-type
 * dropdown can render display names + tooltips without round-trips
 * (Phase 4 v1 plan §D12 / §D20). Long staleTime because this data is
 * effectively static across a session.
 */
export function useSourceTypes() {
  return useQuery({
    queryKey: ["source-types"],
    queryFn: () => sourceTypesApi.list(),
    staleTime: 1000 * 60 * 30, // 30 min
  });
}
