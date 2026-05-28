import { Check, PieChart, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/atoms/card";
import { TRACKERS_COPY } from "@/content/trackers";
import { useLatestScan } from "../hooks/useScans";

interface ScanProgressScreenProps {
  trackerId: string;
}

export function ScanProgressScreen({ trackerId }: ScanProgressScreenProps) {
  const scan = useLatestScan(trackerId, true);
  const data = scan.data;

  const done = data ? data.completedCount + data.failedCount : 0;
  const total = data?.scanCheckCount ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = data?.status === "Completed" || data?.status === "Failed";

  if (isComplete && data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-semantic-success-100 text-semantic-success-600">
              <Check className="h-6 w-6" />
            </div>
            <CardTitle>{TRACKERS_COPY.scan.completeTitle}</CardTitle>
            <CardDescription>
              {data.failedCount > 0
                ? TRACKERS_COPY.scan.completeWithFailures
                    .replace("{completed}", String(data.completedCount))
                    .replace("{failed}", String(data.failedCount))
                : TRACKERS_COPY.scan.completeDescription.replace(
                    "{completed}",
                    String(data.completedCount),
                  )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/overview" className="inline-flex items-center gap-2">
                <PieChart className="h-4 w-4" aria-hidden="true" />
                {TRACKERS_COPY.scan.openOverview}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
          <CardTitle>{TRACKERS_COPY.scan.running}</CardTitle>
          <CardDescription>
            {TRACKERS_COPY.scan.runningDetail
              .replace("{done}", String(done))
              .replace("{total}", String(total))}
          </CardDescription>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
