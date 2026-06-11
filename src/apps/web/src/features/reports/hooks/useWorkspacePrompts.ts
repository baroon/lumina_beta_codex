import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

/**
 * Edit a prompt's text from the workspace /prompts page. Each row knows
 * its trackerId, so the mutation accepts it per-call rather than baking
 * it into the hook. Invalidates the per-tracker prompts cache (so the
 * TrackerHub Prompts tab refreshes if open) + the workspace-prompts
 * prefix (so this page picks up the new text after the row revalidates).
 *
 * Sibling to the trackers feature's `useUpdatePrompt` — duplicated here
 * because the cross-feature import rule bans reports from importing
 * trackers. Both consume the same shared promptsApi.
 */
export function useUpdateWorkspacePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { trackerId: string; promptId: string; text: string }) =>
      promptsApi.update(vars.trackerId, vars.promptId, { text: vars.text }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["prompts", vars.trackerId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-prompts"] });
    },
  });
}

/** Soft-archives a prompt from the workspace /prompts page. */
export function useRemoveWorkspacePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { trackerId: string; promptId: string }) =>
      promptsApi.remove(vars.trackerId, vars.promptId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["prompts", vars.trackerId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-prompts"] });
    },
  });
}
