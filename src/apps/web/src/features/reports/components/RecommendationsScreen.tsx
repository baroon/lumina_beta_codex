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
import { useWorkspaceCompetitive } from "@/features/reports/hooks/useWorkspaceCompetitive";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import {
  deriveRecommendations,
  type RecommendationImpact,
  type RecommendationItem,
  type RecommendationStatus,
} from "@/features/reports/recommendations";

export function RecommendationsScreen() {
  const copy = REPORTS_COPY.recommendationsPage;
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);
  const [selected, setSelected] = useState<RecommendationItem | null>(null);

  const overview = useWorkspaceOverview(range, [], [], [], [], [], trackerIds);
  const competitive = useWorkspaceCompetitive(range, [], [], [], [], [], trackerIds);

  const recommendations = useMemo(
    () => deriveRecommendations(overview.data, competitive.data),
    [overview.data, competitive.data],
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
          <button type="button" onClick={() => setSelected(row.original)} className="text-left">
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
          <Button variant="ghost" size="sm" onClick={() => setSelected(row.original)}>
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

  const highImpactCount = recommendations.filter((r) => r.impact === "High").length;
  const evidenceCount = recommendations.reduce((sum, r) => sum + r.evidenceCount, 0);

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.subtitle}>
        <Button variant="outline" size="sm" disabled>
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {copy.actions.createReport}
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

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryTile
          label={copy.summary.openRecommendations}
          value={recommendations.length.toLocaleString()}
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

      <DataTable
        columns={columns}
        data={recommendations}
        getRowId={(item) => item.id}
        initialSorting={[{ id: "priority", desc: false }]}
        emptyMessage={<RecommendationsEmptyState copy={copy.empty} />}
      />

      <RecommendationDrawer item={selected} onClose={() => setSelected(null)} copy={copy} />
    </div>
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
  copy,
}: {
  item: RecommendationItem | null;
  onClose: () => void;
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
          <Button variant="outline" size="sm" disabled>
            {copy.actions.addToReport}
          </Button>
          <Button size="sm" disabled>
            {copy.actions.markPlanned}
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
