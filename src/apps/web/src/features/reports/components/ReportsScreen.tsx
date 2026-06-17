import { useMemo, useState } from "react";
import { CalendarClock, Download, FileText, Send } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import {
  DateRangePicker,
  defaultDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { REPORTS_COPY } from "@/content/reports";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { useWorkspaceCompetitive } from "@/features/reports/hooks/useWorkspaceCompetitive";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import { deriveRecommendations } from "@/features/reports/recommendations";
import type { WorkspaceCompetitiveDto, WorkspaceOverviewDto } from "@/types/api";

export function ReportsScreen() {
  const copy = REPORTS_COPY.reportsPage;
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);

  const overview = useWorkspaceOverview(range, [], [], [], [], [], trackerIds);
  const competitive = useWorkspaceCompetitive(range, [], [], [], [], [], trackerIds);
  const recommendations = useMemo(
    () => deriveRecommendations(overview.data, competitive.data),
    [overview.data, competitive.data],
  );
  const sections = useMemo(
    () =>
      buildReportSections(
        copy.createReport.sections,
        overview.data,
        competitive.data,
        recommendations.length,
      ),
    [copy.createReport.sections, overview.data, competitive.data, recommendations.length],
  );

  if (overview.isLoading) return <LoadingPage />;
  if (overview.isError) {
    return (
      <ErrorPage
        error={overview.error instanceof Error ? overview.error : undefined}
        onReset={() => void overview.refetch()}
      />
    );
  }
  if (!overview.data) return null;

  const readySections = sections.filter((section) => section.ready).length;
  const evidenceLinks =
    overview.data.hero.queries +
    overview.data.hero.mentions +
    overview.data.hero.citations +
    recommendations.length;

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.subtitle}>
        <Button variant="outline" size="sm" disabled>
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          {copy.actions.schedule}
        </Button>
        <Button size="sm" disabled>
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {copy.actions.create}
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
        <DateRangePicker value={range} onChange={setRange} />
        {competitive.isError && (
          <span className="text-xs text-semantic-warning-700">
            {copy.controls.competitiveUnavailable}
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile
          label={copy.summary.reportsCreated}
          value={`${readySections}/${sections.length}`}
          helper={copy.summary.reportsCreatedHelper}
        />
        <SummaryTile
          label={copy.summary.scheduledReports}
          value={evidenceLinks.toLocaleString()}
          helper={copy.summary.scheduledReportsHelper}
        />
        <SummaryTile
          label={copy.summary.lastReportSent}
          value={copy.status.notSent}
          helper={copy.summary.lastReportSentHelper}
        />
        <SummaryTile
          label={copy.summary.openClientActions}
          value={recommendations.length.toLocaleString()}
          helper={copy.summary.openClientActionsHelper}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">
                  {copy.createReport.title}
                </h2>
                <p className="mt-1 text-xs text-neutral-500">{copy.createReport.description}</p>
              </div>
              <Button variant="outline" size="sm" disabled>
                <Download className="h-3.5 w-3.5" aria-hidden />
                {copy.actions.export}
              </Button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {sections.map((section) => (
                <div
                  key={section.name}
                  className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2"
                >
                  <span className="text-sm text-neutral-700">{section.name}</span>
                  <Badge variant={section.ready ? "success" : "outline"}>
                    {section.ready ? copy.status.ready : copy.status.needsData}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-neutral-900">{copy.templates.title}</h2>
            <p className="mt-1 text-xs text-neutral-500">{copy.templates.description}</p>
            <div className="mt-4 space-y-2">
              {copy.templates.items.map((template) => (
                <button
                  key={template}
                  type="button"
                  disabled
                  className="flex w-full items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-left text-sm text-neutral-700 disabled:cursor-not-allowed disabled:opacity-80"
                >
                  <span>{template}</span>
                  <Send className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-neutral-900">{copy.history.title}</h2>
          <p className="mt-1 text-xs text-neutral-500">{copy.history.description}</p>
          <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
            <div className="grid grid-cols-6 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {copy.history.columns.map((column) => (
                <div key={column} className="px-3 py-2">
                  {column}
                </div>
              ))}
            </div>
            <div className="px-3 py-8 text-center text-sm text-neutral-500">
              {copy.history.empty}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ReportSectionReadiness {
  name: string;
  ready: boolean;
}

function buildReportSections(
  sectionNames: readonly string[],
  overview: WorkspaceOverviewDto | undefined,
  competitive: WorkspaceCompetitiveDto | undefined,
  recommendationCount: number,
): ReportSectionReadiness[] {
  const hasOverview = (overview?.hero.queries ?? 0) > 0;
  const hasEntities = (overview?.topEntities.length ?? 0) > 0;
  const hasRecommendations = recommendationCount > 0;
  const hasCompetitors =
    (competitive?.mentionDistribution.length ?? 0) > 0 ||
    (competitive?.competitiveGaps.length ?? 0) > 0;
  const hasSources = (overview?.hero.citations ?? 0) > 0;
  const hasTopics = (overview?.topicOwnership.length ?? 0) > 0;
  const hasClaims =
    (overview?.recentFactualClaims.length ?? 0) > 0 ||
    (overview?.topBrandRiskFlags.length ?? 0) > 0;

  return sectionNames.map((name) => ({
    name,
    ready:
      name === "Executive summary"
        ? hasOverview
        : name === "Visibility scorecards"
          ? hasEntities
          : name === "Lens performance"
            ? hasOverview
            : name === "Recommendations"
              ? hasRecommendations
              : name === "Competitors"
                ? hasCompetitors
                : name === "Sources and citations"
                  ? hasSources
                  : name === "Topics and content gaps"
                    ? hasTopics
                    : name === "Claims and risks"
                      ? hasClaims
                      : hasOverview || hasRecommendations || hasSources,
  }));
}

function SummaryTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
        <p className="mt-1 text-xs text-neutral-500">{helper}</p>
      </CardContent>
    </Card>
  );
}
