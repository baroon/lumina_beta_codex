import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";
import {
  resolveDateRange,
  serializeDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";

/**
 * Per-topic mention counts for the current workspace + window. Drives
 * the inline count chip in {@link TopicSelector}. Workspace + date
 * scoped only — deliberately unfiltered by the active lens / topic
 * filter so the chip stays stable as the user toggles.
 */
export function useTopicCounts(selection: DateRangeSelection) {
  return useQuery({
    queryKey: ["workspace-topic-counts", serializeDateRangeSelection(selection)],
    queryFn: () => overviewApi.topicCounts(resolveDateRange(selection)),
    placeholderData: keepPreviousData,
  });
}
