import { REPORTS_COPY } from "@/content/reports";
import type { ScanListItemDto } from "@/types/api";

export interface ScanHistorySummary {
  lastCompletedScan: string;
  checksCompleted: string;
  successRate: string;
  failedRuns: string;
}

export type ScanStatusFilter = "Completed" | "Running" | "Failed" | "Pending";
export type ScanAttentionPriority = "High" | "Medium";
export type ScanAttentionAction =
  | "Review failures"
  | "Monitor progress"
  | "Wait for analysis"
  | "Review incomplete checks";

export interface ScanAttentionItem {
  scanRunId: string;
  title: string;
  trackerName: string;
  brandName: string;
  priority: ScanAttentionPriority;
  action: ScanAttentionAction;
  reason: string;
  startedAt: string;
}

export function deriveScanHistorySummary(rows: readonly ScanListItemDto[]): ScanHistorySummary {
  const completedScans = rows
    .filter((row) => row.scanStatus === "Completed" && row.completedAt)
    .sort((a, b) => Date.parse(b.completedAt ?? "") - Date.parse(a.completedAt ?? ""));
  const totalChecks = rows.reduce((sum, row) => sum + row.scanCheckCount, 0);
  const completedChecks = rows.reduce((sum, row) => sum + row.completedCount, 0);
  const failedRuns = rows.filter(
    (row) => row.failedCount > 0 || row.scanStatus === "Failed",
  ).length;
  const successRate =
    totalChecks > 0
      ? `${Math.round((completedChecks / totalChecks) * 100)}%`
      : REPORTS_COPY.scanList.analysisPending;

  return {
    lastCompletedScan: completedScans[0]?.completedAt
      ? formatScanDateTime(completedScans[0].completedAt)
      : REPORTS_COPY.scanList.analysisPending,
    checksCompleted: completedChecks.toLocaleString(),
    successRate,
    failedRuns: failedRuns.toLocaleString(),
  };
}

export function filterScansByStatus(
  rows: readonly ScanListItemDto[],
  status: ScanStatusFilter | null,
): ScanListItemDto[] {
  if (status == null) return [...rows];
  return rows.filter((row) => row.scanStatus === status);
}

export function countScansByStatus(
  rows: readonly ScanListItemDto[],
): Record<ScanStatusFilter, number> {
  return {
    Completed: rows.filter((row) => row.scanStatus === "Completed").length,
    Running: rows.filter((row) => row.scanStatus === "Running").length,
    Failed: rows.filter((row) => row.scanStatus === "Failed").length,
    Pending: rows.filter((row) => row.scanStatus === "Pending").length,
  };
}

export function deriveScanAttentionItems(rows: readonly ScanListItemDto[]): ScanAttentionItem[] {
  return rows
    .map((row): ScanAttentionItem | null => {
      if (row.scanStatus === "Failed" || row.failedCount > 0) {
        return {
          scanRunId: row.scanRunId,
          title: `${row.brandName} / ${row.trackerName}`,
          trackerName: row.trackerName,
          brandName: row.brandName,
          priority: "High",
          action: "Review failures",
          reason: `${row.failedCount.toLocaleString()} failed check${
            row.failedCount === 1 ? "" : "s"
          } need review before this scan is report-ready.`,
          startedAt: row.startedAt,
        };
      }

      if (row.scanStatus === "Running" || row.scanStatus === "Pending") {
        return {
          scanRunId: row.scanRunId,
          title: `${row.brandName} / ${row.trackerName}`,
          trackerName: row.trackerName,
          brandName: row.brandName,
          priority: "Medium",
          action: "Monitor progress",
          reason: "This scan has not finished collecting AI answers yet.",
          startedAt: row.startedAt,
        };
      }

      if (row.analysisStatus == null) {
        return {
          scanRunId: row.scanRunId,
          title: `${row.brandName} / ${row.trackerName}`,
          trackerName: row.trackerName,
          brandName: row.brandName,
          priority: "Medium",
          action: "Wait for analysis",
          reason: "Answer collection finished, but analysis output is not available yet.",
          startedAt: row.startedAt,
        };
      }

      if (row.completedCount < row.scanCheckCount) {
        return {
          scanRunId: row.scanRunId,
          title: `${row.brandName} / ${row.trackerName}`,
          trackerName: row.trackerName,
          brandName: row.brandName,
          priority: "Medium",
          action: "Review incomplete checks",
          reason: `${row.completedCount.toLocaleString()}/${row.scanCheckCount.toLocaleString()} checks completed.`,
          startedAt: row.startedAt,
        };
      }

      return null;
    })
    .filter((item): item is ScanAttentionItem => item != null)
    .sort((a, b) => {
      const priority =
        scanAttentionPriorityRank(a.priority) - scanAttentionPriorityRank(b.priority);
      if (priority !== 0) return priority;
      return Date.parse(b.startedAt) - Date.parse(a.startedAt);
    })
    .slice(0, 5);
}

function scanAttentionPriorityRank(priority: ScanAttentionPriority): number {
  return priority === "High" ? 0 : 1;
}

export function formatScanDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatScanDuration(row: ScanListItemDto): string {
  if (!row.completedAt) return REPORTS_COPY.scanList.analysisPending;
  const started = Date.parse(row.startedAt);
  const completed = Date.parse(row.completedAt);
  if (Number.isNaN(started) || Number.isNaN(completed) || completed < started) {
    return REPORTS_COPY.scanList.analysisPending;
  }

  const minutes = Math.max(1, Math.round((completed - started) / 60000));
  return minutes === 1 ? "1 min" : `${minutes.toLocaleString()} mins`;
}
