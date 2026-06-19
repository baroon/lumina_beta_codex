import type { BrandDto, DiscoveryStatus, TrackerListItemDto } from "@/types/api";

export type BrandDiscoveryAttentionPriority = "High" | "Medium";
export type BrandDiscoveryAttentionAction =
  | "Start discovery"
  | "Continue discovery"
  | "Retry discovery"
  | "Monitor discovery";

export interface BrandDiscoveryAttentionItem {
  brandId: string;
  brandName: string;
  websiteUrl: string;
  status: DiscoveryStatus | "Not started";
  priority: BrandDiscoveryAttentionPriority;
  action: BrandDiscoveryAttentionAction;
  reason: string;
}

export interface BrandTrackerInventoryItem {
  brand: BrandDto;
  trackers: TrackerListItemDto[];
  activeTrackerCount: number;
  totalScanCount: number;
  latestScanCompletedAt: string | null;
}

export function deriveBrandDiscoveryAttentionItems(
  rows: readonly BrandDto[],
): BrandDiscoveryAttentionItem[] {
  return rows
    .map((brand): BrandDiscoveryAttentionItem | null => {
      const discovery = brand.latestDiscovery;
      if (discovery == null) {
        return {
          brandId: brand.id,
          brandName: brand.name,
          websiteUrl: brand.websiteUrl,
          status: "Not started",
          priority: "High",
          action: "Start discovery",
          reason: "This brand does not have a discovery profile yet.",
        };
      }

      if (discovery.status === "Completed") return null;

      if (discovery.status === "Failed") {
        return {
          brandId: brand.id,
          brandName: brand.name,
          websiteUrl: brand.websiteUrl,
          status: discovery.status,
          priority: "High",
          action: "Retry discovery",
          reason: "The latest discovery run failed before a confirmed brand profile was created.",
        };
      }

      if (discovery.status === "AwaitingConfirmation") {
        return {
          brandId: brand.id,
          brandName: brand.name,
          websiteUrl: brand.websiteUrl,
          status: discovery.status,
          priority: "High",
          action: "Continue discovery",
          reason: `${discovery.pagesCrawled.toLocaleString()} crawled page${
            discovery.pagesCrawled === 1 ? "" : "s"
          } are waiting for confirmation.`,
        };
      }

      return {
        brandId: brand.id,
        brandName: brand.name,
        websiteUrl: brand.websiteUrl,
        status: discovery.status,
        priority: "Medium",
        action: "Monitor discovery",
        reason: "Discovery is still running and has not produced a confirmed profile yet.",
      };
    })
    .filter((item): item is BrandDiscoveryAttentionItem => item != null)
    .sort((a, b) => {
      const priority =
        brandDiscoveryAttentionPriorityRank(a.priority) -
        brandDiscoveryAttentionPriorityRank(b.priority);
      if (priority !== 0) return priority;
      return a.brandName.localeCompare(b.brandName);
    })
    .slice(0, 5);
}

export function deriveBrandTrackerInventory(
  brands: readonly BrandDto[],
  trackers: readonly TrackerListItemDto[],
): BrandTrackerInventoryItem[] {
  return brands.map((brand) => {
    const brandTrackers = trackers
      .filter((tracker) => tracker.brandId === brand.id)
      .sort((a, b) => a.name.localeCompare(b.name));
    const latestScanCompletedAt = brandTrackers
      .map((tracker) => tracker.latestScanCompletedAt)
      .filter((value): value is string => value != null)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      brand,
      trackers: brandTrackers,
      activeTrackerCount: brandTrackers.filter((tracker) => tracker.status === "Active").length,
      totalScanCount: brandTrackers.reduce((sum, tracker) => sum + tracker.scanCount, 0),
      latestScanCompletedAt: latestScanCompletedAt ?? null,
    };
  });
}

function brandDiscoveryAttentionPriorityRank(priority: BrandDiscoveryAttentionPriority): number {
  return priority === "High" ? 0 : 1;
}
