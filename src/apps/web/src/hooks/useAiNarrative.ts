import { useMutation } from "@tanstack/react-query";
import { insightsApi } from "@/api/insightsApi";
import { resolveDateRange, type DateRangeSelection } from "@/components/molecules/DateRangePicker";

/**
 * Triggers an LLM-authored narrative on demand. The call is a
 * Mutation (not a Query) on purpose — LLM calls cost money so we only
 * want to fire on an explicit user click. The mutation result lives in
 * `data` until the user re-fires or unmounts; React Query's automatic
 * staleness handling doesn't apply because there's no key-based cache.
 *
 * Shared between the Insights workspace surface and the per-tracker
 * hub overview tab. `trackerIds` scopes the narrative — empty array
 * means workspace-wide.
 */
export function useGenerateAiNarrative() {
  return useMutation({
    mutationFn: ({
      selection,
      trackerIds,
    }: {
      selection: DateRangeSelection;
      trackerIds: readonly string[];
    }) => {
      const range = resolveDateRange(selection);
      return insightsApi.generateNarrative({
        from: range.from ? range.from.toISOString() : null,
        to: range.to ? range.to.toISOString() : null,
        trackerIds: trackerIds.length > 0 ? [...trackerIds] : null,
      });
    },
  });
}
