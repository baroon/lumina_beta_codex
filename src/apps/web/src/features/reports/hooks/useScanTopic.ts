import { useQuery } from "@tanstack/react-query";
import { topicsApi } from "@/api/topicsApi";

/**
 * Topic detail query — metric pivot + per-platform breakdown + top cited
 * sources within the topic (Phase 4 Slice 3, D16). Disabled when either id
 * is missing so the detail route doesn't fire on mount before params are
 * resolved.
 */
export function useScanTopic(scanRunId: string, topicId: string | null) {
  return useQuery({
    queryKey: ["scan-topic", scanRunId, topicId],
    queryFn: () => topicsApi.detail(scanRunId, topicId!),
    enabled: !!scanRunId && !!topicId,
  });
}
