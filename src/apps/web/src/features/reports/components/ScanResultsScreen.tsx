import { Link } from "@tanstack/react-router";
import { Database } from "lucide-react";
import { ApiError } from "@/api/apiClient";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { BarChartWrapper, type BarChartDatum } from "@/components/charts/BarChartWrapper";
import { SentimentDonut } from "@/components/charts/SentimentDonut";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useScanResults } from "@/features/reports/hooks/useScanResults";
import type { BreakdownsDto, CoreMetricsDto, ScanSummaryDto } from "@/types/api";

interface ScanResultsScreenProps {
  scanRunId: string;
}

/**
 * Slice (d) reporting page. Composes the entire Scan Results view from the
 * single GET /api/scans/{id}/results call. Charts go through the shared
 * /components/charts/ wrappers per ARCH-003 (no direct nivo imports here).
 */
export function ScanResultsScreen({ scanRunId }: ScanResultsScreenProps) {
  const { data, isLoading, isError, error, refetch } = useScanResults(scanRunId);

  if (isLoading) return <LoadingPage />;

  if (isError) {
    // 404 means scan or AnalysisJob not found — render a friendly empty
    // state rather than the generic error page so users hitting the URL
    // before aggregation completes see something actionable.
    if (error instanceof ApiError && error.status === 404) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-sm text-neutral-600">
            {REPORTS_COPY.scanResults.empty.notFound}
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
    <div className="space-y-8">
      <PageHeader
        title={REPORTS_COPY.scanResults.title}
        description={REPORTS_COPY.scanResults.subtitle
          .replace("{brandName}", data.summary.brandName)
          .replace("{trackerName}", data.summary.trackerName)}
      />

      <Link
        to="/scans/$scanRunId/sources"
        params={{ scanRunId }}
        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
      >
        <Database className="h-4 w-4" />
        {REPORTS_COPY.sources.viewSources}
      </Link>

      <SummarySection summary={data.summary} />
      <CoreMetricsSection metrics={data.coreMetrics} />
      <SentimentDistributionSection distribution={data.coreMetrics.brandSentimentDistribution} />
      <TopCitedSourcesSection sources={data.coreMetrics.topCitedSources} />
      <BreakdownsSection breakdowns={data.breakdowns} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections (file-local; will be promoted to dedicated files when polished)
// ---------------------------------------------------------------------------

interface SummarySectionProps {
  summary: ScanSummaryDto;
}

function SummarySection({ summary }: SummarySectionProps) {
  const copy = REPORTS_COPY.scanResults.summary;
  const checks =
    summary.failedCount > 0
      ? copy.checksWithFailures
          .replace("{completed}", String(summary.completedCount))
          .replace("{total}", String(summary.scanCheckCount))
          .replace("{failed}", String(summary.failedCount))
      : copy.checks
          .replace("{completed}", String(summary.completedCount))
          .replace("{total}", String(summary.scanCheckCount));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{REPORTS_COPY.scanResults.sections.summary}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={copy.scanStatus}>
          <StatusBadge status={summary.scanStatus} />
        </Field>
        <Field label={copy.analysisStatus}>
          <StatusBadge status={summary.analysisStatus} />
        </Field>
        <Field label={copy.startedAt}>{formatDateTime(summary.startedAt)}</Field>
        <Field label={copy.completedAt}>
          {summary.completedAt ? formatDateTime(summary.completedAt) : "—"}
        </Field>
        <Field label={copy.platforms}>
          <div className="flex flex-wrap gap-1">
            {summary.platforms.map((p) => (
              <Badge key={p.platformId} variant="secondary">
                {p.name}
              </Badge>
            ))}
          </div>
        </Field>
        <Field label="">{checks}</Field>
      </CardContent>
    </Card>
  );
}

interface CoreMetricsSectionProps {
  metrics: CoreMetricsDto;
}

function CoreMetricsSection({ metrics }: CoreMetricsSectionProps) {
  const m = REPORTS_COPY.scanResults.metrics;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{REPORTS_COPY.scanResults.sections.coreMetrics}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label={m.brandMentionRate} value={formatRate(metrics.brandMentionRate)} />
        <MetricTile
          label={m.brandRecommendationRate}
          value={formatRate(metrics.brandRecommendationRate)}
        />
        <MetricTile label={m.brandShareOfVoice} value={formatRate(metrics.brandShareOfVoice)} />
        <MetricTile label={m.averageBrandRank} value={formatRank(metrics.averageBrandRank)} />
        <MetricTile label={m.competitorMentionCount} value={metrics.competitorMentionCount} />
        <MetricTile label={m.productMentionCount} value={metrics.productMentionCount} />
        <MetricTile
          label={m.citationCount}
          value={metrics.citationCount}
          subValue={`${metrics.ownedCitationCount} ${m.ownedCitationCount} · ${metrics.competitorCitationCount} ${m.competitorCitationCount} · ${metrics.thirdPartyCitationCount} ${m.thirdPartyCitationCount} · ${metrics.unknownCitationCount} ${m.unknownCitationCount}`}
        />
      </CardContent>
    </Card>
  );
}

interface SentimentDistributionSectionProps {
  distribution: Record<string, number>;
}

function SentimentDistributionSection({ distribution }: SentimentDistributionSectionProps) {
  if (Object.keys(distribution).length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{REPORTS_COPY.scanResults.sections.sentimentDistribution}</CardTitle>
      </CardHeader>
      <CardContent>
        <SentimentDonut data={distribution} />
      </CardContent>
    </Card>
  );
}

interface TopCitedSourcesSectionProps {
  sources: import("@/types/api").TopCitedSourceDto[];
}

function TopCitedSourcesSection({ sources }: TopCitedSourcesSectionProps) {
  if (sources.length === 0) return null;
  // Charts receive prepared view models (ARCH-003) — flatten the rank+name
  // into the bar wrapper's {label, value} shape here, not in the wrapper.
  const data: BarChartDatum[] = sources.map((s) => ({
    label: s.sourceName,
    value: s.citationCount,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{REPORTS_COPY.scanResults.sections.topCitedSources}</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChartWrapper data={data} layout="horizontal" valueAxisLabel="Citations" />
      </CardContent>
    </Card>
  );
}

interface BreakdownsSectionProps {
  breakdowns: BreakdownsDto;
}

function BreakdownsSection({ breakdowns }: BreakdownsSectionProps) {
  const copy = REPORTS_COPY.scanResults;
  const labels = copy.breakdowns;

  const platformData: BarChartDatum[] = breakdowns.byPlatform.map((r) => ({
    label: r.platformName,
    value: r.brandMentionRate ?? 0,
  }));
  const lensData: BarChartDatum[] = breakdowns.byLens.map((r) => ({
    label: r.lensName,
    value: r.brandMentionRate ?? 0,
  }));
  const topicData: BarChartDatum[] = breakdowns.byTopic.map((r) => ({
    label: r.topicName,
    value: r.brandMentionRate ?? 0,
  }));
  // ByCompetitor uses MentionCount (count of mentions of THIS competitor),
  // not a rate — competitor scope is the per-entity tally.
  const competitorData: BarChartDatum[] = breakdowns.byCompetitor.map((r) => ({
    label: r.competitorName,
    value: r.mentionCount,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <BreakdownChartCard
        title={copy.sections.byPlatform}
        data={platformData}
        emptyText={labels.noRows}
        valueAxisLabel={labels.mentionRate}
        rate
      />
      <BreakdownChartCard
        title={copy.sections.byLens}
        data={lensData}
        emptyText={labels.noRows}
        valueAxisLabel={labels.mentionRate}
        rate
      />
      <BreakdownChartCard
        title={copy.sections.byTopic}
        data={topicData}
        emptyText={labels.noRows}
        valueAxisLabel={labels.mentionRate}
        rate
      />
      <BreakdownChartCard
        title={copy.sections.byCompetitor}
        data={competitorData}
        emptyText={labels.noRows}
        valueAxisLabel={labels.mentionCount}
      />
    </div>
  );
}

function BreakdownChartCard({
  title,
  data,
  emptyText,
  valueAxisLabel,
  rate,
}: {
  title: string;
  data: BarChartDatum[];
  emptyText: string;
  valueAxisLabel: string;
  /** Pin the value axis to [0, 1] and format as percent (for rate-shaped metrics). */
  rate?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-neutral-500">{emptyText}</p>
        ) : (
          <BarChartWrapper
            data={data}
            layout="horizontal"
            valueAxisLabel={valueAxisLabel}
            maxValue={rate ? 1 : undefined}
            formatValue={rate ? (v) => `${Math.round(v * 100)}%` : undefined}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
          {label}
        </div>
      )}
      <div className="text-sm text-neutral-900">{children}</div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{value}</div>
      {subValue && <div className="mt-1 text-xs text-neutral-500">{subValue}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "Completed" ? "secondary" : status === "Failed" ? "destructive" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function formatRate(value: number | null): string {
  if (value == null) return REPORTS_COPY.scanResults.metrics.noData;
  return `${Math.round(value * 100)}%`;
}

function formatRank(value: number | null): string {
  if (value == null) return REPORTS_COPY.scanResults.metrics.noData;
  return value.toFixed(1);
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
