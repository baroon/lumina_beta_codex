import { Link } from "@tanstack/react-router";
import { Database, Tags, Users } from "lucide-react";
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

      <div className="flex flex-wrap items-center gap-4">
        <Link
          to="/scans/$scanRunId/sources"
          params={{ scanRunId }}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
        >
          <Database className="h-4 w-4" />
          {REPORTS_COPY.sources.viewSources}
        </Link>
        <Link
          to="/scans/$scanRunId/topics"
          params={{ scanRunId }}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
        >
          <Tags className="h-4 w-4" />
          {REPORTS_COPY.topics.viewTopics}
        </Link>
        <Link
          to="/scans/$scanRunId/competitors"
          params={{ scanRunId }}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
        >
          <Users className="h-4 w-4" />
          {REPORTS_COPY.competitors.viewCompetitors}
        </Link>
      </div>

      <SummarySection summary={data.summary} />
      <CoreMetricsSection metrics={data.coreMetrics} />
      <SentimentDistributionSection distribution={data.coreMetrics.brandSentimentDistribution} />
      <ShareOfVoiceSection metrics={data.coreMetrics} breakdowns={data.breakdowns} />
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
        {/* Phase 4 Slice 5: OwnedCitationShare + OverallSentiment per ADR-004 §"Core
            Scan Results metrics". FE-derived from existing CoreMetricsDto fields
            (D21 — no new ScanMetric row) so the backend stays unchanged. */}
        <MetricTile
          label={m.ownedCitationShare}
          value={formatOwnedShare(metrics.ownedCitationCount, metrics.citationCount)}
        />
        <MetricTile
          label={m.overallSentiment}
          value={dominantSentiment(metrics.brandSentimentDistribution) ?? m.noData}
        />
      </CardContent>
    </Card>
  );
}

interface ShareOfVoiceSectionProps {
  metrics: CoreMetricsDto;
  breakdowns: BreakdownsDto;
}

/**
 * Share-of-Voice breakdown chart — brand + each tracked competitor's share
 * of the total brand+competitor mention count (ADR-004 §"Breakdown charts"
 * #3, Phase 4 Slice 5). FE-derived: the brand's share is
 * <c>brandShareOfVoice</c> directly; each competitor's share is its mention
 * count divided by the inferred total
 * (competitorMentionCount / (1 - brandShareOfVoice)). Skipped when
 * <c>brandShareOfVoice</c> is null (denominator-zero — no brand+competitor
 * mentions in this scan).
 */
function ShareOfVoiceSection({ metrics, breakdowns }: ShareOfVoiceSectionProps) {
  const copy = REPORTS_COPY.scanResults;
  if (
    metrics.brandShareOfVoice == null ||
    metrics.competitorMentionCount === 0 ||
    breakdowns.byCompetitor.length === 0
  ) {
    return null;
  }

  // Derive total mentions from the SoV identity:
  //   brandSoV = brandMentions / (brandMentions + competitorMentions)
  //   (1 - brandSoV) = competitorMentions / total
  //   total = competitorMentions / (1 - brandSoV)
  // We already gated on competitorMentionCount > 0 + SoV != null, and SoV=1
  // would require competitor count to be 0 — so (1 - SoV) is safely positive.
  const totalMentions = metrics.competitorMentionCount / (1 - metrics.brandShareOfVoice);

  const data: BarChartDatum[] = [
    { label: "Brand", value: metrics.brandShareOfVoice },
    ...breakdowns.byCompetitor
      .filter((c) => c.mentionCount > 0)
      .map((c) => ({ label: c.competitorName, value: c.mentionCount / totalMentions })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.sections.shareOfVoice}</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChartWrapper
          data={data}
          layout="horizontal"
          valueAxisLabel={copy.shareOfVoice.valueAxis}
          formatValue={(v) => `${Math.round(v * 100)}%`}
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
  /** Format the value axis as a percent (for rate-shaped metrics). */
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

function formatOwnedShare(ownedCount: number, total: number): string {
  if (total === 0) return REPORTS_COPY.scanResults.metrics.noData;
  return `${Math.round((ownedCount / total) * 100)}%`;
}

/**
 * Mode (most-observed value) of the sentiment distribution. Defined as the
 * key with the highest count; ties broken by JS object iteration order
 * (insertion order from the server, which is the order the aggregator
 * encountered the values — deterministic enough for tie-breaking).
 */
function dominantSentiment(distribution: Record<string, number>): string | null {
  const entries = Object.entries(distribution);
  if (entries.length === 0) return null;
  let best = entries[0];
  for (const entry of entries) {
    if (entry[1] > best[1]) best = entry;
  }
  return best[0];
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
