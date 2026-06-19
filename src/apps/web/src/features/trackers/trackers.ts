import type { TrackerListItemDto } from "@/types/api";

export type TrackerAttentionPriority = "High" | "Medium";
export type TrackerAttentionAction = "Run first scan" | "Activate tracker" | "Resume tracker";

export interface TrackerAttentionItem {
  trackerId: string;
  brandId: string;
  trackerName: string;
  brandName: string;
  priority: TrackerAttentionPriority;
  action: TrackerAttentionAction;
  reason: string;
}

export function deriveTrackerAttentionItems(
  rows: readonly TrackerListItemDto[],
): TrackerAttentionItem[] {
  return rows
    .map((row): TrackerAttentionItem | null => {
      const status = row.status.toLowerCase();
      if (status === "draft") {
        return {
          trackerId: row.trackerId,
          brandId: row.brandId,
          trackerName: row.name,
          brandName: row.brandName,
          priority: "High",
          action: "Activate tracker",
          reason: "This tracker is still a draft and is not collecting AI visibility evidence.",
        };
      }

      if (status === "paused" || status === "archived") {
        return {
          trackerId: row.trackerId,
          brandId: row.brandId,
          trackerName: row.name,
          brandName: row.brandName,
          priority: "Medium",
          action: "Resume tracker",
          reason: "Monitoring is not currently active for this tracker.",
        };
      }

      if (row.scanCount === 0 || row.latestScanCompletedAt == null) {
        return {
          trackerId: row.trackerId,
          brandId: row.brandId,
          trackerName: row.name,
          brandName: row.brandName,
          priority: "Medium",
          action: "Run first scan",
          reason: "This tracker has not produced a completed scan yet.",
        };
      }

      return null;
    })
    .filter((item): item is TrackerAttentionItem => item != null)
    .sort((a, b) => {
      const priority =
        trackerAttentionPriorityRank(a.priority) - trackerAttentionPriorityRank(b.priority);
      if (priority !== 0) return priority;
      return a.trackerName.localeCompare(b.trackerName);
    })
    .slice(0, 5);
}

function trackerAttentionPriorityRank(priority: TrackerAttentionPriority): number {
  return priority === "High" ? 0 : 1;
}
