import { useMemo, useState } from "react";
import { CalendarClock, Download, Eye, FileText, Link2, Send } from "lucide-react";
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
import { deriveReportPackageSummary, sectionsForReportTemplate } from "@/features/reports/reports";
import { cn } from "@/lib/utils";
import type { WorkspaceCompetitiveDto, WorkspaceOverviewDto } from "@/types/api";

type ReportTemplateName = (typeof REPORTS_COPY.reportsPage.templates.items)[number];

interface GeneratedReport {
  id: string;
  name: string;
  template: ReportTemplateName;
  dateRange: string;
  createdBy: string;
  sharedWith: string;
  status: "Draft" | "Scheduled" | "Shared";
  lastOpened: string;
  sections: readonly ReportSectionReadiness[];
  readinessPercent: number;
}

export function ReportsScreen() {
  const copy = REPORTS_COPY.reportsPage;
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateName>(
    copy.templates.items[0],
  );
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const overview = useWorkspaceOverview(range, [], [], [], [], [], trackerIds);
  const competitive = useWorkspaceCompetitive(range, [], [], [], [], [], trackerIds);
  const recommendations = useMemo(
    () => deriveRecommendations(overview.data, competitive.data),
    [overview.data, competitive.data],
  );
  const allSections = useMemo(
    () =>
      buildReportSections(
        copy.createReport.sections,
        overview.data,
        competitive.data,
        recommendations.length,
      ),
    [copy.createReport.sections, overview.data, competitive.data, recommendations.length],
  );
  const sections = useMemo(
    () =>
      sectionsForReportTemplate(
        selectedTemplate,
        allSections.map((section) => section.name),
      )
        .map((name) => allSections.find((section) => section.name === name))
        .filter((section): section is ReportSectionReadiness => section != null),
    [allSections, selectedTemplate],
  );
  const reportPackage = useMemo(() => deriveReportPackageSummary(sections), [sections]);

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

  const readySections = reportPackage.readySections.length;
  const latestReport = generatedReports[0];
  const scheduledReports = generatedReports.filter((report) => report.status === "Scheduled");
  const selectedReport = latestReport ?? buildGeneratedReport(selectedTemplate, range, sections);

  function createReport(status: GeneratedReport["status"] = "Draft") {
    const next = buildGeneratedReport(selectedTemplate, range, sections, status);
    setGeneratedReports((current) => [next, ...current]);
    setPreviewOpen(true);
    return next;
  }

  function exportReport(report = selectedReport) {
    exportReportPackage(report);
  }

  async function shareReport(report = selectedReport) {
    const url = `${window.location.origin}/reports?report=${encodeURIComponent(report.id)}`;
    try {
      await navigator.clipboard?.writeText(url);
      setShareNotice(copy.preview.shareCopied.replace("{name}", report.name));
    } catch {
      setShareNotice(copy.preview.shareReady.replace("{url}", url));
    }
  }

  function scheduleReport() {
    createReport("Scheduled");
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.subtitle}>
        <Button variant="outline" size="sm" onClick={scheduleReport}>
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          {copy.actions.schedule}
        </Button>
        <Button size="sm" onClick={() => createReport()}>
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
          value={generatedReports.length.toLocaleString()}
          helper={copy.summary.reportsCreatedHelper}
        />
        <SummaryTile
          label={copy.summary.scheduledReports}
          value={scheduledReports.length.toLocaleString()}
          helper={copy.summary.scheduledReportsHelper}
        />
        <SummaryTile
          label={copy.summary.lastReportSent}
          value={latestReport ? latestReport.lastOpened : copy.status.notSent}
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
          <CardContent className="p-5" role="region" aria-labelledby="create-report-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="create-report-title" className="text-sm font-semibold text-neutral-900">
                  {copy.createReport.title}
                </h2>
                <p className="mt-1 text-xs text-neutral-500">{copy.createReport.description}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportReport()}>
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

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-neutral-900">{copy.templates.title}</h2>
              <p className="mt-1 text-xs text-neutral-500">{copy.templates.description}</p>
              <div className="mt-4 space-y-2">
                {copy.templates.items.map((template) => {
                  const isSelected = selectedTemplate === template;
                  return (
                    <button
                      key={template}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedTemplate(template)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition",
                        isSelected
                          ? "border-primary-500 bg-primary-50 text-primary-800"
                          : "border-neutral-200 text-neutral-700 hover:bg-neutral-50",
                      )}
                    >
                      <span>{template}</span>
                      <Send
                        className={cn(
                          "h-3.5 w-3.5",
                          isSelected ? "text-primary-700" : "text-neutral-400",
                        )}
                        aria-hidden
                      />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5" role="region" aria-labelledby="report-preview-title">
              <h2 id="report-preview-title" className="text-sm font-semibold text-neutral-900">
                {copy.preview.title}
              </h2>
              <p className="mt-1 text-xs text-neutral-500">{copy.preview.description}</p>
              {previewOpen && (
                <div className="mt-3 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-800">
                  {copy.preview.packageReady.replace("{name}", selectedReport.name)}
                </div>
              )}
              <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  {copy.preview.selectedTemplate}
                </p>
                <p className="mt-1 text-sm font-medium text-neutral-900">{selectedTemplate}</p>
              </div>
              <div className="mt-3 rounded-md border border-neutral-200 px-3 py-2">
                <p className="text-sm font-medium text-neutral-900">
                  {readySections}/{reportPackage.totalSections} {copy.preview.readySections}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {copy.preview.includedSections.replace(
                    "{count}",
                    reportPackage.totalSections.toString(),
                  )}
                </p>
              </div>
              <div className="mt-3 rounded-md border border-neutral-200 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    {copy.preview.readinessScore}
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-neutral-900">
                    {reportPackage.readinessPercent}%
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-primary-500"
                    style={{ width: `${reportPackage.readinessPercent}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ReportSectionList
                  title={copy.preview.readyList}
                  items={reportPackage.readySections}
                  empty={copy.preview.noReady}
                  status={copy.status.ready}
                  statusVariant="success"
                />
                <ReportSectionList
                  title={copy.preview.missingList}
                  items={reportPackage.missingSections}
                  empty={copy.preview.allReady}
                  status={copy.status.needsData}
                  statusVariant="outline"
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setPreviewOpen((current) => !current)}>
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  {copy.preview.actions.preview}
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportReport()}>
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  {copy.preview.actions.exportPdf}
                </Button>
                <Button variant="outline" size="sm" onClick={() => void shareReport()}>
                  <Link2 className="h-3.5 w-3.5" aria-hidden />
                  {copy.preview.actions.shareLink}
                </Button>
              </div>
              {shareNotice && <p className="mt-2 text-xs text-primary-700">{shareNotice}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5" role="region" aria-labelledby="schedule-delivery-title">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="schedule-delivery-title"
                    className="text-sm font-semibold text-neutral-900"
                  >
                    {copy.schedule.title}
                  </h2>
                  <p className="mt-1 text-xs text-neutral-500">{copy.schedule.description}</p>
                </div>
                <Badge variant="outline">{copy.status.planned}</Badge>
              </div>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-neutral-500">{copy.schedule.cadenceLabel}</dt>
                  <dd className="font-medium text-neutral-900">{copy.schedule.cadence}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-neutral-500">{copy.schedule.recipientsLabel}</dt>
                  <dd className="font-medium text-neutral-900">{copy.schedule.recipients}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-neutral-500">{copy.schedule.templateLabel}</dt>
                  <dd className="font-medium text-neutral-900">{selectedTemplate}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-neutral-500">{copy.schedule.readinessLabel}</dt>
                  <dd className="font-medium text-neutral-900">
                    {copy.schedule.readiness
                      .replace("{ready}", readySections.toString())
                      .replace("{total}", sections.length.toString())}
                  </dd>
                </div>
              </dl>

              <Button
                className="mt-4 w-full justify-center"
                variant="outline"
                size="sm"
                onClick={scheduleReport}
              >
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                {copy.schedule.action}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-neutral-900">{copy.history.title}</h2>
          <p className="mt-1 text-xs text-neutral-500">{copy.history.description}</p>
          <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
            <div className="grid min-w-[920px] grid-cols-8 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {copy.history.columns.map((column) => (
                <div key={column} className="px-3 py-2">
                  {column}
                </div>
              ))}
            </div>
            {generatedReports.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-neutral-500">
                {copy.history.empty}
              </div>
            ) : (
              <div className="divide-y divide-neutral-200">
                {generatedReports.map((report) => (
                  <div
                    key={report.id}
                    className="grid min-w-[920px] grid-cols-8 items-center text-sm"
                  >
                    <div className="px-3 py-3 font-medium text-neutral-900">{report.name}</div>
                    <div className="px-3 py-3 text-neutral-600">{copy.history.trackerScope}</div>
                    <div className="px-3 py-3 text-neutral-600">{report.dateRange}</div>
                    <div className="px-3 py-3 text-neutral-600">{report.createdBy}</div>
                    <div className="px-3 py-3 text-neutral-600">{report.sharedWith}</div>
                    <div className="px-3 py-3">
                      <Badge variant={report.status === "Scheduled" ? "secondary" : "outline"}>
                        {report.status}
                      </Badge>
                    </div>
                    <div className="px-3 py-3 text-neutral-600">{report.lastOpened}</div>
                    <div className="flex gap-1 px-3 py-3">
                      <Button variant="ghost" size="sm" onClick={() => exportReport(report)}>
                        <Download className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => void shareReport(report)}>
                        <Link2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

function buildGeneratedReport(
  template: ReportTemplateName,
  range: DateRangeSelection,
  sections: readonly ReportSectionReadiness[],
  status: GeneratedReport["status"] = "Draft",
): GeneratedReport {
  const summary = deriveReportPackageSummary(sections);
  const now = new Date();
  return {
    id: `${template.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${now.getTime()}`,
    name: `${template} - ${formatReportDate(now)}`,
    template,
    dateRange: formatReportRange(range),
    createdBy: "Workspace user",
    sharedWith: status === "Scheduled" ? "Client stakeholders" : "Not shared",
    status,
    lastOpened: formatReportDate(now),
    sections,
    readinessPercent: summary.readinessPercent,
  };
}

function exportReportPackage(report: GeneratedReport) {
  const payload = JSON.stringify(
    {
      id: report.id,
      name: report.name,
      template: report.template,
      dateRange: report.dateRange,
      status: report.status,
      readinessPercent: report.readinessPercent,
      sections: report.sections,
    },
    null,
    2,
  );
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${report.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatReportRange(range: DateRangeSelection) {
  switch (range.kind) {
    case "preset":
      return `Last ${range.days} days`;
    case "custom":
      return `${formatReportDate(range.from)} - ${formatReportDate(range.to)}`;
    case "all":
      return "All time";
  }
}

function formatReportDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
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

function ReportSectionList({
  title,
  items,
  empty,
  status,
  statusVariant,
}: {
  title: string;
  items: readonly string[];
  empty: string;
  status: string;
  statusVariant: "success" | "outline";
}) {
  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-neutral-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <li key={item} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-neutral-700">{item}</span>
              <Badge variant={statusVariant}>{status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
