import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Plus, Radar } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { DataTable } from "@/components/molecules/DataTable";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { TRACKERS_COPY } from "@/content/trackers";
import { useAllTrackers } from "@/features/trackers/hooks/useAllTrackers";
import {
  deriveTrackerAttentionItems,
  type TrackerAttentionItem,
} from "@/features/trackers/trackers";
import { cn } from "@/lib/utils";
import type { TrackerListItemDto } from "@/types/api";

interface BrandTrackerSummary {
  brandId: string;
  brandName: string;
  trackerCount: number;
  activeCount: number;
  scanCount: number;
}

const EMPTY_TRACKER_ROWS: TrackerListItemDto[] = [];

export function TrackersScreen() {
  const copy = TRACKERS_COPY.list;
  const trackers = useAllTrackers();
  const rows = trackers.data ?? EMPTY_TRACKER_ROWS;
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const statusCounts = useMemo(() => countTrackerStatuses(rows), [rows]);
  const statusOptions = useMemo(() => Array.from(statusCounts.keys()).sort(), [statusCounts]);
  const filteredRows = useMemo(
    () => rows.filter((tracker) => statusFilter === null || tracker.status === statusFilter),
    [rows, statusFilter],
  );
  const brandSummaries = useMemo(() => summarizeBrands(filteredRows), [filteredRows]);
  const attentionItems = useMemo(() => deriveTrackerAttentionItems(filteredRows), [filteredRows]);
  const columns = useMemo<ColumnDef<TrackerListItemDto, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: copy.table.tracker,
        cell: ({ row }) => (
          <Link
            to="/brands/$brandId/trackers/$trackerId"
            params={{ brandId: row.original.brandId, trackerId: row.original.trackerId }}
            className="font-medium text-neutral-900 hover:text-primary-700"
          >
            {row.original.name}
          </Link>
        ),
        meta: { cellClassName: "min-w-64" },
      },
      {
        accessorKey: "brandName",
        header: copy.table.brand,
        cell: ({ row }) => (
          <Link
            to="/brands/$brandId/profile"
            params={{ brandId: row.original.brandId }}
            className="text-neutral-700 hover:text-primary-700"
          >
            {row.original.brandName}
          </Link>
        ),
      },
      {
        accessorKey: "status",
        header: copy.table.status,
        cell: ({ row }) => <TrackerStatus status={row.original.status} />,
      },
      {
        accessorKey: "scanCount",
        header: copy.table.scans,
        cell: ({ row }) => row.original.scanCount.toLocaleString(),
        meta: { align: "right", cellClassName: "w-24" },
      },
      {
        accessorKey: "latestScanCompletedAt",
        header: copy.table.latestScan,
        cell: ({ row }) =>
          formatLatestScan(row.original.latestScanCompletedAt, copy.table.neverScanned),
      },
      {
        id: "open",
        header: copy.table.action,
        enableSorting: false,
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="sm">
            <Link
              to="/brands/$brandId/trackers/$trackerId"
              params={{ brandId: row.original.brandId, trackerId: row.original.trackerId }}
            >
              {copy.table.open}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        ),
        meta: { align: "right", cellClassName: "w-28" },
      },
    ],
    [copy],
  );

  if (trackers.isLoading) return <LoadingPage />;
  if (trackers.isError) {
    return (
      <ErrorPage
        error={trackers.error instanceof Error ? trackers.error : undefined}
        onReset={() => void trackers.refetch()}
      />
    );
  }

  const activeCount = filteredRows.filter((tracker) => isActiveTracker(tracker.status)).length;
  const totalScans = filteredRows.reduce((sum, tracker) => sum + tracker.scanCount, 0);
  const emptyMessage = statusFilter === null ? copy.empty : copy.emptyFiltered;

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.description}>
        <Button asChild size="sm">
          <Link to="/brands/new">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {copy.actions.newBrand}
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile
          label={copy.summary.total}
          value={filteredRows.length.toLocaleString()}
          helper={copy.summary.totalHelper}
        />
        <SummaryTile
          label={copy.summary.active}
          value={activeCount.toLocaleString()}
          helper={copy.summary.activeHelper}
        />
        <SummaryTile
          label={copy.summary.brands}
          value={brandSummaries.length.toLocaleString()}
          helper={copy.summary.brandsHelper}
        />
        <SummaryTile
          label={copy.summary.scans}
          value={totalScans.toLocaleString()}
          helper={copy.summary.scansHelper}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
        <StatusFilterPill
          label={copy.filters.allStatuses}
          count={rows.length}
          active={statusFilter === null}
          onClick={() => setStatusFilter(null)}
        />
        {statusOptions.map((status) => (
          <StatusFilterPill
            key={status}
            label={status}
            count={statusCounts.get(status) ?? 0}
            active={statusFilter === status}
            onClick={() => setStatusFilter((current) => (current === status ? null : status))}
          />
        ))}
        {statusFilter !== null && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter(null)}>
            {copy.filters.clear}
          </Button>
        )}
      </div>

      <TrackerAttentionSection items={attentionItems} />

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                {copy.sections.brandHealth}
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                {copy.sections.brandHealthDescription}
              </p>
            </div>
          </div>
          {brandSummaries.length > 0 ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {brandSummaries.map((brand) => (
                <BrandSummaryCard key={brand.brandId} brand={brand} />
              ))}
            </div>
          ) : (
            <EmptyState message={emptyMessage} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-900">{copy.sections.trackerTable}</h2>
            <p className="mt-1 text-xs text-neutral-500">{copy.sections.trackerTableDescription}</p>
          </div>
          <DataTable
            columns={columns}
            data={filteredRows}
            getRowId={(tracker) => tracker.trackerId}
            initialSorting={[{ id: "latestScanCompletedAt", desc: true }]}
            emptyMessage={<EmptyState message={emptyMessage} />}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusFilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-primary-300 bg-primary-50 text-primary-800"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-primary-200 hover:text-primary-700",
      )}
    >
      <span>{label}</span>
      <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-neutral-500">
        {count.toLocaleString()}
      </span>
    </button>
  );
}

function TrackerAttentionSection({ items }: { items: readonly TrackerAttentionItem[] }) {
  const copy = TRACKERS_COPY.list;
  return (
    <section aria-labelledby="tracker-attention-title">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="tracker-attention-title" className="text-sm font-semibold text-neutral-900">
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
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.trackerId}
                  className="flex min-h-32 flex-col rounded-md border border-neutral-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-500">{item.brandName}</p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-900">
                        {item.trackerName}
                      </h3>
                      <p className="mt-1 text-xs text-neutral-500">{item.reason}</p>
                    </div>
                    <Badge variant={item.priority === "High" ? "destructive" : "warning"}>
                      {item.priority}
                    </Badge>
                  </div>
                  <div className="mt-auto flex justify-end pt-4">
                    <Button asChild variant="ghost" size="sm">
                      <Link
                        to="/brands/$brandId/trackers/$trackerId"
                        params={{ brandId: item.brandId, trackerId: item.trackerId }}
                      >
                        {item.action}
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

function BrandSummaryCard({ brand }: { brand: BrandTrackerSummary }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">{brand.brandName}</h3>
          <p className="mt-1 text-xs text-neutral-500">
            {brand.trackerCount.toLocaleString()} trackers, {brand.scanCount.toLocaleString()} scans
          </p>
        </div>
        <Badge variant={brand.activeCount > 0 ? "success" : "secondary"}>
          {brand.activeCount.toLocaleString()} active
        </Badge>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-primary-600"
          style={{ width: `${Math.round((brand.activeCount / brand.trackerCount) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function TrackerStatus({ status }: { status: string }) {
  if (isActiveTracker(status)) return <Badge variant="success">{status}</Badge>;
  if (status.toLowerCase() === "paused") return <Badge variant="warning">{status}</Badge>;
  if (status.toLowerCase() === "archived") return <Badge variant="secondary">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-3 py-8 text-center">
      <Radar className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-500">{message}</p>
    </div>
  );
}

function summarizeBrands(trackers: readonly TrackerListItemDto[]): BrandTrackerSummary[] {
  const byBrand = new Map<string, BrandTrackerSummary>();
  for (const tracker of trackers) {
    const existing = byBrand.get(tracker.brandId);
    const summary =
      existing ??
      ({
        brandId: tracker.brandId,
        brandName: tracker.brandName,
        trackerCount: 0,
        activeCount: 0,
        scanCount: 0,
      } satisfies BrandTrackerSummary);
    summary.trackerCount += 1;
    summary.scanCount += tracker.scanCount;
    if (isActiveTracker(tracker.status)) summary.activeCount += 1;
    byBrand.set(tracker.brandId, summary);
  }
  return Array.from(byBrand.values()).sort((a, b) => a.brandName.localeCompare(b.brandName));
}

function countTrackerStatuses(trackers: readonly TrackerListItemDto[]) {
  const counts = new Map<string, number>();
  for (const tracker of trackers) {
    counts.set(tracker.status, (counts.get(tracker.status) ?? 0) + 1);
  }
  return counts;
}

function isActiveTracker(status: string) {
  return status.toLowerCase() === "active";
}

function formatLatestScan(value: string | null, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
