import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, FilePlus, FileText, ScanSearch } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { Progress } from "@/components/atoms/progress";
import { DataTable } from "@/components/molecules/DataTable";
import {
  DateRangePicker,
  defaultDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { LENSES_COPY, VISIBILITY_LENSES } from "@/content/lenses";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { cn } from "@/lib/utils";
import { useLensCounts } from "@/features/reports/hooks/useLensCounts";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import {
  buildLensRows,
  countLensRowsByStatus,
  deriveLensAttentionItems,
  filterLensRows,
  type LensAttentionItem,
  type LensRow,
  type LensStatus,
} from "@/features/reports/lenses";

export function LensesScreen() {
  const copy = LENSES_COPY.page;
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);
  const [statusFilter, setStatusFilter] = useState<LensStatus | null>(null);
  const [reportQueued, setReportQueued] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const overview = useWorkspaceOverview(range, [], [], [], [], [], trackerIds);
  const lensCounts = useLensCounts(range);
  const rows = useMemo(() => buildLensRows(lensCounts.data ?? []), [lensCounts.data]);
  const filteredRows = useMemo(() => filterLensRows(rows, statusFilter), [rows, statusFilter]);
  const statusCounts = useMemo(() => countLensRowsByStatus(rows), [rows]);
  const attentionItems = useMemo(() => deriveLensAttentionItems(rows), [rows]);

  const columns = useMemo<ColumnDef<LensRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: copy.table.lens,
        cell: ({ row }) => (
          <Link to="/lenses/$lensId" params={{ lensId: row.original.slug }} className="text-left">
            <span className="font-medium text-neutral-900 hover:text-primary-700">
              {row.original.name}
            </span>
            <span className="mt-0.5 block max-w-xl text-xs text-neutral-500">
              {row.original.description}
            </span>
          </Link>
        ),
        meta: { cellClassName: "min-w-72" },
      },
      {
        accessorKey: "primaryMetric",
        header: copy.table.primaryMetric,
        cell: ({ row }) => <Badge variant="outline">{row.original.primaryMetric}</Badge>,
      },
      {
        accessorKey: "mentionCount",
        header: copy.table.mentions,
        cell: ({ row }) => row.original.mentionCount.toLocaleString(),
        meta: { align: "right", cellClassName: "w-28" },
      },
      {
        accessorKey: "share",
        header: copy.table.share,
        cell: ({ row }) => (
          <div className="min-w-36 space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium tabular-nums text-neutral-900">
                {formatRate(row.original.share)}
              </span>
              <span className="text-neutral-500">
                {row.original.mentionCount} {copy.table.mentionUnit}
              </span>
            </div>
            <Progress value={row.original.share * 100} progressSize="sm" />
          </div>
        ),
        meta: { className: "min-w-44" },
      },
      {
        id: "status",
        header: copy.table.status,
        cell: ({ row }) => <LensStatusBadge row={row.original} />,
      },
      {
        id: "open",
        header: copy.table.action,
        enableSorting: false,
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="sm">
            <Link to="/lenses/$lensId" params={{ lensId: row.original.slug }}>
              {copy.actions.open}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        ),
        meta: { align: "right", cellClassName: "w-32" },
      },
    ],
    [copy],
  );

  if (overview.isLoading) return <LoadingPage />;
  if (overview.isError) {
    return (
      <ErrorPage
        error={overview.error instanceof Error ? overview.error : undefined}
        onReset={() => void overview.refetch()}
      />
    );
  }
  if (!overview.data) return null;

  const totalLensMentions = filteredRows.reduce((sum, row) => sum + row.mentionCount, 0);
  const filteredLensCount = filteredRows.length.toLocaleString();

  function addLensBriefToReport() {
    setReportQueued(true);
    setExportNotice(copy.notice.report.replace("{count}", filteredLensCount));
  }

  function exportLensBrief() {
    exportLensRows(filteredRows, range);
    setExportNotice(copy.notice.exported.replace("{count}", filteredLensCount));
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.description}>
        <Button variant="outline" size="sm" disabled={reportQueued} onClick={addLensBriefToReport}>
          <FilePlus className="h-3.5 w-3.5" aria-hidden />
          {reportQueued ? copy.actions.addedToReport : copy.actions.addToReport}
        </Button>
        <Button variant="outline" size="sm" onClick={exportLensBrief}>
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {copy.actions.export}
        </Button>
      </PageHeader>

      {exportNotice && (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-800">
          {exportNotice}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
        <DateRangePicker value={range} onChange={setRange} />
        <LensStatusFilterPills
          counts={statusCounts}
          selected={statusFilter}
          onSelect={(status) => setStatusFilter((current) => (current === status ? null : status))}
        />
        {statusFilter && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter(null)}>
            Clear filters
          </Button>
        )}
        {lensCounts.isError && (
          <span className="text-xs text-semantic-warning-700">
            {copy.controls.countsUnavailable}
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile
          label={copy.summary.lenses}
          value={VISIBILITY_LENSES.length.toLocaleString()}
          helper={copy.summary.lensesHelper}
        />
        <SummaryTile
          label={copy.summary.questions}
          value={overview.data.hero.queries.toLocaleString()}
          helper={copy.summary.questionsHelper}
        />
        <SummaryTile
          label={copy.summary.mentions}
          value={overview.data.hero.mentions.toLocaleString()}
          helper={copy.summary.mentionsHelper}
        />
        <SummaryTile
          label={copy.summary.citations}
          value={overview.data.hero.citations.toLocaleString()}
          helper={copy.summary.citationsHelper}
        />
      </div>

      <LensAttentionSection items={attentionItems} />

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">{copy.table.lens}</h2>
              <p className="mt-1 text-xs text-neutral-500">
                {copy.table.mentionSummary.replace("{count}", totalLensMentions.toLocaleString())}
              </p>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={filteredRows}
            getRowId={(row) => row.code}
            initialSorting={[{ id: "mentionCount", desc: true }]}
            emptyMessage={statusFilter ? <FilteredLensesEmptyState /> : <LensesEmptyState />}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function LensAttentionSection({ items }: { items: readonly LensAttentionItem[] }) {
  const copy = LENSES_COPY.page.attention;
  return (
    <section aria-labelledby="lens-attention-title">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="lens-attention-title" className="text-sm font-semibold text-neutral-900">
                {copy.title}
              </h2>
              <p className="mt-1 text-xs text-neutral-500">{copy.description}</p>
            </div>
            <Badge variant={items.length === 0 ? "success" : "warning"}>
              {items.length.toLocaleString()}
            </Badge>
          </div>
          {items.length === 0 ? (
            <p className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              {copy.empty}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.code}
                  className="flex min-h-36 flex-col rounded-md border border-neutral-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-900">{item.name}</h3>
                      <p className="mt-1 text-xs text-neutral-500">{item.reason}</p>
                    </div>
                    <Badge variant={item.priority === "High" ? "destructive" : "warning"}>
                      {copy.priority}: {item.priority}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.status}</Badge>
                    <Badge variant="secondary">{item.action}</Badge>
                  </div>
                  <div className="mt-auto flex justify-end pt-4">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/lenses/$lensId" params={{ lensId: item.slug }}>
                        {copy.openLens}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
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

function SummaryTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
        <p className="mt-1 text-xs text-neutral-500">{helper}</p>
      </CardContent>
    </Card>
  );
}

function LensStatusBadge({ row }: { row: LensRow }) {
  const copy = LENSES_COPY.page.status;
  if (row.mentionCount === 0) return <Badge variant="secondary">{copy.empty}</Badge>;
  if (row.share < 0.1) return <Badge variant="warning">{copy.sparse}</Badge>;
  return <Badge variant="success">{copy.healthy}</Badge>;
}

function exportLensRows(rows: readonly LensRow[], range: DateRangeSelection) {
  const payload = JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      dateRange: serializeDateRange(range),
      lensCount: rows.length,
      lenses: rows.map((row) => ({
        code: row.code,
        name: row.name,
        description: row.description,
        primaryMetric: row.primaryMetric,
        mentionCount: row.mentionCount,
        share: row.share,
        status: row.status,
      })),
    },
    null,
    2,
  );
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `lens-brief-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function serializeDateRange(range: DateRangeSelection) {
  switch (range.kind) {
    case "preset":
      return { kind: "preset", days: range.days };
    case "custom":
      return {
        kind: "custom",
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      };
    case "all":
      return { kind: "all" };
  }
}

function LensStatusFilterPills({
  counts,
  selected,
  onSelect,
}: {
  counts: Record<LensStatus, number>;
  selected: LensStatus | null;
  onSelect: (status: LensStatus) => void;
}) {
  const statuses: readonly LensStatus[] = ["Healthy", "Sparse", "No evidence"];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {statuses.map((status) => (
        <FilterPill
          key={status}
          label={status}
          count={counts[status]}
          selected={selected === status}
          onClick={() => onSelect(status)}
        />
      ))}
    </div>
  );
}

function FilterPill({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  if (count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition",
        selected
          ? "border-primary-600 bg-primary-100 text-primary-700"
          : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums text-neutral-400">{count}</span>
    </button>
  );
}

function LensesEmptyState() {
  return (
    <div className="p-5 text-center">
      <ScanSearch className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-500">
        {LENSES_COPY.page.table.empty}
      </p>
    </div>
  );
}

function FilteredLensesEmptyState() {
  return (
    <div className="p-5 text-center">
      <ScanSearch className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-500">
        {LENSES_COPY.page.table.filteredEmpty}
      </p>
    </div>
  );
}

function formatRate(value: number) {
  return `${Math.round(value * 100)}%`;
}
