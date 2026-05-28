import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useAllTrackers } from "@/features/reports/hooks/useAllTrackers";

/**
 * Flat trackers index at /trackers — config view of every tracker in the
 * workspace. Phase 4 v3 retired the per-tracker dashboard; analytics live
 * on /overview now, so the rows here are purely informational (name +
 * brand + status + counts). Pagination layers on later if needed.
 */
export function TrackerListScreen() {
  const { data, isLoading, isError, error, refetch } = useAllTrackers();
  const copy = REPORTS_COPY.trackerList;

  if (isLoading) return <LoadingPage />;

  if (isError) {
    return (
      <ErrorPage
        error={error instanceof Error ? error : undefined}
        onReset={() => void refetch()}
      />
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader title={copy.title} description={copy.subtitle} />

      {data.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-neutral-600">
            {copy.empty}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-surface-card">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {copy.columns.name}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {copy.columns.brand}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {copy.columns.status}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  {copy.columns.scans}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {copy.columns.latestScan}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {copy.columns.created}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.map((t) => (
                <tr key={t.trackerId}>
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">{t.name}</td>
                  <td className="px-4 py-3 text-neutral-700">{t.brandName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-900">
                    {t.scanCount}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {t.latestScanCompletedAt ? formatDateTime(t.latestScanCompletedAt) : copy.never}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{formatDateTime(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "Active"
      ? "success"
      : status === "Paused"
        ? "warning"
        : status === "Archived"
          ? "secondary"
          : "outline"; // Draft + anything else
  return <Badge variant={variant}>{status}</Badge>;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
