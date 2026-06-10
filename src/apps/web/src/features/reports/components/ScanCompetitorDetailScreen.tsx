import { Link } from "@tanstack/react-router";
import { ArrowLeft, Globe } from "lucide-react";
import { ApiError } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { ScanBreadcrumb } from "@/features/reports/components/ScanBreadcrumb";
import { useScanCompetitor } from "@/features/reports/hooks/useScanCompetitor";
import { cn } from "@/lib/utils";
import type { CompetitorMentionSourceDto, CompetitorMetricsDto } from "@/types/api";

interface ScanCompetitorDetailScreenProps {
  scanRunId: string;
  competitorId: string;
}

/**
 * Competitor detail screen (Phase 4 Slice 4, D17). Two sections: metric
 * tiles + sources cited on answers that mentioned this competitor — the
 * v1 surface for "which sources do AI assistants cite when discussing
 * this competitor?" without the full Findings-anchored evidence view.
 */
export function ScanCompetitorDetailScreen({
  scanRunId,
  competitorId,
}: ScanCompetitorDetailScreenProps) {
  const { data, isLoading, isError, error, refetch } = useScanCompetitor(scanRunId, competitorId);
  const copy = REPORTS_COPY.competitors;

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
      <ScanBreadcrumb scanRunId={scanRunId} currentLabel={data.name} />
      <PageHeader title={data.name} description={data.domain ?? copy.subtitle} />

      <Link
        to="/scans/$scanRunId/competitors"
        params={{ scanRunId }}
        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {copy.detail.backToCompetitors}
      </Link>

      <MetricsSection metrics={data.metrics} />
      <SourcesSection sources={data.sourcesMentioningCompetitor} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

interface MetricsSectionProps {
  metrics: CompetitorMetricsDto;
}
function MetricsSection({ metrics }: MetricsSectionProps) {
  const copy = REPORTS_COPY.competitors.detail;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.sections.metrics}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Mentions" value={metrics.mentionCount} format="int" />
          <Metric label="Mention rate" value={metrics.mentionRate} format="pct" />
          <Metric label="Recommendations" value={metrics.recommendationCount} format="int" />
          <Metric label="Recommendation rate" value={metrics.recommendationRate} format="pct" />
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricProps {
  label: string;
  value: number | null;
  format: "pct" | "int";
}
function Metric({ label, value, format }: MetricProps) {
  const display =
    value === null ? "—" : format === "pct" ? `${(value * 100).toFixed(1)}%` : `${value}`;
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

interface SourcesSectionProps {
  sources: readonly CompetitorMentionSourceDto[];
}
function SourcesSection({ sources }: SourcesSectionProps) {
  const copy = REPORTS_COPY.competitors.detail;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.sections.sources}</CardTitle>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noSources}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium">
                    {copy.tableHeaders.source}
                  </th>
                  <th scope="col" className="px-4 py-2 text-left font-medium">
                    {copy.tableHeaders.domain}
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {copy.tableHeaders.citations}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sources.map((s) => (
                  <tr key={s.sourceId}>
                    <td className="px-4 py-2 font-medium text-neutral-900">{s.sourceName}</td>
                    <td className="px-4 py-2 text-neutral-700">
                      {s.normalizedDomain ? (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="h-3 w-3 text-neutral-400" aria-hidden="true" />
                          {s.normalizedDomain}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-neutral-900">
                      {s.citationCount}
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
