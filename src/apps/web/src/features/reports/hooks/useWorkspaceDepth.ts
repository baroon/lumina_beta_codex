import { useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Phase 4 v3 Slice C — workspace depth read model. Per-platform brand
 * metrics, sentiment distribution, activity + topic heatmaps, recent
 * chats. Separate fetch from {@link useWorkspaceOverview} and
 * {@link useWorkspaceCompetitive} so each section payload is scoped.
 */
export function useWorkspaceDepth(selection: DateRangeSelection) {
  return useQuery({
    queryKey: ["workspace-depth", serializeDateRangeSelection(selection)],
    queryFn: () => overviewApi.depth(resolveDateRange(selection)),
  });
}
