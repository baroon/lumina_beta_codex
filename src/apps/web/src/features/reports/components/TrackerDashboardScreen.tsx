import { ApiError } from "@/api/apiClient";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { LineChartWrapper, type LineChartPoint } from "@/components/charts/LineChartWrapper";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useTrackerTrend } from "@/features/reports/hooks/useTrackerTrend";
import { cn } from "@/lib/utils";
import type { TrendPointDto, TrendSeriesDto } from "@/types/api";

interface TrackerDashboardScreenProps {
  trackerId: string;
}

/**
 * Visibility Tracker dashboard (Phase 4 Slice 6). Renders the 6-metric
 * trend grid for a tracker over a rolling window (default 30 days).
 * Each numeric metric gets a small LineChartWrapper; the categorical
 * sentiment metric gets a colored-dot strip.
 *
 * v1 ships with the Trend section only — ADR-004's other dashboard
 * sections (Latest scan summary, Recent scan runs, Platform/Topic trend)
 * are deferred to a follow-up so this slice stays focused on the
 * trend-over-time surface the user asked for.
 */
export function TrackerDashboardScreen({ trackerId }: TrackerDashboardScreenProps) {
  const { data, isLoading, isError, error, refetch } = useTrackerTrend(trackerId, 30);
  const copy = REPORTS_COPY.dashboard;

  if (isLoading) return <LoadingPage />;

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-sm text-neutral-600">
            {copy.empty.notFound}
          </CardContent>
        </Card>
      );
    }
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
      <PageHeader
        title={copy.title}
        description={copy.subtitle.replace("{days}", String(data.days))}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.series.map((series) => (
          <TrendCard key={series.metricName} series={series} />
        ))}
      </div>

      {data.series.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-neutral-600">
            {copy.empty.noTrendData}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// One card per metric — numeric → line, categorical → dot strip
// ---------------------------------------------------------------------------

const METRIC_LABELS: Record<string, string> = {
  BrandMentionRate: "Brand mention rate",
  BrandRecommendationRate: "Recommendation rate",
  BrandShareOfVoice: "Share of voice",
  AverageBrandRank: "Average brand rank",
  OwnedCitationShare: "Owned citation share",
  OverallSentiment: "Overall sentiment",
};

interface TrendCardProps {
  series: TrendSeriesDto;
}

function TrendCard({ series }: TrendCardProps) {
  const label = METRIC_LABELS[series.metricName] ?? series.metricName;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-neutral-700">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {series.seriesKind === "Categorical" ? (
          <CategoricalStrip points={series.points} />
        ) : (
          <NumericLine metricName={series.metricName} points={series.points} />
        )}
      </CardContent>
    </Card>
  );
}

interface NumericLineProps {
  metricName: string;
  points: readonly TrendPointDto[];
}

/**
 * Line chart for a numeric metric. AverageBrandRank is the only one that
 * isn't a [0,1] rate — for the others we lock the Y axis to [0, 1] and
 * format as percent. Rank lets the axis auto-scale and renders as a plain
 * decimal.
 */
function NumericLine({ metricName, points }: NumericLineProps) {
  const isRate = metricName !== "AverageBrandRank";
  const data: LineChartPoint[] = points.map((p) => ({
    x: formatShortDate(p.capturedAt),
    y: p.value,
  }));

  if (data.length === 0) {
    return <p className="text-sm text-neutral-500">{REPORTS_COPY.dashboard.empty.noTrendData}</p>;
  }

  return (
    <LineChartWrapper
      data={data}
      maxValue={isRate ? 1 : undefined}
      formatValue={isRate ? (v) => `${Math.round(v * 100)}%` : (v) => v.toFixed(1)}
      height={160}
    />
  );
}

interface CategoricalStripProps {
  points: readonly TrendPointDto[];
}

/**
 * Color-coded dot strip for the OverallSentiment series. One dot per scan,
 * colored by sentiment value. Hover surfaces the date + sentiment.
 */
function CategoricalStrip({ points }: CategoricalStripProps) {
  if (points.length === 0) {
    return <p className="text-sm text-neutral-500">{REPORTS_COPY.dashboard.empty.noTrendData}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        {points.map((p) => (
          <div
            key={p.scanRunId}
            className="flex flex-col items-center gap-1"
            title={`${formatShortDate(p.capturedAt)} — ${p.category ?? "Unknown"}`}
          >
            <span className={cn("h-4 w-4 rounded-full border", sentimentColor(p.category))} />
            <span className="text-[10px] text-neutral-500">{formatShortDate(p.capturedAt)}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-2">
        {distinct(points.map((p) => p.category)).map((sentiment) => (
          <Badge
            key={sentiment ?? "unknown"}
            variant="secondary"
            className={cn("text-xs", sentimentBadgeColor(sentiment))}
          >
            {sentiment ?? "Unknown"}
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function distinct<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

/**
 * Sentiment color mapping. Uses semantic-token classes so the legend
 * matches the dot strip — keeps the colors in sync with the design system
 * without hardcoding hex values.
 */
function sentimentColor(sentiment: string | null): string {
  switch (sentiment) {
    case "Positive":
      return "bg-semantic-success-500 border-semantic-success-600";
    case "Negative":
      return "bg-semantic-error-500 border-semantic-error-600";
    case "Mixed":
      return "bg-semantic-warning-500 border-semantic-warning-600";
    case "Neutral":
      return "bg-neutral-300 border-neutral-400";
    case "Unknown":
    default:
      return "bg-neutral-200 border-neutral-300";
  }
}

function sentimentBadgeColor(sentiment: string | null): string {
  switch (sentiment) {
    case "Positive":
      return "bg-semantic-success-50 text-semantic-success-700";
    case "Negative":
      return "bg-semantic-error-50 text-semantic-error-700";
    case "Mixed":
      return "bg-semantic-warning-50 text-semantic-warning-700";
    case "Neutral":
    case "Unknown":
    default:
      return "";
  }
}
