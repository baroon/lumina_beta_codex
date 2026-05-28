import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { ApiError } from "@/api/apiClient";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useAllTrackers } from "../hooks/useAllTrackers";
import { useRunScan } from "../hooks/useScans";

/**
 * Flat trackers index at /trackers — config view of every tracker in the
 * workspace. Phase 4 v3 retired the per-tracker dashboard; analytics live
 * on /overview now. Rows here are informational (name + brand + status +
 * counts) with a Run-now button on Active/Paused trackers.
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
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  {copy.columns.actions}
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
                  <td className="px-4 py-3 text-right">
                    <RunNowCell
                      trackerId={t.trackerId}
                      status={t.status}
                      onSuccess={() => void refetch()}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface RunNowCellProps {
  trackerId: string;
  status: string;
  onSuccess: () => void;
}

/**
 * Run-now button + inline feedback. Triggers a manual scan via the
 * existing useRunScan hook. Surfaces the 409 Conflict cooldown message
 * inline so the user sees why the click was rejected. Hidden for
 * Draft / Archived trackers — only Active / Paused trackers are runnable.
 */
function RunNowCell({ trackerId, status, onSuccess }: RunNowCellProps) {
  const copy = REPORTS_COPY.trackerList.runNow;
  const runnable = status === "Active" || status === "Paused";
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const runScan = useRunScan(trackerId);

  if (!runnable) {
    return <span className="text-xs text-neutral-400">{copy.notRunnable}</span>;
  }

  function handleClick() {
    setMessage(null);
    runScan.mutate(undefined, {
      onSuccess: () => {
        setMessage({ kind: "ok", text: copy.started });
        onSuccess();
      },
      onError: (e) => {
        const text = errorText(e) ?? copy.failed;
        setMessage({ kind: "err", text });
      },
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleClick}
        disabled={runScan.isPending}
        className="gap-1.5"
      >
        <RefreshCw className={runScan.isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
        {runScan.isPending ? copy.running : copy.button}
      </Button>
      {message && (
        <p
          className={
            message.kind === "err"
              ? "max-w-[16rem] text-right text-xs text-semantic-error-700"
              : "text-xs text-semantic-success-700"
          }
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

/**
 * Pulls the human-readable detail out of an ApiError message. The API
 * returns ProblemDetails JSON; if parsing fails we surface the raw body.
 */
function errorText(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  try {
    const parsed = JSON.parse(err.message) as { detail?: string; title?: string };
    return parsed.detail || parsed.title || err.message;
  } catch {
    return err.message;
  }
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
