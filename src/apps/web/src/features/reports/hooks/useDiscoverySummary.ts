import { useQuery } from "@tanstack/react-query";
import { overviewApi } from "@/api/overviewApi";

/**
 * Workspace discovery summary — counts + names for every dimension the
 * user filled in during discovery (products / markets / audiences /
 * topics / trust signals). Drives the inline strip near the top of the
 * Workspace Overview so the user gets immediate visual confirmation
 * that the setup work is reflected in the system. Workspace-scoped;
 * no date / lens filter dependency, so a single static query key is
 * fine.
 */
export function useDiscoverySummary() {
  return useQuery({
    queryKey: ["workspace-discovery-summary"],
    queryFn: () => overviewApi.discoverySummary(),
  });
}
