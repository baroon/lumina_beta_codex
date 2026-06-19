import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import { PageHeader } from "@/components/molecules/PageHeader";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { BRANDS_COPY } from "@/content/brands";
import {
  deriveBrandTrackerInventory,
  type BrandTrackerInventoryItem,
} from "@/features/brands/brands";
import { useBrandTrackersList } from "@/features/brands/hooks/useBrandTrackersList";
import type { TrackerListItemDto } from "@/types/api";
import { useBrandsList } from "../hooks/useBrands";

export function BrandList() {
  const navigate = useNavigate();
  const brands = useBrandsList();
  const trackers = useBrandTrackersList();

  if (brands.isLoading || trackers.isLoading) return <LoadingPage />;

  const items = brands.data ?? [];
  const trackerRows = trackers.data ?? [];
  const inventory = deriveBrandTrackerInventory(items, trackerRows);
  const summary = {
    brands: items.length,
    trackers: trackerRows.length,
    activeTrackers: trackerRows.filter((tracker) => tracker.status === "Active").length,
    scans: trackerRows.reduce((sum, tracker) => sum + tracker.scanCount, 0),
  };

  return (
    <div className="mx-auto max-w-6xl p-4">
      <PageHeader title={BRANDS_COPY.list.title} description={BRANDS_COPY.list.description}>
        <Button onClick={() => navigate({ to: "/brands/new" })} className="gap-2">
          <Plus className="h-4 w-4" />
          {BRANDS_COPY.list.addBrand}
        </Button>
      </PageHeader>

      {items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center">
          <p className="text-sm text-neutral-500">{BRANDS_COPY.list.empty}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryTile
              label={BRANDS_COPY.list.summary.brands}
              value={summary.brands.toLocaleString()}
              helper={BRANDS_COPY.list.summary.brandsHelper}
            />
            <SummaryTile
              label={BRANDS_COPY.list.summary.trackers}
              value={summary.trackers.toLocaleString()}
              helper={BRANDS_COPY.list.summary.trackersHelper}
            />
            <SummaryTile
              label={BRANDS_COPY.list.summary.activeTrackers}
              value={summary.activeTrackers.toLocaleString()}
              helper={BRANDS_COPY.list.summary.activeTrackersHelper}
            />
            <SummaryTile
              label={BRANDS_COPY.list.summary.scans}
              value={summary.scans.toLocaleString()}
              helper={BRANDS_COPY.list.summary.scansHelper}
            />
          </div>

          <section aria-labelledby="brand-inventory-title">
            <Card>
              <CardContent className="p-5">
                <div>
                  <h2 id="brand-inventory-title" className="text-sm font-semibold text-neutral-900">
                    {BRANDS_COPY.list.inventory.title}
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    {BRANDS_COPY.list.inventory.description}
                  </p>
                </div>
                <div className="mt-4 divide-y divide-neutral-100 rounded-md border border-neutral-200">
                  {inventory.map((item) => (
                    <BrandInventoryRow key={item.brand.id} item={item} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      )}
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

function BrandInventoryRow({ item }: { item: BrandTrackerInventoryItem }) {
  const copy = BRANDS_COPY.list.inventory;
  return (
    <div className="p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/brands/$brandId/profile"
              params={{ brandId: item.brand.id }}
              className="truncate text-sm font-semibold text-neutral-900 hover:text-primary-700"
            >
              {item.brand.name}
            </Link>
            {item.brand.latestDiscovery && (
              <Badge
                variant={
                  item.brand.latestDiscovery.status === "Completed" ? "success" : "secondary"
                }
              >
                {item.brand.latestDiscovery.status}
              </Badge>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-neutral-500">{item.brand.websiteUrl}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-neutral-500 sm:grid-cols-4 lg:min-w-[420px]">
          <Metric label={copy.trackerCount} value={item.trackers.length.toLocaleString()} />
          <Metric label={copy.activeTrackers} value={item.activeTrackerCount.toLocaleString()} />
          <Metric label={copy.scans} value={item.totalScanCount.toLocaleString()} />
          <Metric
            label={copy.lastScan}
            value={
              item.latestScanCompletedAt
                ? formatShortDate(item.latestScanCompletedAt)
                : copy.noLastScan
            }
          />
        </div>
      </div>

      {item.trackers.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {item.trackers.map((tracker) => (
            <TrackerLink key={tracker.trackerId} tracker={tracker} />
          ))}
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-dashed border-neutral-300 px-3 py-2">
          <span className="text-xs text-neutral-500">{copy.noTrackers}</span>
          <Link
            to="/brands/$brandId/trackers/new"
            params={{ brandId: item.brand.id }}
            className="text-xs font-semibold text-primary-700 hover:text-primary-800"
          >
            {copy.createTracker}
          </Link>
        </div>
      )}
    </div>
  );
}

function TrackerLink({ tracker }: { tracker: TrackerListItemDto }) {
  return (
    <Link
      to="/brands/$brandId/trackers/$trackerId"
      params={{ brandId: tracker.brandId, trackerId: tracker.trackerId }}
      className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 px-3 py-2 text-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      <div className="min-w-0">
        <div className="truncate font-medium text-neutral-900">{tracker.name}</div>
        <div className="text-xs text-neutral-500">
          {tracker.scanCount.toLocaleString()} scans
          {tracker.latestScanCompletedAt
            ? ` - last ${formatShortDate(tracker.latestScanCompletedAt)}`
            : ""}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant={tracker.status === "Active" ? "success" : "secondary"}>
          {tracker.status}
        </Badge>
        <ArrowRight className="h-4 w-4 text-neutral-400" aria-hidden />
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-medium text-neutral-900">{value}</div>
      <div>{label}</div>
    </div>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}
