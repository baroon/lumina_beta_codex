import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, FileText, ScanSearch } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { Progress } from "@/components/atoms/progress";
import { DataTable } from "@/components/molecules/DataTable";
import {
  DateRangePicker,
  defaultDateRangeSelection,
  type DateRangeSelection,
} from "@/components/molecules/DateRangePicker";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { LENSES_COPY, VISIBILITY_LENSES } from "@/content/lenses";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { useLensCounts } from "@/features/reports/hooks/useLensCounts";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import type { LensCountDto } from "@/types/api";

interface LensRow {
  code: string;
  slug: string;
  name: string;
  description: string;
  mentionCount: number;
  share: number;
}

const LENS_SLUGS: Record<string, string> = {
  Discovery: "discovery",
  BuyingIntent: "buying-intent",
  CompetitorComparison: "competitive",
  SentimentAndTrust: "sentiment",
  CitationVisibility: "citations",
  ContentGaps: "content-gaps",
};

export function LensesScreen() {
  const copy = LENSES_COPY.page;
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  const [range, setRange] = useState<DateRangeSelection>(defaultDateRangeSelection);

  const overview = useWorkspaceOverview(range, [], [], [], [], [], trackerIds);
  const lensCounts = useLensCounts(range);
  const rows = useMemo(() => buildLensRows(lensCounts.data ?? []), [lensCounts.data]);

  const columns = useMemo<ColumnDef<LensRow, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: copy.table.lens,
        cell: ({ row }) => (
          <Link to="/lenses/$lensId" params={{ lensId: row.original.slug }} className="text-left">
            <span className="font-medium text-neutral-900 hover:text-primary-700">
              {row.original.name}
            </span>
            <span className="mt-0.5 block max-w-xl text-xs text-neutral-500">
              {row.original.description}
            </span>
          </Link>
        ),
        meta: { cellClassName: "min-w-72" },
      },
      {
        accessorKey: "mentionCount",
        header: copy.table.mentions,
        cell: ({ row }) => row.original.mentionCount.toLocaleString(),
        meta: { align: "right", cellClassName: "w-28" },
      },
      {
        accessorKey: "share",
        header: copy.table.share,
        cell: ({ row }) => (
          <div className="min-w-36 space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium tabular-nums text-neutral-900">
                {formatRate(row.original.share)}
              </span>
              <span className="text-neutral-500">
                {row.original.mentionCount} {copy.table.mentionUnit}
              </span>
            </div>
            <Progress value={row.original.share * 100} progressSize="sm" />
          </div>
        ),
        meta: { className: "min-w-44" },
      },
      {
        id: "status",
        header: copy.table.status,
        cell: ({ row }) => <LensStatusBadge row={row.original} />,
      },
      {
        id: "open",
        header: copy.table.action,
        enableSorting: false,
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="sm">
            <Link to="/lenses/$lensId" params={{ lensId: row.original.slug }}>
              {copy.actions.open}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        ),
        meta: { align: "right", cellClassName: "w-32" },
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

  const totalLensMentions = rows.reduce((sum, row) => sum + row.mentionCount, 0);

  return (
    <div className="space-y-5">
      <PageHeader title={copy.title} description={copy.description}>
        <Button variant="outline" size="sm" disabled>
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {copy.actions.export}
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
        <DateRangePicker value={range} onChange={setRange} />
        {lensCounts.isError && (
          <span className="text-xs text-semantic-warning-700">
            {copy.controls.countsUnavailable}
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile
          label={copy.summary.lenses}
          value={VISIBILITY_LENSES.length.toLocaleString()}
          helper={copy.summary.lensesHelper}
        />
        <SummaryTile
          label={copy.summary.questions}
          value={overview.data.hero.queries.toLocaleString()}
          helper={copy.summary.questionsHelper}
        />
        <SummaryTile
          label={copy.summary.mentions}
          value={overview.data.hero.mentions.toLocaleString()}
          helper={copy.summary.mentionsHelper}
        />
        <SummaryTile
          label={copy.summary.citations}
          value={overview.data.hero.citations.toLocaleString()}
          helper={copy.summary.citationsHelper}
        />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">{copy.table.lens}</h2>
              <p className="mt-1 text-xs text-neutral-500">
                {copy.table.mentionSummary.replace("{count}", totalLensMentions.toLocaleString())}
              </p>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(row) => row.code}
            initialSorting={[{ id: "mentionCount", desc: true }]}
            emptyMessage={<LensesEmptyState />}
          />
        </CardContent>
      </Card>
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

function LensStatusBadge({ row }: { row: LensRow }) {
  const copy = LENSES_COPY.page.status;
  if (row.mentionCount === 0) return <Badge variant="secondary">{copy.empty}</Badge>;
  if (row.share < 0.1) return <Badge variant="warning">{copy.sparse}</Badge>;
  return <Badge variant="success">{copy.healthy}</Badge>;
}

function LensesEmptyState() {
  return (
    <div className="p-5 text-center">
      <ScanSearch className="mx-auto h-8 w-8 text-neutral-400" aria-hidden />
      <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-500">
        {LENSES_COPY.page.table.empty}
      </p>
    </div>
  );
}

function buildLensRows(counts: readonly LensCountDto[]): LensRow[] {
  const countsByCode = Object.fromEntries(
    counts.map((count) => [count.lensCode, count.mentionCount]),
  );
  const total = counts.reduce((sum, count) => sum + count.mentionCount, 0);
  return VISIBILITY_LENSES.map((lens) => {
    const mentionCount = countsByCode[lens.code] ?? 0;
    return {
      code: lens.code,
      slug: LENS_SLUGS[lens.code] ?? lens.code,
      name: lens.name,
      description: lens.description,
      mentionCount,
      share: total > 0 ? mentionCount / total : 0,
    };
  });
}

function formatRate(value: number) {
  return `${Math.round(value * 100)}%`;
}
