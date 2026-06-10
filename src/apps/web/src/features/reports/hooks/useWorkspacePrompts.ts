import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { promptsApi } from "@/api/promptsApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Workspace-wide prompt inventory feed for the /prompts page. Wraps
 * `GET /api/prompts?from=&to=&trackerIds=...` and respects the sidebar
 * TrackerSelector scope via the `trackerIds` arg.
 *
 * Inventory-only for v1 — analytical columns (visibility, sentiment,
 * position, mention count) require heavier joins through PromptRuns →
 * AIAnswers → Mentions and will land in a follow-up.
 */
export function useWorkspacePrompts(
  selection: DateRangeSelection,
  trackerIds: readonly string[] = [],
) {
  const trackerKey = [...trackerIds].sort().join(",");
  return useQuery({
    queryKey: ["workspace-prompts", serializeDateRangeSelection(selection), trackerKey],
    queryFn: () => promptsApi.workspace(resolveDateRange(selection), trackerIds),
    placeholderData: keepPreviousData,
  });
}
