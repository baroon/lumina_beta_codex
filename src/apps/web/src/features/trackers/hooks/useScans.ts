import { useMutation, useQuery } from "@tanstack/react-query";
import { scansApi } from "@/api/scansApi";

export function useRunScan(trackerId: string) {
  return useMutation({
    mutationFn: () => scansApi.run(trackerId),
  });
}

/** Polls the latest scan every 2s until it finishes (Completed/Failed). */
export function useLatestScan(trackerId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["latest-scan", trackerId],
    queryFn: () => scansApi.latest(trackerId),
    enabled: enabled && !!trackerId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "Completed" || status === "Failed" ? false : 2000;
    },
  });
}
