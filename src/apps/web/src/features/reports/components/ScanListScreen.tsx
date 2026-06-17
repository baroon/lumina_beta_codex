import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useAllScans } from "@/features/reports/hooks/useAllScans";
import { deriveScanHistorySummary, formatScanDateTime } from "@/features/reports/scanHistory";
import type { ScanListItemDto } from "@/types/api";

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
  const summary = deriveScanHistorySummary(rows);

  return (
    <div className="space-y-6">
      <PageHeader
        title={REPORTS_COPY.scanList.title}
        description={REPORTS_COPY.scanList.subtitle}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label={REPORTS_COPY.scanList.summary.lastCompletedScan}
          value={summary.lastCompletedScan}
          helper={REPORTS_COPY.scanList.summary.lastCompletedScanHelper}
        />
        <SummaryCard
          label={REPORTS_COPY.scanList.summary.answersCollected}
          value={summary.checksCompleted}
          helper={REPORTS_COPY.scanList.summary.answersCollectedHelper}
        />
        <SummaryCard
          label={REPORTS_COPY.scanList.summary.successRate}
          value={summary.successRate}
          helper={REPORTS_COPY.scanList.summary.successRateHelper}
        />
        <SummaryCard
          label={REPORTS_COPY.scanList.summary.failedRuns}
          value={summary.failedRuns}
          helper={REPORTS_COPY.scanList.summary.failedRunsHelper}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{REPORTS_COPY.scanList.sections.runs}</CardTitle>
          <p className="text-sm text-neutral-600">
            {REPORTS_COPY.scanList.sections.runsDescription}
          </p>
        </CardHeader>
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
                  <th className="px-4 py-3 text-right font-medium">
                    {REPORTS_COPY.scanList.columns.failures}
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
          {formatScanDateTime(row.startedAt)}
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
        {row.completedCount}/{row.scanCheckCount}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        <span className={row.failedCount > 0 ? "text-semantic-error-700" : "text-neutral-500"}>
          {row.failedCount}
        </span>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "Completed"
      ? "success"
      : status === "Failed"
        ? "destructive"
        : status === "Running"
          ? "warning"
          : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <p className="text-xs font-medium uppercase text-neutral-500">{label}</p>
        <p className="text-2xl font-semibold text-neutral-950">{value}</p>
        <p className="text-xs text-neutral-500">{helper}</p>
      </CardContent>
    </Card>
  );
}
