import { useMemo } from "react";
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
import { useBrandsList } from "@/features/brands/hooks/useBrands";
import type { BrandDto, DiscoveryStatus } from "@/types/api";

export function BrandDiscoveryScreen() {
  const copy = BRANDS_COPY.discoveryHub;
  const brands = useBrandsList();
  const rows = brands.data ?? [];

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

  const completed = rows.filter((brand) => brand.latestDiscovery?.status === "Completed").length;
  const pending = rows.filter(
    (brand) => brand.latestDiscovery?.status === "AwaitingConfirmation",
  ).length;
  const pages = rows.reduce((sum, brand) => sum + (brand.latestDiscovery?.pagesCrawled ?? 0), 0);

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
          value={rows.length.toLocaleString()}
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

      <Card>
        <CardContent className="p-5">
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            initialSorting={[{ id: "name", desc: false }]}
            emptyMessage={<BrandDiscoveryEmptyState />}
          />
        </CardContent>
      </Card>
    </div>
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

function BrandDiscoveryEmptyState() {
  return (
    <div className="px-3 py-8 text-center">
      <Compass className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-500">
        {BRANDS_COPY.discoveryHub.table.empty}
      </p>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return BRANDS_COPY.discoveryHub.table.notCompleted;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
