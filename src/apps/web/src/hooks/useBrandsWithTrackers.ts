import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { trackersApi } from "@/api/trackersApi";
import type { BrandGroup } from "@/components/molecules/TrackerSelector";
import type { TrackerListItemDto } from "@/types/api";

/**
 * Reshape the flat workspace tracker list into the brand-grouped tree
 * `TrackerSelector` expects. Stable order: brands alphabetical by name,
 * then trackers alphabetical by name within each brand. A tracker counts
 * as "has scans" when its `scanCount` is non-zero — anything else (Draft,
 * Scheduled, never run) renders greyed in the selector.
 *
 * Pure + exported so unit tests don't need to spin up React Query.
 */
export function groupTrackersByBrand(trackers: readonly TrackerListItemDto[]): BrandGroup[] {
  const byBrand = new Map<string, BrandGroup>();
  for (const t of trackers) {
    let group = byBrand.get(t.brandId);
    if (!group) {
      group = { brandId: t.brandId, brandName: t.brandName, trackers: [] };
      byBrand.set(t.brandId, group);
    }
    group.trackers.push({
      id: t.trackerId,
      name: t.name,
      hasScans: t.scanCount > 0,
    });
  }
  const groups = Array.from(byBrand.values());
  groups.sort((a, b) => a.brandName.localeCompare(b.brandName));
  for (const g of groups) {
    g.trackers.sort((a, b) => a.name.localeCompare(b.name));
  }
  return groups;
}

interface UseBrandsWithTrackersReturn {
  /** Brand-grouped tracker tree, ready to pass to `TrackerSelector`. */
  brands: BrandGroup[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * Fetches the workspace's full tracker list and shapes it for the
 * top-of-sidebar `TrackerSelector`. The list endpoint is workspace-wide
 * (`GET /api/trackers`) and small — caching defaults from the shared
 * `QueryClient` are fine.
 */
export function useBrandsWithTrackers(): UseBrandsWithTrackersReturn {
  const query = useQuery({
    queryKey: ["brands-with-trackers"],
    queryFn: () => trackersApi.list(),
  });

  const brands = useMemo(() => (query.data ? groupTrackersByBrand(query.data) : []), [query.data]);

  return {
    brands,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
