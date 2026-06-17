import { REPORTS_COPY } from "@/content/reports";
import type { ScanListItemDto } from "@/types/api";

export interface ScanHistorySummary {
  lastCompletedScan: string;
  checksCompleted: string;
  successRate: string;
  failedRuns: string;
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
