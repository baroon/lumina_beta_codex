import { useMemo, useState } from "react";
import { ApiError } from "@/api/apiClient";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import {
  LineChartWrapper,
  type LineChartPoint,
  type LineChartSeries,
} from "@/components/charts/LineChartWrapper";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useTrackerDashboard } from "@/features/reports/hooks/useTrackerDashboard";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { TopBrandRowDto, TrackerDashboardDto } from "@/types/api";

interface TrackerDashboardV2ScreenProps {
  trackerId: string;
}

// Stable per-entity palette — first tracked-brand always picks index 0
// (primary brand color), each subsequent entity rotates through.
const ENTITY_PALETTE = [
  "#6366f1", // primary-500 — tracked brand
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#06b6d4", // cyan
  "#a855f7", // purple
];

// Numeric metrics the user can switch the multi-brand chart to. Brand-side
// metrics work for the brand entity; competitor entities only have one
// rate-equivalent series so the switcher maps to the matching pair.
const METRIC_OPTIONS: Array<{
  value: string;
  label: string;
  brandMetric: string;
  /** For competitors — which trend metric equates to this brand metric? */
  competitorMetric: string;
  format: "pct";
}> = [
  {
    value: "mention",
    label: "Mention rate",
    brandMetric: "BrandMentionRate",
    competitorMetric: "MentionRate",
    format: "pct",
  },
  {
    value: "rec",
    label: "Recommendation rate",
    brandMetric: "BrandRecommendationRate",
    competitorMetric: "RecommendationRate",
    format: "pct",
  },
];

/**
 * Visibility Tracker Dashboard v2 (Phase 4 v2 Slice A). Replaces the v1
 * 6-card trend grid with a competitive-analytics surface: filter row + 4
 * hero tiles + multi-brand trend chart + top brands table. Slices B + C
 * add sources/domains/SoV/radar and platform/topic depth in follow-up
 * commits.
 */
export function TrackerDashboardV2Screen({ trackerId }: TrackerDashboardV2ScreenProps) {
  const [days, setDays] = useState(30);
  const [metricKey, setMetricKey] = useState(METRIC_OPTIONS[0].value);
  const { data, isLoading, isError, error, refetch } = useTrackerDashboard(trackerId, days);
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
        title={data.trackerName}
        description={`${data.brandName} — ${copy.subtitle.replace("{days}", String(data.days))}`}
      />

      <FilterBar days={days} onDaysChange={setDays} />
      <HeroRow hero={data.hero} />
      <TrendChartCard data={data} metricKey={metricKey} onMetricKeyChange={setMetricKey} />
      <TopBrandsCard rows={data.topBrands} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

interface FilterBarProps {
  days: number;
  onDaysChange: (days: number) => void;
}

function FilterBar({ days, onDaysChange }: FilterBarProps) {
  const copy = REPORTS_COPY.dashboard.filter;
  const options: Array<{ days: number; label: string }> = [
    { days: 7, label: copy.day7 },
    { days: 30, label: copy.day30 },
    { days: 90, label: copy.day90 },
  ];
  return (
    <div
      role="group"
      aria-label={copy.ariaLabel}
      className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-surface-card p-1"
    >
      {options.map((opt) => (
        <button
          key={opt.days}
          type="button"
          onClick={() => onDaysChange(opt.days)}
          aria-pressed={days === opt.days}
          className={cn(
            "rounded px-3 py-1 text-xs font-medium transition-colors",
            days === opt.days
              ? "bg-primary-50 text-primary-700"
              : "text-neutral-600 hover:bg-neutral-50",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero tiles (4 big numbers)
// ---------------------------------------------------------------------------

interface HeroRowProps {
  hero: TrackerDashboardDto["hero"];
}

function HeroRow({ hero }: HeroRowProps) {
  const copy = REPORTS_COPY.dashboard.hero;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <HeroTile label={copy.queries} value={hero.queries.toLocaleString()} />
      <HeroTile label={copy.mentions} value={hero.mentions.toLocaleString()} />
      <HeroTile label={copy.citations} value={hero.citations.toLocaleString()} />
      <HeroTile
        label={copy.brandMentionRate}
        value={
          hero.brandMentionRate == null
            ? copy.noData
            : `${Math.round(hero.brandMentionRate * 100)}%`
        }
        muted={hero.brandMentionRate == null}
      />
    </div>
  );
}

function HeroTile({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
        <div
          className={cn(
            "mt-2 text-3xl font-semibold tabular-nums",
            muted ? "text-neutral-400" : "text-neutral-900",
          )}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Multi-line trend chart with metric switcher
// ---------------------------------------------------------------------------

interface TrendChartCardProps {
  data: TrackerDashboardDto;
  metricKey: string;
  onMetricKeyChange: (key: string) => void;
}

function TrendChartCard({ data, metricKey, onMetricKeyChange }: TrendChartCardProps) {
  const copy = REPORTS_COPY.dashboard.trend;
  const option = METRIC_OPTIONS.find((m) => m.value === metricKey) ?? METRIC_OPTIONS[0];

  // Build one series per entity. The brand entity uses option.brandMetric;
  // competitor entities use option.competitorMetric.
  const series = useMemo(
    () => buildSeries(data, option.brandMetric, option.competitorMetric),
    [data, option],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{copy.title}</CardTitle>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <span>{copy.metricLabel}</span>
          <select
            value={metricKey}
            onChange={(e) => onMetricKeyChange(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm"
          >
            {METRIC_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noData}</p>
        ) : (
          <LineChartWrapper
            series={series}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            maxValue={1}
            height={300}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Pivots the dashboard's flat per-(entity, metric) series array into one
 * LineChartSeries per entity, selecting the brand-metric for the brand
 * entity and the competitor-metric for competitor entities. Sorted with
 * tracked brand first so its color is stable (primary palette index 0).
 */
function buildSeries(
  data: TrackerDashboardDto,
  brandMetric: string,
  competitorMetric: string,
): LineChartSeries[] {
  type Acc = {
    entityId: string;
    name: string;
    isTrackedBrand: boolean;
    points: LineChartPoint[];
  };
  const byEntity = new Map<string, Acc>();

  for (const s of data.series) {
    const wantMetric = s.entityType === "Brand" ? brandMetric : competitorMetric;
    if (s.metricName !== wantMetric) continue;
    if (s.seriesKind !== "Numeric") continue;

    const key = `${s.entityType}:${s.entityId}`;
    if (!byEntity.has(key)) {
      byEntity.set(key, {
        entityId: s.entityId,
        name: s.entityName,
        isTrackedBrand: s.entityType === "Brand" && s.entityId === data.brandId,
        points: [],
      });
    }
    const acc = byEntity.get(key)!;
    for (const p of s.points) {
      acc.points.push({ x: formatShortDate(p.capturedAt), y: p.value });
    }
  }

  const entities = Array.from(byEntity.values());
  entities.sort((a, b) => {
    if (a.isTrackedBrand !== b.isTrackedBrand) return a.isTrackedBrand ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entities.map((e, i) => ({
    id: e.entityId,
    name: e.name,
    color: ENTITY_PALETTE[i % ENTITY_PALETTE.length],
    data: e.points,
  }));
}

// ---------------------------------------------------------------------------
// Top Brands table
// ---------------------------------------------------------------------------

interface TopBrandsCardProps {
  rows: readonly TopBrandRowDto[];
}

function TopBrandsCard({ rows }: TopBrandsCardProps) {
  const copy = REPORTS_COPY.dashboard.topBrands;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium">
                    {copy.columns.brand}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {copy.columns.visibility}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {copy.columns.shareOfVoice}
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium">
                    {copy.columns.sentiment}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((row) => (
                  <tr key={`${row.entityType}:${row.entityId}`} className="hover:bg-neutral-50">
                    <td className="px-4 py-2">
                      <span className="font-medium text-neutral-900">{row.name}</span>
                      {row.isTrackedBrand && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {copy.youChip}
                        </Badge>
                      )}
                    </td>
                    <MetricCell value={row.visibility} delta={row.visibilityDelta} format="pct" />
                    <MetricCell
                      value={row.shareOfVoice}
                      delta={row.shareOfVoiceDelta}
                      format="pct"
                    />
                    <td className="px-4 py-2 text-left">
                      {row.sentiment ? (
                        <Badge variant={sentimentVariant(row.sentiment)} className="text-xs">
                          {row.sentiment}
                        </Badge>
                      ) : (
                        <span className="text-xs text-neutral-400">{copy.noData}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricCellProps {
  value: number | null;
  delta: number | null;
  format: "pct";
}
function MetricCell({ value, delta, format: _format }: MetricCellProps) {
  const copy = REPORTS_COPY.dashboard.topBrands;
  if (value == null) {
    return <td className="px-4 py-2 text-right tabular-nums text-neutral-400">{copy.noData}</td>;
  }
  return (
    <td className="px-4 py-2 text-right">
      <div className="flex items-center justify-end gap-2 tabular-nums">
        <span className="text-neutral-900">{Math.round(value * 100)}%</span>
        {delta != null && <DeltaChip delta={delta} />}
      </div>
    </td>
  );
}

interface DeltaChipProps {
  delta: number;
}
function DeltaChip({ delta }: DeltaChipProps) {
  const pctPoints = Math.round(delta * 100);
  const sign = delta > 0 ? "+" : "";
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const color =
    delta > 0
      ? "text-semantic-success-700"
      : delta < 0
        ? "text-semantic-error-700"
        : "text-neutral-500";
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs", color)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {sign}
      {pctPoints}pp
    </span>
  );
}

function sentimentVariant(
  value: string,
): "default" | "secondary" | "outline" | "success" | "warning" {
  switch (value) {
    case "Positive":
      return "success";
    case "Negative":
      return "warning";
    case "Mixed":
      return "warning";
    case "Neutral":
    case "Unknown":
    default:
      return "secondary";
  }
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
