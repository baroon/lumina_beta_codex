import { useQuery } from "@tanstack/react-query";
import { trackersApi } from "@/api/trackersApi";

export function useBrandTrackersList() {
  return useQuery({
    queryKey: ["all-trackers"],
    queryFn: () => trackersApi.list(),
  });
}
