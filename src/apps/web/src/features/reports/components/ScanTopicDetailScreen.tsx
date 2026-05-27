import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/api/apiClient";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useScanTopic } from "@/features/reports/hooks/useScanTopic";
import { cn } from "@/lib/utils";
import type {
  TopicMetricsDto,
  TopicPlatformBreakdownDto,
  TopicTopCitedSourceDto,
} from "@/types/api";

interface ScanTopicDetailScreenProps {
  scanRunId: string;
  topicId: string;
}

/**
 * Topic detail screen (Phase 4 Slice 3, D16). Composes the topic-level
 * metric pivot + per-platform breakdown (runtime sub-aggregation from the
 * backend) + top cited sources within the topic. Three independent
 * sections so the page renders incrementally if any sub-table is empty.
 */
export function ScanTopicDetailScreen({ scanRunId, topicId }: ScanTopicDetailScreenProps) {
  const { data, isLoading, isError, error, refetch } = useScanTopic(scanRunId, topicId);
  const copy = REPORTS_COPY.topics;

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
      <PageHeader title={data.topicName} description={copy.subtitle} />

      <Link
        to="/scans/$scanRunId/topics"
        params={{ scanRunId }}
        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {copy.detail.backToTopics}
      </Link>

      <MetricsSection metrics={data.metrics} />
      <ByPlatformSection rows={data.byPlatform} />
      <TopCitedSection sources={data.topCitedSources} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

interface MetricsSectionProps {
  metrics: TopicMetricsDto;
}
function MetricsSection({ metrics }: MetricsSectionProps) {
  const copy = REPORTS_COPY.topics.detail;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.sections.metrics}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Brand mention rate" value={metrics.brandMentionRate} format="pct" />
          <Metric
            label="Recommendation rate"
            value={metrics.brandRecommendationRate}
            format="pct"
          />
          <Metric label="Share of voice" value={metrics.brandShareOfVoice} format="pct" />
          <Metric label="Avg brand rank" value={metrics.averageBrandRank} format="num" />
          <Metric label="Citations" value={metrics.citationCount} format="int" />
          <Metric label="Owned citations" value={metrics.ownedCitationCount} format="int" />
          <Metric
            label="Competitor citations"
            value={metrics.competitorCitationCount}
            format="int"
          />
          <Metric
            label="Third-party citations"
            value={metrics.thirdPartyCitationCount}
            format="int"
          />
        </div>
        {Object.keys(metrics.brandSentimentDistribution).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Sentiment:</span>
            {Object.entries(metrics.brandSentimentDistribution).map(([sentiment, count]) => (
              <Badge key={sentiment} variant="secondary" className="text-xs">
                {sentiment}: {count}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricProps {
  label: string;
  value: number | null;
  format: "pct" | "num" | "int";
}
function Metric({ label, value, format }: MetricProps) {
  const display =
    value === null
      ? "—"
      : format === "pct"
        ? `${(value * 100).toFixed(1)}%`
        : format === "int"
          ? `${value}`
          : value.toFixed(1);
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold",
          value === null ? "text-neutral-400" : "text-neutral-900",
        )}
      >
        {display}
      </div>
    </div>
  );
}

interface ByPlatformSectionProps {
  rows: readonly TopicPlatformBreakdownDto[];
}
function ByPlatformSection({ rows }: ByPlatformSectionProps) {
  const copy = REPORTS_COPY.topics.detail;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.sections.byPlatform}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noPlatformData}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium">
                    {copy.tableHeaders.platform}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {copy.tableHeaders.answers}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {copy.tableHeaders.mentionRate}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {copy.tableHeaders.recommendationRate}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {copy.tableHeaders.shareOfVoice}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {copy.tableHeaders.citations}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((r) => (
                  <tr key={r.platformId}>
                    <td className="px-4 py-2 font-medium text-neutral-900">{r.platformName}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-900">
                      {r.answerCount}
                    </td>
                    <RateCell value={r.brandMentionRate} />
                    <RateCell value={r.brandRecommendationRate} />
                    <RateCell value={r.brandShareOfVoice} />
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-900">
                      {r.citationCount}
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

function RateCell({ value }: { value: number | null }) {
  return (
    <td
      className={cn(
        "px-4 py-2 text-right tabular-nums",
        value === null ? "text-neutral-400" : "text-neutral-900",
      )}
    >
      {value === null ? "—" : `${(value * 100).toFixed(1)}%`}
    </td>
  );
}

interface TopCitedSectionProps {
  sources: readonly TopicTopCitedSourceDto[];
}
function TopCitedSection({ sources }: TopCitedSectionProps) {
  const copy = REPORTS_COPY.topics.detail;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.sections.topCited}</CardTitle>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noCitedSources}</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {sources.map((s) => (
              <li key={s.sourceId} className="flex items-center justify-between py-2">
                <span className="text-sm text-neutral-900">{s.sourceName}</span>
                <span className="text-sm tabular-nums text-neutral-700">{s.citationCount}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
