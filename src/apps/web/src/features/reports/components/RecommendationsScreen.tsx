import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, CheckCircle2, FileText, Lightbulb, X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { DataTable } from "@/components/molecules/DataTable";
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
import { cn } from "@/lib/utils";
import { useWorkspaceCompetitive } from "@/features/reports/hooks/useWorkspaceCompetitive";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import {
  deriveQuickWins,
  deriveRecommendations,
  summarizeRecommendationCategories,
  type RecommendationImpact,
  type RecommendationItem,
  type RecommendationStatus,
  type RecommendationCategorySummary,
} from "@/features/reports/recommendations";

export function RecommendationsScreen() {
  const copy = REPORTS_COPY.recommendationsPage;
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RecommendationStatus | "all">("all");
  const [impactFilter, setImpactFilter] = useState<RecommendationImpact | "all">("all");
  const [lensFilter, setLensFilter] = useState<string>("all");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, RecommendationStatus>>({});
  const [reportQueue, setReportQueue] = useState<Record<string, RecommendationItem>>({});
  const [briefQueue, setBriefQueue] = useState<Record<string, true>>({});
  const [reportNotice, setReportNotice] = useState<string | null>(null);

  const overview = useWorkspaceOverview(range, [], [], [], [], [], trackerIds);
  const competitive = useWorkspaceCompetitive(range, [], [], [], [], [], trackerIds);

  const recommendations = useMemo(
    () =>
      deriveRecommendations(overview.data, competitive.data).map((item) => ({
        ...item,
        status: statusOverrides[item.id] ?? item.status,
      })),
    [competitive.data, overview.data, statusOverrides],
  );
  const selected = useMemo(
    () => recommendations.find((item) => item.id === selectedId) ?? null,
    [recommendations, selectedId],
  );
  const lensOptions = useMemo(
    () => Array.from(new Set(recommendations.map((item) => item.lens))).sort(),
    [recommendations],
  );
  const filteredRecommendations = useMemo(
    () =>
      recommendations.filter((item) => {
        if (statusFilter !== "all" && item.status !== statusFilter) return false;
        if (impactFilter !== "all" && item.impact !== impactFilter) return false;
        if (lensFilter !== "all" && item.lens !== lensFilter) return false;
        return true;
      }),
    [impactFilter, lensFilter, recommendations, statusFilter],
  );
  const columns = useMemo<ColumnDef<RecommendationItem, unknown>[]>(
    () => [
      {
        accessorKey: "priority",
        header: copy.table.priority,
        cell: ({ row }) => (
          <span className="font-medium tabular-nums text-neutral-900">
            #{row.original.priority}
          </span>
        ),
        meta: { cellClassName: "w-24" },
      },
      {
        accessorKey: "title",
        header: copy.table.action,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => setSelectedId(row.original.id)}
            className="text-left"
          >
            <span className="font-medium text-neutral-900 hover:text-primary-700">
              {row.original.title}
            </span>
            <span className="mt-0.5 block max-w-xl text-xs text-neutral-500">
              {row.original.summary}
            </span>
          </button>
        ),
        meta: { cellClassName: "min-w-72" },
      },
      {
        accessorKey: "lens",
        header: copy.table.lens,
        cell: ({ row }) => <Badge variant="outline">{row.original.lens}</Badge>,
      },
      {
        accessorKey: "impact",
        header: copy.table.impact,
        cell: ({ row }) => <ImpactBadge impact={row.original.impact} />,
      },
      {
        accessorKey: "effort",
        header: copy.table.effort,
        cell: ({ row }) => row.original.effort,
      },
      {
        accessorKey: "evidenceCount",
        header: copy.table.evidence,
        cell: ({ row }) =>
          `${row.original.evidenceCount.toLocaleString()} ${row.original.evidenceLabel}`,
      },
      {
        accessorKey: "status",
        header: copy.table.status,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "open",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(row.original.id)}>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">{copy.actions.open}</span>
          </Button>
        ),
        meta: { align: "right", cellClassName: "w-16" },
      },
    ],
    [copy],
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

  const highImpactCount = filteredRecommendations.filter((r) => r.impact === "High").length;
  const evidenceCount = filteredRecommendations.reduce((sum, r) => sum + r.evidenceCount, 0);
  const categorySummaries = summarizeRecommendationCategories(filteredRecommendations);
  const quickWins = deriveQuickWins(filteredRecommendations);
  const filtersActive = statusFilter !== "all" || impactFilter !== "all" || lensFilter !== "all";

  function createRecommendationsReport(items = filteredRecommendations) {
    exportRecommendationsReport(items, range);
    setReportNotice(copy.drawer.reportCreated.replace("{count}", items.length.toLocaleString()));
  }

  function addRecommendationToReport(item: RecommendationItem) {
    setReportQueue((current) => ({ ...current, [item.id]: item }));
    setReportNotice(copy.drawer.reportNotice.replace("{title}", item.title));
  }

  function createRecommendationBrief(item: RecommendationItem) {
    exportRecommendationBrief(item, range);
    setBriefQueue((current) => ({ ...current, [item.id]: true }));
    setReportNotice(copy.drawer.briefNotice.replace("{title}", item.title));
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.subtitle}>
        <Button variant="outline" size="sm" onClick={() => createRecommendationsReport()}>
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {copy.actions.createReport}
        </Button>
      </PageHeader>

      {reportNotice && (
        <div className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-xs text-primary-800">
          {reportNotice}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
        <DateRangePicker value={range} onChange={setRange} />
        <FilterPill
          active={statusFilter === "all"}
          label={copy.controls.allStatuses}
          onClick={() => setStatusFilter("all")}
        />
        {(["Open", "Planned", "Done"] as const).map((status) => (
          <FilterPill
            key={status}
            active={statusFilter === status}
            label={status}
            onClick={() => setStatusFilter(status)}
          />
        ))}
        <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden />
        <FilterPill
          active={impactFilter === "all"}
          label={copy.controls.allImpacts}
          onClick={() => setImpactFilter("all")}
        />
        {(["High", "Medium", "Low"] as const).map((impact) => (
          <FilterPill
            key={impact}
            active={impactFilter === impact}
            label={impact}
            onClick={() => setImpactFilter(impact)}
          />
        ))}
        <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden />
        <FilterPill
          active={lensFilter === "all"}
          label={copy.controls.allLenses}
          onClick={() => setLensFilter("all")}
        />
        {lensOptions.map((lens) => (
          <FilterPill
            key={lens}
            active={lensFilter === lens}
            label={lens}
            onClick={() => setLensFilter(lens)}
          />
        ))}
        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter("all");
              setImpactFilter("all");
              setLensFilter("all");
            }}
            className="ml-auto text-xs font-medium text-primary-700 hover:text-primary-800"
          >
            {copy.controls.clearFilters}
          </button>
        )}
        {competitive.isError && (
          <span className="text-xs text-semantic-warning-700">
            {copy.controls.competitiveUnavailable}
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryTile
          label={copy.summary.openRecommendations}
          value={filteredRecommendations.length.toLocaleString()}
          helper={copy.summary.openRecommendationsHelper}
        />
        <SummaryTile
          label={copy.summary.highImpact}
          value={highImpactCount.toLocaleString()}
          helper={copy.summary.highImpactHelper}
        />
        <SummaryTile
          label={copy.summary.evidenceLinks}
          value={evidenceCount.toLocaleString()}
          helper={copy.summary.evidenceLinksHelper}
        />
      </div>

      {categorySummaries.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">{copy.categories.title}</h2>
              <p className="mt-1 text-xs text-neutral-500">{copy.categories.description}</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {categorySummaries.map((summary) => (
                <RecommendationCategoryCard key={summary.category} summary={summary} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {quickWins.length > 0 && (
        <QuickWinsSection
          items={quickWins}
          onOpen={setSelectedId}
          onMarkPlanned={(id) => setStatusOverrides((current) => ({ ...current, [id]: "Planned" }))}
        />
      )}

      <DataTable
        columns={columns}
        data={filteredRecommendations}
        getRowId={(item) => item.id}
        initialSorting={[{ id: "priority", desc: false }]}
        emptyMessage={<RecommendationsEmptyState copy={copy.empty} />}
      />

      <RecommendationDrawer
        item={selected}
        onClose={() => setSelectedId(null)}
        onStatusChange={(id, status) =>
          setStatusOverrides((current) => ({ ...current, [id]: status }))
        }
        onAddToReport={addRecommendationToReport}
        onCreateBrief={createRecommendationBrief}
        addedToReport={selected ? Boolean(reportQueue[selected.id]) : false}
        briefCreated={selected ? Boolean(briefQueue[selected.id]) : false}
        copy={copy}
      />
    </div>
  );
}

function QuickWinsSection({
  items,
  onOpen,
  onMarkPlanned,
}: {
  items: readonly RecommendationItem[];
  onOpen: (id: string) => void;
  onMarkPlanned: (id: string) => void;
}) {
  const copy = REPORTS_COPY.recommendationsPage.quickWins;

  return (
    <section aria-labelledby="recommendation-quick-wins-title">
      <Card>
        <CardContent className="p-5">
          <div>
            <h2
              id="recommendation-quick-wins-title"
              className="text-sm font-semibold text-neutral-900"
            >
              {copy.title}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">{copy.description}</p>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex min-h-44 flex-col rounded-md border border-neutral-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <Badge variant="outline">#{item.priority}</Badge>
                  <ImpactBadge impact={item.impact} />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-neutral-900">{item.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{item.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <Badge variant="secondary">{item.lens}</Badge>
                  <span>
                    {item.evidenceCount.toLocaleString()} {item.evidenceLabel}
                  </span>
                </div>
                <div className="mt-auto flex justify-end gap-2 pt-4">
                  <Button variant="ghost" size="sm" onClick={() => onOpen(item.id)}>
                    {copy.view}
                  </Button>
                  <Button size="sm" onClick={() => onMarkPlanned(item.id)}>
                    {copy.markPlanned}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function RecommendationCategoryCard({ summary }: { summary: RecommendationCategorySummary }) {
  const copy = REPORTS_COPY.recommendationsPage.categories;
  const highImpact =
    summary.highImpactCount === 1
      ? copy.highImpactOne
      : copy.highImpact.replace("{count}", summary.highImpactCount.toLocaleString());

  return (
    <div className="rounded-md border border-neutral-200 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-neutral-900">{summary.category}</p>
        <Badge variant={summary.highImpactCount > 0 ? "warning" : "outline"}>
          {summary.count.toLocaleString()}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-neutral-500">{highImpact}</p>
    </div>
  );
}

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary-200 bg-primary-50 text-primary-700"
          : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
      )}
    >
      {label}
    </button>
  );
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

function ImpactBadge({ impact }: { impact: RecommendationImpact }) {
  const variant = impact === "High" ? "destructive" : impact === "Medium" ? "warning" : "outline";
  return <Badge variant={variant}>{impact}</Badge>;
}

function RecommendationsEmptyState({
  copy,
}: {
  copy: typeof REPORTS_COPY.recommendationsPage.empty;
}) {
  return (
    <div className="p-5 text-center">
      <Lightbulb className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <h2 className="mt-3 text-sm font-semibold text-neutral-900">{copy.title}</h2>
      <p className="mx-auto mt-1 max-w-xl text-sm text-neutral-500">{copy.description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: RecommendationStatus }) {
  if (status === "Done") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />
        Done
      </Badge>
    );
  }
  return <Badge variant={status === "Planned" ? "secondary" : "outline"}>{status}</Badge>;
}

function RecommendationDrawer({
  item,
  onClose,
  onStatusChange,
  onAddToReport,
  onCreateBrief,
  addedToReport,
  briefCreated,
  copy,
}: {
  item: RecommendationItem | null;
  onClose: () => void;
  onStatusChange: (id: string, status: RecommendationStatus) => void;
  onAddToReport: (item: RecommendationItem) => void;
  onCreateBrief: (item: RecommendationItem) => void;
  addedToReport: boolean;
  briefCreated: boolean;
  copy: typeof REPORTS_COPY.recommendationsPage;
}) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/20" role="presentation" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="recommendation-drawer-title"
        className="ml-auto flex h-full w-full max-w-xl flex-col border-l border-neutral-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-neutral-200 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {copy.drawer.eyebrow}
            </p>
            <h2 id="recommendation-drawer-title" className="mt-1 text-lg font-semibold">
              {item.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.actions.close}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <DrawerSection title={copy.drawer.why}>{item.why}</DrawerSection>
          <DrawerSection title={copy.drawer.implementation}>{item.action}</DrawerSection>
          <div className="grid grid-cols-2 gap-3">
            <DrawerMeta label={copy.drawer.lens} value={item.lens} />
            <DrawerMeta label={copy.drawer.status} value={item.status} />
            <DrawerMeta label={copy.drawer.impact} value={item.impact} />
            <DrawerMeta label={copy.drawer.effort} value={item.effort} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">{copy.drawer.evidence}</h3>
            <ul className="mt-2 space-y-2">
              {item.evidence.map((evidence) => (
                <li
                  key={evidence}
                  className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
                >
                  {evidence}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddToReport(item)}
            disabled={addedToReport}
          >
            {addedToReport ? copy.actions.addedToReport : copy.actions.addToReport}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCreateBrief(item)}
            disabled={briefCreated}
          >
            {briefCreated ? copy.actions.briefCreated : copy.actions.createBrief}
          </Button>
          {item.status !== "Open" && (
            <Button variant="outline" size="sm" onClick={() => onStatusChange(item.id, "Open")}>
              {copy.actions.reopen}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusChange(item.id, "Planned")}
            disabled={item.status === "Planned"}
          >
            {copy.actions.markPlanned}
          </Button>
          <Button
            size="sm"
            onClick={() => onStatusChange(item.id, "Done")}
            disabled={item.status === "Done"}
          >
            {copy.actions.markDone}
          </Button>
        </div>
      </aside>
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{children}</p>
    </section>
  );
}

function DrawerMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-neutral-900">{value}</p>
    </div>
  );
}

function exportRecommendationsReport(
  recommendations: readonly RecommendationItem[],
  range: DateRangeSelection,
) {
  const payload = JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      dateRange: serializeDateRange(range),
      actionCount: recommendations.length,
      recommendations: recommendations.map((item) => ({
        id: item.id,
        priority: item.priority,
        title: item.title,
        summary: item.summary,
        lens: item.lens,
        impact: item.impact,
        effort: item.effort,
        evidenceCount: item.evidenceCount,
        evidenceLabel: item.evidenceLabel,
        status: item.status,
        action: item.action,
        evidence: item.evidence,
      })),
    },
    null,
    2,
  );
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `recommendations-report-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportRecommendationBrief(item: RecommendationItem, range: DateRangeSelection) {
  const payload = JSON.stringify(
    {
      packageType: "recommendation-implementation-brief",
      createdAt: new Date().toISOString(),
      dateRange: serializeDateRange(range),
      recommendation: {
        id: item.id,
        priority: item.priority,
        title: item.title,
        summary: item.summary,
        lens: item.lens,
        impact: item.impact,
        effort: item.effort,
        status: item.status,
        why: item.why,
        suggestedImplementation: item.action,
        evidenceCount: item.evidenceCount,
        evidenceLabel: item.evidenceLabel,
        evidence: item.evidence,
      },
      nextSteps: [
        "Review the evidence and confirm the business context.",
        "Assign an owner and due date in the team's execution system.",
        "Publish or update the relevant content, proof point, citation source, or claim correction.",
        "Run the next scan and compare the affected lens and evidence count.",
      ],
    },
    null,
    2,
  );
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `recommendation-brief-${item.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function serializeDateRange(range: DateRangeSelection) {
  switch (range.kind) {
    case "preset":
      return { kind: "preset", days: range.days };
    case "custom":
      return {
        kind: "custom",
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      };
    case "all":
      return { kind: "all" };
  }
}
