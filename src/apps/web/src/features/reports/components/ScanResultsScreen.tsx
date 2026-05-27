import { ApiError } from "@/api/apiClient";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useScanResults } from "@/features/reports/hooks/useScanResults";
import type {
  CompetitorBreakdownDto,
  LensBreakdownDto,
  PlatformBreakdownDto,
  TopicBreakdownDto,
  TopCitedSourceDto,
} from "@/types/api";

interface ScanResultsScreenProps {
  scanRunId: string;
}

/**
 * Slice (d) reporting MVP: composes the entire Scan Results page from the
 * single GET /api/scans/{id}/results call. Renders Summary + CoreMetrics +
 * Breakdowns inline as plain Tailwind. Atoms break out (MetricCard,
 * SentimentDistribution chart, etc.) and per-section components land as
 * follow-ups once the shape is exercised against real reports.
 */
export function ScanResultsScreen({ scanRunId }: ScanResultsScreenProps) {
  const { data, isLoading, isError, error, refetch } = useScanResults(scanRunId);

  if (isLoading) return <LoadingPage />;

  if (isError) {
    // 404 here means scan or AnalysisJob not found — render a friendly empty
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

      <SummarySection summary={data.summary} />
      <CoreMetricsSection metrics={data.coreMetrics} />
      <SentimentDistributionSection distribution={data.coreMetrics.brandSentimentDistribution} />
      <TopCitedSourcesSection sources={data.coreMetrics.topCitedSources} />
      <BreakdownsSection breakdowns={data.breakdowns} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section components (file-local; promoted to dedicated files when the MVP
// becomes polished — see CLAUDE.md "Three similar lines is better than a
// premature abstraction.")
// ---------------------------------------------------------------------------

interface SummarySectionProps {
  summary: import("@/types/api").ScanSummaryDto;
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
  metrics: import("@/types/api").CoreMetricsDto;
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
          // The four classification counts sum to citationCount — invariant from MetricAggregator.
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
  const entries = Object.entries(distribution);
  if (entries.length === 0) return null;
  const total = entries.reduce((acc, [, count]) => acc + count, 0);
  const order = ["Positive", "Neutral", "Mixed", "Negative", "Unknown"];
  entries.sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{REPORTS_COPY.scanResults.sections.sentimentDistribution}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map(([value, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={value} className="grid grid-cols-[120px_1fr_60px] items-center gap-3 text-sm">
              <span className="text-neutral-700">{value}</span>
              <div className="h-2 overflow-hidden rounded bg-neutral-100">
                <div
                  className={`h-full ${sentimentBarColor(value)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-right tabular-nums text-neutral-600">
                {count} ({pct}%)
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface TopCitedSourcesSectionProps {
  sources: TopCitedSourceDto[];
}

function TopCitedSourcesSection({ sources }: TopCitedSourcesSectionProps) {
  if (sources.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{REPORTS_COPY.scanResults.sections.topCitedSources}</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2 text-sm">
          {sources.map((s) => (
            <li
              key={`${s.rank}-${s.sourceName}`}
              className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-2 last:border-b-0 last:pb-0"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Badge variant="secondary">#{s.rank}</Badge>
                <span className="truncate text-neutral-700">{s.sourceName}</span>
              </span>
              <span className="shrink-0 tabular-nums text-neutral-600">{s.citationCount}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

interface BreakdownsSectionProps {
  breakdowns: import("@/types/api").BreakdownsDto;
}

function BreakdownsSection({ breakdowns }: BreakdownsSectionProps) {
  const copy = REPORTS_COPY.scanResults;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <BreakdownTable<PlatformBreakdownDto>
        title={copy.sections.byPlatform}
        rows={breakdowns.byPlatform}
        columns={[
          { key: "platformName", label: copy.breakdowns.name },
          {
            key: "brandMentionRate",
            label: copy.breakdowns.mentionRate,
            format: (v) => formatRate(v as number | null),
          },
          {
            key: "brandShareOfVoice",
            label: copy.breakdowns.shareOfVoice,
            format: (v) => formatRate(v as number | null),
          },
          { key: "citationCount", label: copy.breakdowns.citations },
        ]}
        rowKey={(r) => r.platformId}
      />
      <BreakdownTable<LensBreakdownDto>
        title={copy.sections.byLens}
        rows={breakdowns.byLens}
        columns={[
          { key: "lensName", label: copy.breakdowns.name },
          {
            key: "brandMentionRate",
            label: copy.breakdowns.mentionRate,
            format: (v) => formatRate(v as number | null),
          },
          {
            key: "brandShareOfVoice",
            label: copy.breakdowns.shareOfVoice,
            format: (v) => formatRate(v as number | null),
          },
          { key: "citationCount", label: copy.breakdowns.citations },
        ]}
        rowKey={(r) => r.lensId}
      />
      <BreakdownTable<TopicBreakdownDto>
        title={copy.sections.byTopic}
        rows={breakdowns.byTopic}
        columns={[
          { key: "topicName", label: copy.breakdowns.name },
          {
            key: "brandMentionRate",
            label: copy.breakdowns.mentionRate,
            format: (v) => formatRate(v as number | null),
          },
          {
            key: "brandShareOfVoice",
            label: copy.breakdowns.shareOfVoice,
            format: (v) => formatRate(v as number | null),
          },
          { key: "citationCount", label: copy.breakdowns.citations },
        ]}
        rowKey={(r) => r.topicId}
      />
      <BreakdownTable<CompetitorBreakdownDto>
        title={copy.sections.byCompetitor}
        rows={breakdowns.byCompetitor}
        columns={[
          { key: "competitorName", label: copy.breakdowns.name },
          { key: "mentionCount", label: copy.breakdowns.mentionCount },
          { key: "recommendationCount", label: copy.breakdowns.recommendationCount },
        ]}
        rowKey={(r) => r.competitorId}
      />
    </div>
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

interface BreakdownColumn<T> {
  key: keyof T;
  label: string;
  format?: (value: unknown) => string;
}

function BreakdownTable<T>({
  title,
  rows,
  columns,
  rowKey,
}: {
  title: string;
  rows: T[];
  columns: BreakdownColumn<T>[];
  rowKey: (row: T) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">{REPORTS_COPY.scanResults.breakdowns.noRows}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                {columns.map((c) => (
                  <th key={String(c.key)} className="py-2 text-left font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-neutral-100 last:border-b-0">
                  {columns.map((c) => {
                    const v = row[c.key];
                    const displayValue = c.format ? c.format(v) : (v as React.ReactNode);
                    return (
                      <td key={String(c.key)} className="py-2 tabular-nums">
                        {displayValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
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

function sentimentBarColor(value: string): string {
  switch (value) {
    case "Positive":
      return "bg-semantic-success-500";
    case "Negative":
      return "bg-semantic-error-500";
    case "Mixed":
      return "bg-semantic-warning-500";
    case "Neutral":
      return "bg-neutral-400";
    default:
      return "bg-neutral-300";
  }
}
