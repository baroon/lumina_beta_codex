import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useAllScans } from "@/features/reports/hooks/useAllScans";
import {
  countScansByStatus,
  deriveScanAttentionItems,
  deriveScanHistorySummary,
  filterScansByStatus,
  formatScanDateTime,
  formatScanDuration,
  type ScanAttentionItem,
  type ScanStatusFilter,
} from "@/features/reports/scanHistory";
import { cn } from "@/lib/utils";
import type { ScanListItemDto } from "@/types/api";

const EMPTY_SCAN_ROWS: readonly ScanListItemDto[] = [];

export function ScanListScreen() {
  const { data, isLoading, isError, error, refetch } = useAllScans();
  const [statusFilter, setStatusFilter] = useState<ScanStatusFilter | null>(null);
  const [selectedScan, setSelectedScan] = useState<ScanListItemDto | null>(null);
  const rows = data ?? EMPTY_SCAN_ROWS;
  const filteredRows = useMemo(() => filterScansByStatus(rows, statusFilter), [rows, statusFilter]);
  const statusCounts = useMemo(() => countScansByStatus(rows), [rows]);
  const attentionItems = useMemo(() => deriveScanAttentionItems(filteredRows), [filteredRows]);
  const summary = deriveScanHistorySummary(filteredRows);

  if (isLoading) return <LoadingPage />;
  if (isError) {
    return (
      <ErrorPage
        error={error instanceof Error ? error : undefined}
        onReset={() => void refetch()}
      />
    );
  }

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

      <ScanAttentionSection
        items={attentionItems}
        onOpenSummary={(scanRunId) => {
          const scan = rows.find((row) => row.scanRunId === scanRunId);
          if (scan) setSelectedScan(scan);
        }}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{REPORTS_COPY.scanList.sections.runs}</CardTitle>
              <p className="text-sm text-neutral-600">
                {REPORTS_COPY.scanList.sections.runsDescription}
              </p>
            </div>
            <ScanStatusFilters
              counts={statusCounts}
              selected={statusFilter}
              onSelect={(next) => setStatusFilter((current) => (current === next ? null : next))}
              onClear={() => setStatusFilter(null)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-neutral-500">
              {REPORTS_COPY.scanList.empty}
            </p>
          ) : filteredRows.length === 0 ? (
            <p className="p-8 text-center text-sm text-neutral-500">
              {REPORTS_COPY.scanList.filteredEmpty}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[920px] w-full text-sm">
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
                    <th className="px-4 py-3 text-right font-medium">
                      {REPORTS_COPY.scanList.columns.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <ScanRow key={row.scanRunId} row={row} onOpenSummary={setSelectedScan} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ScanSummaryDrawer scan={selectedScan} onClose={() => setSelectedScan(null)} />
    </div>
  );
}

function ScanAttentionSection({
  items,
  onOpenSummary,
}: {
  items: readonly ScanAttentionItem[];
  onOpenSummary: (scanRunId: string) => void;
}) {
  const copy = REPORTS_COPY.scanList;
  return (
    <section aria-labelledby="scan-attention-title">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="scan-attention-title" className="text-sm font-semibold text-neutral-900">
                {copy.sections.attention}
              </h2>
              <p className="mt-1 text-xs text-neutral-500">{copy.sections.attentionDescription}</p>
            </div>
            <Badge variant={items.length === 0 ? "success" : "warning"}>
              {items.length.toLocaleString()}
            </Badge>
          </div>

          {items.length === 0 ? (
            <p className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              {copy.sections.attentionEmpty}
            </p>
          ) : (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.scanRunId}
                  className="flex min-h-32 flex-col rounded-md border border-neutral-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-neutral-900">{item.title}</h3>
                      <p className="mt-1 text-xs text-neutral-500">{item.reason}</p>
                    </div>
                    <Badge variant={item.priority === "High" ? "destructive" : "warning"}>
                      {item.priority}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{formatScanDateTime(item.startedAt)}</Badge>
                    <Badge variant="secondary">{item.action}</Badge>
                  </div>
                  <div className="mt-auto flex justify-end pt-4">
                    <Button variant="ghost" size="sm" onClick={() => onOpenSummary(item.scanRunId)}>
                      {copy.actions.openSummary}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ScanStatusFilters({
  counts,
  selected,
  onSelect,
  onClear,
}: {
  counts: Record<ScanStatusFilter, number>;
  selected: ScanStatusFilter | null;
  onSelect: (status: ScanStatusFilter) => void;
  onClear: () => void;
}) {
  const entries = Object.entries(counts) as [ScanStatusFilter, number][];
  return (
    <div className="flex flex-wrap justify-end gap-1">
      {entries
        .filter(([, count]) => count > 0)
        .map(([status, count]) => {
          const active = selected === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(status)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition",
                active
                  ? "border-primary-600 bg-primary-100 text-primary-700"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
              )}
            >
              <span>{status}</span>
              <span className="tabular-nums text-neutral-400">{count}</span>
            </button>
          );
        })}
      {selected && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-md px-2 py-1 text-[10px] font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
        >
          {REPORTS_COPY.scanList.controls.clearFilters}
        </button>
      )}
    </div>
  );
}

function ScanRow({
  row,
  onOpenSummary,
}: {
  row: ScanListItemDto;
  onOpenSummary: (row: ScanListItemDto) => void;
}) {
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
      <td className="px-4 py-3">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenSummary(row)}>
            {REPORTS_COPY.scanList.actions.viewDetails}
          </Button>
          <Button variant="outline" size="sm" disabled>
            {REPORTS_COPY.scanList.actions.rerun}
          </Button>
          <Button variant="outline" size="sm" disabled>
            {REPORTS_COPY.scanList.actions.addToReport}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ScanSummaryDrawer({
  scan,
  onClose,
}: {
  scan: ScanListItemDto | null;
  onClose: () => void;
}) {
  if (!scan) return null;

  const copy = REPORTS_COPY.scanList.drawer;
  const completedAt = scan.completedAt
    ? formatScanDateTime(scan.completedAt)
    : REPORTS_COPY.scanList.analysisPending;

  return (
    <div className="fixed inset-0 z-50 bg-black/20" role="presentation" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-summary-drawer-title"
        className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-neutral-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-neutral-200 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {copy.titlePrefix}
            </p>
            <h2 id="scan-summary-drawer-title" className="mt-1 text-lg font-semibold">
              {`${copy.titlePrefix}: ${formatScanDateTime(scan.startedAt)}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-neutral-200 px-5 py-3">
          {[copy.summary, copy.platforms, copy.questions, copy.failures, copy.changes].map(
            (label, index) => (
              <Badge key={label} variant={index === 0 ? "secondary" : "outline"}>
                {label}
              </Badge>
            ),
          )}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <DrawerMeta label={copy.brand} value={scan.brandName} />
            <DrawerMeta label={copy.tracker} value={scan.trackerName} />
            <DrawerMeta label={copy.scanStatus} value={scan.scanStatus} />
            <DrawerMeta
              label={copy.analysisStatus}
              value={scan.analysisStatus ?? REPORTS_COPY.scanList.analysisPending}
            />
            <DrawerMeta label={copy.started} value={formatScanDateTime(scan.startedAt)} />
            <DrawerMeta label={copy.completed} value={completedAt} />
            <DrawerMeta label={copy.duration} value={formatScanDuration(scan)} />
            <DrawerMeta
              label={copy.checks}
              value={`${scan.completedCount.toLocaleString()}/${scan.scanCheckCount.toLocaleString()}`}
            />
            <DrawerMeta label={copy.failedChecks} value={scan.failedCount.toLocaleString()} />
          </div>

          <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            {copy.futureDetail}
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 p-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/scans/$scanRunId/results" params={{ scanRunId: scan.scanRunId }}>
              {REPORTS_COPY.scanList.actions.openEvidence}
            </Link>
          </Button>
          <Button variant="outline" size="sm" disabled>
            {REPORTS_COPY.scanList.actions.rerun}
          </Button>
          <Button variant="outline" size="sm" disabled>
            {REPORTS_COPY.scanList.actions.addToReport}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function DrawerMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-neutral-900">{value}</p>
    </div>
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
