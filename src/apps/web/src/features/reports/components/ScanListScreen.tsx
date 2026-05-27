import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useAllScans } from "@/features/reports/hooks/useAllScans";
import type { ScanListItemDto } from "@/types/api";

/**
 * Temporary cross-tracker scan index. Lists every recent scan with a row
 * link to its Scan Results page. Not in production navigation — typed via
 * the /scans URL. Replace with a real Tracker Dashboard once that lands.
 */
export function ScanListScreen() {
  const { data, isLoading, isError, error, refetch } = useAllScans();

  if (isLoading) return <LoadingPage />;
  if (isError) {
    return (
      <ErrorPage
        error={error instanceof Error ? error : undefined}
        onReset={() => void refetch()}
      />
    );
  }

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={REPORTS_COPY.scanList.title}
        description={REPORTS_COPY.scanList.subtitle}
      />

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-neutral-500">
              {REPORTS_COPY.scanList.empty}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                  <th className="px-4 py-3 text-left font-medium">
                    {REPORTS_COPY.scanList.columns.startedAt}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {REPORTS_COPY.scanList.columns.brand}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {REPORTS_COPY.scanList.columns.tracker}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {REPORTS_COPY.scanList.columns.scanStatus}
                  </th>
                  <th className="px-4 py-3 text-left font-medium">
                    {REPORTS_COPY.scanList.columns.analysisStatus}
                  </th>
                  <th className="px-4 py-3 text-right font-medium">
                    {REPORTS_COPY.scanList.columns.progress}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <ScanRow key={row.scanRunId} row={row} />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ScanRow({ row }: { row: ScanListItemDto }) {
  return (
    <tr className="border-b border-neutral-100 hover:bg-neutral-50 last:border-b-0">
      <td className="px-4 py-3 tabular-nums">
        <Link
          to="/scans/$scanRunId/results"
          params={{ scanRunId: row.scanRunId }}
          className="text-neutral-700 hover:text-primary-600 hover:underline"
        >
          {formatDateTime(row.startedAt)}
        </Link>
      </td>
      <td className="px-4 py-3 text-neutral-700">{row.brandName}</td>
      <td className="px-4 py-3 text-neutral-700">{row.trackerName}</td>
      <td className="px-4 py-3">
        <StatusBadge status={row.scanStatus} />
      </td>
      <td className="px-4 py-3">
        {row.analysisStatus ? (
          <StatusBadge status={row.analysisStatus} />
        ) : (
          <span className="text-neutral-400">{REPORTS_COPY.scanList.analysisPending}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-neutral-700">
        {row.failedCount > 0
          ? `${row.completedCount}/${row.scanCheckCount} (${row.failedCount} failed)`
          : `${row.completedCount}/${row.scanCheckCount}`}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "Completed" ? "secondary" : status === "Failed" ? "destructive" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
