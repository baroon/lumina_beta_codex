import { Badge } from "@/components/atoms/badge";
import { Progress } from "@/components/atoms/progress";
import type { ScanStatus } from "@/types/api";

export function ScanProgressPanel({
  scan,
  isStarting,
  isError,
}: {
  scan: ScanStatus | undefined;
  isStarting: boolean;
  isError: boolean;
}) {
  const total = scan?.scanCheckCount ?? 0;
  const completed = scan ? scan.completedCount + scan.failedCount : 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const done = scan?.status === "Completed";
  const failed = scan?.status === "Failed";

  return (
    <div className="space-y-4">
      {isError && (
        <div
          role="alert"
          className="rounded-md bg-semantic-error-50 p-3 text-xs text-semantic-error-700"
        >
          Could not start or refresh this scan. Try again from the tracker header.
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span>
            {scan
              ? `${completed} of ${total} checks finished`
              : isStarting
                ? "Preparing checks"
                : "Waiting for scan status"}
          </span>
          <span>{progress}%</span>
        </div>
        <Progress
          value={progress}
          progressSize="sm"
          variant={failed ? "error" : done ? "success" : "default"}
        />
      </div>

      {scan && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <ScanCounter label="Mentions" value={scan.liveCounters.mentions} />
            <ScanCounter label="Citations" value={scan.liveCounters.citations} />
            <ScanCounter label="Recommended" value={scan.liveCounters.recommended} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Platforms
            </h3>
            <ul className="space-y-2">
              {scan.platforms.map((platform) => {
                const platformFinished = platform.completed + platform.failed;
                return (
                  <li
                    key={platform.platformId}
                    className="rounded-md border border-neutral-200 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-neutral-900">{platform.name}</span>
                      <Badge
                        variant={platform.status === "Failed" ? "destructive" : "secondary"}
                        className="text-[10px] uppercase"
                      >
                        {platform.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      {platformFinished} of {platform.total} checks finished
                      {platform.failed > 0 && `, ${platform.failed} failed`}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function ScanCounter({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="text-lg font-semibold text-neutral-900">{value.toLocaleString()}</div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
    </div>
  );
}
