import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { promptsApi } from "@/api/promptsApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Per-prompt answer history feed for the row-click drawer on /prompts.
 * Wraps `GET /api/prompts/{promptId}/answers?from=&to=`. Disabled when
 * `promptId` is null so callers can pass the drawer's "no row selected"
 * state straight through without branching.
 */
export function usePromptAnswerHistory(promptId: string | null, selection: DateRangeSelection) {
  return useQuery({
    queryKey: ["prompt-answer-history", promptId, serializeDateRangeSelection(selection)],
    queryFn: () => promptsApi.answerHistory(promptId!, resolveDateRange(selection)),
    enabled: promptId !== null,
    placeholderData: keepPreviousData,
  });
}
