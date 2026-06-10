import { Link } from "@tanstack/react-router";
import {
  Database,
  Eye,
  Heart,
  Quote,
  ShieldAlert,
  Swords,
  Tags,
  ThumbsUp,
  Users,
} from "lucide-react";
import { ApiError } from "@/api/apiClient";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { BarChartWrapper, type BarChartDatum } from "@/components/charts/BarChartWrapper";
import { SentimentDonut } from "@/components/charts/SentimentDonut";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import {
  MetricCategoryLayout,
  type MetricCategorySection,
} from "@/components/molecules/MetricCategoryLayout";
import { InfoTooltip } from "@/components/molecules/InfoTooltip";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { ScanBreadcrumb } from "@/features/reports/components/ScanBreadcrumb";
import { useScanResults } from "@/features/reports/hooks/useScanResults";
import type { BreakdownsDto, CoreMetricsDto, ScanSummaryDto } from "@/types/api";

interface ScanResultsScreenProps {
  scanRunId: string;
}

/**
 * Slice (d) reporting page. Composes the entire Scan Results view from the
 * single GET /api/scans/{id}/results call. Charts go through the shared
 * /components/charts/ wrappers per ARCH-003 (no direct nivo imports here).
 *
 * Metrics are grouped into five categories — Visibility, Recommendation,
 * Sentiment & Trust, Competitive, Citations & Sources — via
 * <MetricCategoryLayout>. The sticky pill nav syncs to the URL hash for
 * deep linking.
 */
export function ScanResultsScreen({ scanRunId }: ScanResultsScreenProps) {
  const { data, isLoading, isError, error, refetch } = useScanResults(scanRunId);

  if (isLoading) return <LoadingPage />;

  if (isError) {
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

  const sections: MetricCategorySection[] = [
    {
      id: "visibility",
      label: "Visibility",
      icon: Eye,
      children: <VisibilitySection metrics={data.coreMetrics} breakdowns={data.breakdowns} />,
    },
    {
      id: "recommendation",
      label: "Recommendation",
      icon: ThumbsUp,
      children: <RecommendationSection metrics={data.coreMetrics} />,
    },
    {
      id: "sentiment",
      label: "Sentiment & Trust",
      icon: Heart,
      children: <SentimentSection metrics={data.coreMetrics} />,
    },
    {
      id: "competitive",
      label: "Competitive",
      icon: Swords,
      children: <CompetitiveSection metrics={data.coreMetrics} breakdowns={data.breakdowns} />,
    },
    {
      id: "citations",
      label: "Citations & Sources",
      icon: Quote,
      children: <CitationsSection metrics={data.coreMetrics} />,
    },
  ];

  return (
    <div className="space-y-5">
      <ScanBreadcrumb scanRunId={scanRunId} currentLabel="Scan Results" />
      <PageHeader
        title={REPORTS_COPY.scanResults.title}
        description={REPORTS_COPY.scanResults.subtitle
          .replace("{brandName}", data.summary.brandName)
          .replace("{trackerName}", data.summary.trackerName)}
      />
      <CrossLinkBar scanRunId={scanRunId} />
      <MetricCategoryLayout
        statusStrip={<SummarySection summary={data.summary} />}
        sections={sections}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header strip + cross-links (kept above the category layout)
// ---------------------------------------------------------------------------

function CrossLinkBar({ scanRunId }: { scanRunId: string }) {
  return (
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
      <Link
        to="/scans/$scanRunId/claims"
        params={{ scanRunId }}
        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
      >
        <ShieldAlert className="h-4 w-4" />
        {REPORTS_COPY.scanResults.viewClaims}
      </Link>
    </div>
  );
}

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

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

interface VisibilitySectionProps {
  metrics: CoreMetricsDto;
  breakdowns: BreakdownsDto;
}

function VisibilitySection({ metrics, breakdowns }: VisibilitySectionProps) {
  const m = REPORTS_COPY.scanResults.metrics;
  const breakdownLabels = REPORTS_COPY.scanResults.breakdowns;
  const sections = REPORTS_COPY.scanResults.sections;

  const platformData = mapRateBreakdown(breakdowns.byPlatform, "platformName");
  const lensData = mapRateBreakdown(breakdowns.byLens, "lensName");
  const topicData = mapRateBreakdown(breakdowns.byTopic, "topicName");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label={m.brandMentionRate}
          value={formatRate(metrics.brandMentionRate)}
          subValue={formatMomentum(metrics.brandMentionRateMomentum)}
        />
        <MetricTile
          label={m.brandShareOfVoice}
          value={formatRate(metrics.brandShareOfVoice)}
          subValue={formatMomentum(metrics.brandShareOfVoiceMomentum)}
        />
        <MetricTile
          label={m.brandAbsenceRate}
          value={formatRate(metrics.brandAbsenceRate)}
          subValue={formatMomentum(metrics.brandAbsenceRateMomentum)}
        />
        <MetricTile
          label={m.brandFirstMentionRate}
          value={formatRate(metrics.brandFirstMentionRate)}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownChartCard
          title={sections.byPlatform}
          data={platformData}
          emptyText={breakdownLabels.noRows}
          valueAxisLabel={breakdownLabels.mentionRate}
          rate
        />
        <BreakdownChartCard
          title={sections.byLens}
          data={lensData}
          emptyText={breakdownLabels.noRows}
          valueAxisLabel={breakdownLabels.mentionRate}
          rate
        />
        <BreakdownChartCard
          title={sections.byTopic}
          data={topicData}
          emptyText={breakdownLabels.noRows}
          valueAxisLabel={breakdownLabels.mentionRate}
          rate
        />
      </div>
    </div>
  );
}

interface RecommendationSectionProps {
  metrics: CoreMetricsDto;
}

function RecommendationSection({ metrics }: RecommendationSectionProps) {
  const m = REPORTS_COPY.scanResults.metrics;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricTile
        label={m.brandRecommendationRate}
        value={formatRate(metrics.brandRecommendationRate)}
      />
      <MetricTile
        label={m.brandRecommendationScore}
        value={formatSignedScore(metrics.brandRecommendationScore)}
      />
      <MetricTile
        label={m.brandRecommendationShare}
        value={formatRate(metrics.brandRecommendationShare)}
      />
      <MetricTile
        label={m.brandTopRecommendationShare}
        value={formatRate(metrics.brandTopRecommendationShare)}
      />
      <MetricTile
        label={m.averageBrandRank}
        value={formatRankWithUniverse(
          metrics.averageBrandRank,
          metrics.averageBrandRankUniverseSize,
        )}
      />
      <MetricTile
        label={m.averageBrandRecommendationPosition}
        value={formatRank(metrics.averageBrandRecommendationPosition)}
      />
      <MetricTile
        label={m.brandRecommendationContext}
        value={`${metrics.brandRecommendedForCount} / ${metrics.brandWithCaveatsCount}`}
      />
      <MetricTile
        label={m.brandTopicRecommendations}
        value={`${metrics.brandTopicRecommendedCount} / ${metrics.brandTopicNotRecommendedCount}`}
      />
    </div>
  );
}

interface SentimentSectionProps {
  metrics: CoreMetricsDto;
}

function SentimentSection({ metrics }: SentimentSectionProps) {
  const m = REPORTS_COPY.scanResults.metrics;
  const sections = REPORTS_COPY.scanResults.sections;
  const hasDistribution = Object.keys(metrics.brandSentimentDistribution).length > 0;
  const hasAttributes = metrics.topBrandAttributes.length > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label={m.overallSentiment}
          value={dominantSentiment(metrics.brandSentimentDistribution) ?? m.noData}
        />
        <MetricTile
          label={m.averageAnswerCertainty}
          value={formatRate(metrics.averageAnswerCertainty)}
        />
        <MetricTile
          label={m.brandComparisonRecord}
          value={`${metrics.brandWinningComparisonCount} / ${metrics.brandLosingComparisonCount}`}
        />
        <MetricTile label={m.brandRiskFlagCount} value={metrics.brandRiskFlagCount} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <ChartTitle title={sections.sentimentDistribution} />
          </CardHeader>
          <CardContent>
            {hasDistribution ? (
              <SentimentDonut data={metrics.brandSentimentDistribution} />
            ) : (
              <EmptyState message={REPORTS_COPY.scanResults.metrics.noData} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <ChartTitle title={sections.brandAttributes} />
          </CardHeader>
          <CardContent>
            {hasAttributes ? (
              <ul className="flex flex-wrap gap-2" role="list">
                {metrics.topBrandAttributes.map((a) => (
                  <li key={`${a.rank}:${a.name}`}>
                    <Badge variant={attributePolarityVariant(a.polarity)} className="gap-1 text-xs">
                      <span>{a.name}</span>
                      <span className="opacity-70">×{a.mentionCount}</span>
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message={REPORTS_COPY.scanResults.metrics.noData} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface CompetitiveSectionProps {
  metrics: CoreMetricsDto;
  breakdowns: BreakdownsDto;
}

function CompetitiveSection({ metrics, breakdowns }: CompetitiveSectionProps) {
  const m = REPORTS_COPY.scanResults.metrics;
  const sections = REPORTS_COPY.scanResults.sections;
  const breakdownLabels = REPORTS_COPY.scanResults.breakdowns;

  const sovData = buildShareOfVoiceData(metrics, breakdowns);
  const competitorData: BarChartDatum[] = breakdowns.byCompetitor.map((r) => ({
    label: r.competitorName,
    value: r.mentionCount,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label={m.competitorMentionCount} value={metrics.competitorMentionCount} />
        <MetricTile label={m.productMentionCount} value={metrics.productMentionCount} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <ChartTitle title={sections.shareOfVoice} />
          </CardHeader>
          <CardContent>
            {sovData ? (
              <BarChartWrapper
                data={sovData}
                layout="horizontal"
                valueAxisLabel={REPORTS_COPY.scanResults.shareOfVoice.valueAxis}
                formatValue={(v) => `${Math.round(v * 100)}%`}
              />
            ) : (
              <EmptyState message={REPORTS_COPY.scanResults.metrics.noData} />
            )}
          </CardContent>
        </Card>
        <BreakdownChartCard
          title={sections.byCompetitor}
          data={competitorData}
          emptyText={breakdownLabels.noRows}
          valueAxisLabel={breakdownLabels.mentionCount}
        />
      </div>
    </div>
  );
}

interface CitationsSectionProps {
  metrics: CoreMetricsDto;
}

function CitationsSection({ metrics }: CitationsSectionProps) {
  const m = REPORTS_COPY.scanResults.metrics;
  const sections = REPORTS_COPY.scanResults.sections;
  const sourcesData: BarChartDatum[] = metrics.topCitedSources.map((s) => ({
    label: s.sourceName,
    value: s.citationCount,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label={m.citationCount}
          value={metrics.citationCount}
          subValue={`${metrics.ownedCitationCount} ${m.ownedCitationCount} · ${metrics.competitorCitationCount} ${m.competitorCitationCount} · ${metrics.thirdPartyCitationCount} ${m.thirdPartyCitationCount} · ${metrics.unknownCitationCount} ${m.unknownCitationCount}`}
        />
        <MetricTile
          label={m.ownedCitationShare}
          value={formatOwnedShare(metrics.ownedCitationCount, metrics.citationCount)}
        />
        <MetricTile
          label={m.authorityCitations}
          value={`${metrics.highAuthorityCitationCount} / ${metrics.lowAuthorityCitationCount}`}
        />
      </div>
      <Card>
        <CardHeader>
          <ChartTitle title={sections.topCitedSources} />
        </CardHeader>
        <CardContent>
          {sourcesData.length > 0 ? (
            <BarChartWrapper data={sourcesData} layout="horizontal" valueAxisLabel="Citations" />
          ) : (
            <EmptyState message={REPORTS_COPY.scanResults.metrics.noCitations} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers + shared widgets
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
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
        <span className="truncate">{label}</span>
        <InfoTooltip label={label} iconSize={11} />
      </div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums text-neutral-900">{value}</div>
      {subValue && <div className="mt-0.5 text-[11px] text-neutral-500">{subValue}</div>}
    </div>
  );
}

/**
 * CardTitle with an inline ⓘ tooltip placeholder. Drop into a CardHeader
 * to reserve space for explanatory copy alongside the title.
 */
function ChartTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <CardTitle>{title}</CardTitle>
      <InfoTooltip label={title} iconSize={13} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "Completed" ? "secondary" : status === "Failed" ? "destructive" : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-md border border-dashed border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500">
      {message}
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
        <ChartTitle title={title} />
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message={emptyText} />
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

function attributePolarityVariant(
  polarity: string,
): "default" | "secondary" | "outline" | "success" | "warning" | "destructive" {
  switch (polarity) {
    case "Positive":
      return "success";
    case "Negative":
      return "destructive";
    case "Neutral":
    default:
      return "secondary";
  }
}

function mapRateBreakdown<T>(rows: T[], nameKey: keyof T): BarChartDatum[] {
  return rows.map((r) => ({
    label: String(r[nameKey]),
    // `brandMentionRate` exists on every breakdown row type (Platform/Lens/Topic).
    value: ((r as unknown as { brandMentionRate: number | null }).brandMentionRate ?? 0) as number,
  }));
}

/**
 * Brand + per-competitor share-of-voice bar data, FE-derived from
 * <c>brandShareOfVoice</c> and per-competitor mention counts. Returns null
 * when the SoV denominator is zero (no brand+competitor mentions in scope).
 */
function buildShareOfVoiceData(
  metrics: CoreMetricsDto,
  breakdowns: BreakdownsDto,
): BarChartDatum[] | null {
  if (
    metrics.brandShareOfVoice == null ||
    metrics.competitorMentionCount === 0 ||
    breakdowns.byCompetitor.length === 0
  ) {
    return null;
  }
  // brandSoV = brandMentions / (brandMentions + competitorMentions)
  //   => totalMentions = competitorMentions / (1 - brandSoV)
  const totalMentions = metrics.competitorMentionCount / (1 - metrics.brandShareOfVoice);
  return [
    { label: "Brand", value: metrics.brandShareOfVoice },
    ...breakdowns.byCompetitor
      .filter((c) => c.mentionCount > 0)
      .map((c) => ({ label: c.competitorName, value: c.mentionCount / totalMentions })),
  ];
}

function formatRate(value: number | null): string {
  if (value == null) return REPORTS_COPY.scanResults.metrics.noData;
  return `${Math.round(value * 100)}%`;
}

function formatRank(value: number | null): string {
  if (value == null) return REPORTS_COPY.scanResults.metrics.noData;
  return value.toFixed(1);
}

function formatRankWithUniverse(rank: number | null, universe: number | null): string {
  const r = formatRank(rank);
  if (rank == null || universe == null) return r;
  return `${r} of ~${universe.toFixed(0)}`;
}

function formatSignedScore(value: number | null): string {
  if (value == null) return REPORTS_COPY.scanResults.metrics.noData;
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${Math.abs(value).toFixed(2)}`;
}

function formatMomentum(value: number | null): string | undefined {
  if (value == null) return undefined;
  const pp = Math.round(value * 100);
  if (pp === 0) return `± 0 pp ${REPORTS_COPY.scanResults.metrics.momentumSuffix}`;
  const arrow = pp > 0 ? "↑" : "↓";
  const sign = pp > 0 ? "+" : "−";
  return `${arrow} ${sign}${Math.abs(pp)} pp ${REPORTS_COPY.scanResults.metrics.momentumSuffix}`;
}

function formatOwnedShare(ownedCount: number, total: number): string {
  if (total === 0) return REPORTS_COPY.scanResults.metrics.noData;
  return `${Math.round((ownedCount / total) * 100)}%`;
}

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
