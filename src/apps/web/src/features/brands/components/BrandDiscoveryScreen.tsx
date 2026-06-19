import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Compass, Plus } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { DataTable } from "@/components/molecules/DataTable";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { BRANDS_COPY } from "@/content/brands";
import {
  deriveBrandDiscoveryAttentionItems,
  type BrandDiscoveryAttentionItem,
} from "@/features/brands/brands";
import { useBrandsList } from "@/features/brands/hooks/useBrands";
import { cn } from "@/lib/utils";
import type { BrandDto, DiscoveryStatus } from "@/types/api";

const EMPTY_BRAND_ROWS: readonly BrandDto[] = [];

export function BrandDiscoveryScreen() {
  const copy = BRANDS_COPY.discoveryHub;
  const brands = useBrandsList();
  const rows = brands.data ?? EMPTY_BRAND_ROWS;
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const statusCounts = useMemo(() => countDiscoveryStatuses(rows), [rows]);
  const statusOptions = useMemo(() => Array.from(statusCounts.keys()).sort(), [statusCounts]);
  const filteredRows = useMemo(
    () =>
      rows.filter((brand) => statusFilter === null || discoveryStatusLabel(brand) === statusFilter),
    [rows, statusFilter],
  );
  const attentionItems = useMemo(
    () => deriveBrandDiscoveryAttentionItems(filteredRows),
    [filteredRows],
  );

  const columns = useMemo<ColumnDef<BrandDto, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: copy.table.brand,
        cell: ({ row }) => (
          <Link
            to="/brands/$brandId/profile"
            params={{ brandId: row.original.id }}
            className="font-medium text-neutral-900 hover:text-primary-700"
          >
            {row.original.name}
          </Link>
        ),
        meta: { cellClassName: "min-w-56" },
      },
      {
        accessorKey: "websiteUrl",
        header: copy.table.website,
        cell: ({ row }) => (
          <span className="max-w-xs truncate text-neutral-600">{row.original.websiteUrl}</span>
        ),
      },
      {
        id: "status",
        header: copy.table.status,
        cell: ({ row }) => <DiscoveryStatusBadge status={row.original.latestDiscovery?.status} />,
      },
      {
        id: "pages",
        header: copy.table.pages,
        cell: ({ row }) => (row.original.latestDiscovery?.pagesCrawled ?? 0).toLocaleString(),
        meta: { align: "right", cellClassName: "w-24" },
      },
      {
        id: "lastRun",
        header: copy.table.lastRun,
        cell: ({ row }) =>
          formatDate(
            row.original.latestDiscovery?.completedAt ?? row.original.latestDiscovery?.startedAt,
          ),
      },
      {
        id: "action",
        header: copy.table.action,
        enableSorting: false,
        cell: ({ row }) => {
          const needsReview = row.original.latestDiscovery?.status !== "Completed";
          return (
            <Button asChild variant="ghost" size="sm">
              <Link
                to={needsReview ? "/brands/$brandId/discovery" : "/brands/$brandId/profile"}
                params={{ brandId: row.original.id }}
              >
                {needsReview ? copy.actions.continueDiscovery : copy.actions.openProfile}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          );
        },
        meta: { align: "right", cellClassName: "w-44" },
      },
    ],
    [copy],
  );

  if (brands.isLoading) return <LoadingPage />;
  if (brands.isError) {
    return (
      <ErrorPage
        error={brands.error instanceof Error ? brands.error : undefined}
        onReset={() => void brands.refetch()}
      />
    );
  }

  const completed = filteredRows.filter(
    (brand) => brand.latestDiscovery?.status === "Completed",
  ).length;
  const pending = filteredRows.filter(
    (brand) => brand.latestDiscovery?.status === "AwaitingConfirmation",
  ).length;
  const pages = filteredRows.reduce(
    (sum, brand) => sum + (brand.latestDiscovery?.pagesCrawled ?? 0),
    0,
  );
  const emptyMessage = statusFilter === null ? copy.table.empty : copy.filters.empty;

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.description}>
        <Button asChild size="sm">
          <Link to="/brands/new">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {copy.actions.addBrand}
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile
          label={copy.summary.brands}
          value={filteredRows.length.toLocaleString()}
          helper={copy.summary.brandsHelper}
        />
        <SummaryTile
          label={copy.summary.completed}
          value={completed.toLocaleString()}
          helper={copy.summary.completedHelper}
        />
        <SummaryTile
          label={copy.summary.pending}
          value={pending.toLocaleString()}
          helper={copy.summary.pendingHelper}
        />
        <SummaryTile
          label={copy.summary.pages}
          value={pages.toLocaleString()}
          helper={copy.summary.pagesHelper}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
        <DiscoveryStatusFilterPill
          label={copy.filters.allStatuses}
          count={rows.length}
          active={statusFilter === null}
          onClick={() => setStatusFilter(null)}
        />
        {statusOptions.map((status) => (
          <DiscoveryStatusFilterPill
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

      <DiscoveryAttentionSection items={attentionItems} />

      <Card>
        <CardContent className="p-5">
          <DataTable
            columns={columns}
            data={filteredRows}
            getRowId={(row) => row.id}
            initialSorting={[{ id: "name", desc: false }]}
            emptyMessage={<BrandDiscoveryEmptyState message={emptyMessage} />}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function DiscoveryStatusFilterPill({
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

function DiscoveryAttentionSection({ items }: { items: readonly BrandDiscoveryAttentionItem[] }) {
  const copy = BRANDS_COPY.discoveryHub;
  return (
    <section aria-labelledby="discovery-attention-title">
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="discovery-attention-title" className="text-sm font-semibold text-neutral-900">
                {copy.attention.title}
              </h2>
              <p className="mt-1 text-xs text-neutral-500">{copy.attention.description}</p>
            </div>
            <Badge variant={items.length === 0 ? "success" : "warning"}>
              {items.length.toLocaleString()}
            </Badge>
          </div>
          {items.length === 0 ? (
            <p className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              {copy.attention.empty}
            </p>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.brandId}
                  className="flex min-h-32 flex-col rounded-md border border-neutral-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-neutral-900">{item.brandName}</h3>
                      <p className="mt-1 truncate text-xs text-neutral-500">{item.websiteUrl}</p>
                      <p className="mt-2 text-xs text-neutral-500">{item.reason}</p>
                    </div>
                    <Badge variant={item.priority === "High" ? "destructive" : "warning"}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-auto flex justify-end pt-4">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/brands/$brandId/discovery" params={{ brandId: item.brandId }}>
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

function DiscoveryStatusBadge({ status }: { status?: DiscoveryStatus }) {
  const label = status ?? BRANDS_COPY.discoveryHub.table.notStarted;
  if (status === "Completed") return <Badge variant="success">{label}</Badge>;
  if (status === "Failed") return <Badge variant="destructive">{label}</Badge>;
  if (status === "AwaitingConfirmation") return <Badge variant="warning">{label}</Badge>;
  return <Badge variant="secondary">{label}</Badge>;
}

function BrandDiscoveryEmptyState({
  message = BRANDS_COPY.discoveryHub.table.empty,
}: {
  message?: string;
}) {
  return (
    <div className="px-3 py-8 text-center">
      <Compass className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-500">{message}</p>
    </div>
  );
}

function countDiscoveryStatuses(rows: readonly BrandDto[]) {
  const counts = new Map<string, number>();
  for (const brand of rows) {
    const status = discoveryStatusLabel(brand);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return counts;
}

function discoveryStatusLabel(brand: BrandDto) {
  return brand.latestDiscovery?.status ?? BRANDS_COPY.discoveryHub.table.notStarted;
}

function formatDate(value: string | null | undefined) {
  if (!value) return BRANDS_COPY.discoveryHub.table.notCompleted;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
