import { ArrowDown, ArrowUp, Loader2, Minus, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SectionHeader } from "@/components/molecules/SectionHeader";
import { defaultDateRangeSelection } from "@/components/molecules/DateRangePicker";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { useGenerateInsightsNarrative } from "@/features/reports/hooks/useInsightsNarrative";
import { useWorkspaceOverview } from "@/features/reports/hooks/useWorkspaceOverview";
import { cn } from "@/lib/utils";
import type { WorkspaceTopEntityRowDto } from "@/types/api";

/**
 * Insights screen (BETA). v1: templated narrative from existing
 * workspace overview metrics + a ranking table where the leader and any
 * tracked brands are highlighted. LLM-generated narrative copy lands in
 * a follow-up.
 *
 * Reads scope from `useTrackerScope` so the narrative + ranks reflect
 * whatever subset of trackers the sidebar selector has active.
 */
export function InsightsScreen() {
  const { scope } = useTrackerScope();
  const trackerIds = scope === "all" ? [] : scope;
  // Insights uses the default 30-day window for v1 — a window picker
  // can land here once the layout stabilizes.
  const overview = useWorkspaceOverview(
    defaultDateRangeSelection(),
    [],
    [],
    [],
    [],
    [],
    trackerIds,
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

  const rankedEntities = [...overview.data.topEntities].sort(
    (a, b) => (b.visibility ?? -1) - (a.visibility ?? -1),
  );
  const trackedBrands = rankedEntities.filter((e) => e.isTrackedBrand);
  const summary = buildNarrativeSummary(rankedEntities, trackedBrands);

  return (
    <div className="space-y-5">
      <PageHeader title="Insights">
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          Beta
        </Badge>
      </PageHeader>

      <Card>
        <CardContent className="space-y-3 p-5">
          <SectionHeader icon={TrendingUp} title="Your visibility position" />
          {summary ? (
            <p className="text-sm text-neutral-700">{summary}</p>
          ) : (
            <p className="text-xs text-neutral-500">
              Run a scan to start generating insights about your tracked brand's AI visibility.
            </p>
          )}
          <AiNarrativeSection
            selection={defaultDateRangeSelection()}
            trackerIds={trackerIds}
            hasData={rankedEntities.length > 0}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <SectionHeader
            title="Performance ranking"
            meta={
              <span className="text-xs text-neutral-500">{rankedEntities.length} entities</span>
            }
          />
          {rankedEntities.length === 0 ? (
            <p className="text-xs text-neutral-500">No entities in scope yet.</p>
          ) : (
            <RankingTable rows={rankedEntities} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Narrative summary — templated for now
// ---------------------------------------------------------------------------

/**
 * Build a one-paragraph narrative summary from the sorted entity list.
 * Returns null when there aren't enough entities (or no tracked brand)
 * to say anything meaningful — caller renders a fallback.
 */
function buildNarrativeSummary(
  ranked: readonly WorkspaceTopEntityRowDto[],
  trackedBrands: readonly WorkspaceTopEntityRowDto[],
): string | null {
  if (ranked.length === 0 || trackedBrands.length === 0) return null;
  const total = ranked.length;
  const leader = ranked[0];
  const topTracked = trackedBrands[0];
  const topTrackedRank = ranked.findIndex((r) => r.entityId === topTracked.entityId) + 1;
  const leaderMention = formatPct(leader.visibility);
  const trackedMention = formatPct(topTracked.visibility);

  if (leader.entityId === topTracked.entityId) {
    return `${topTracked.name} leads the field with ${leaderMention} AI visibility across ${total} entities in scope.`;
  }

  const trailDelta =
    leader.visibility != null && topTracked.visibility != null
      ? ` — trailing ${leader.name} by ${formatPercentagePoints(leader.visibility - topTracked.visibility)}`
      : "";
  return `${topTracked.name} ranks #${topTrackedRank} of ${total} with ${trackedMention} AI visibility${trailDelta}. ${leader.name} leads the field with ${leaderMention}.`;
}

function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatPercentagePoints(diff: number): string {
  const pp = Math.round(diff * 100);
  return `${pp} pp`;
}

// ---------------------------------------------------------------------------
// Ranking table
// ---------------------------------------------------------------------------

function RankingTable({ rows }: { rows: readonly WorkspaceTopEntityRowDto[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-neutral-50 uppercase tracking-wide text-neutral-500">
          <tr>
            <Th className="w-10 text-right">#</Th>
            <Th>Entity</Th>
            <Th className="text-right">Visibility</Th>
            <Th className="text-right">Share of voice</Th>
            <Th>Sentiment</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row, index) => (
            <tr
              key={`${row.entityType}:${row.entityId}`}
              className={cn(row.isTrackedBrand && "bg-primary-50/40")}
            >
              <Td className="w-10 text-right text-neutral-500 tabular-nums">{index + 1}</Td>
              <Td>
                <span className="font-medium text-neutral-900">{row.name}</span>
                {row.isTrackedBrand && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    You
                  </Badge>
                )}
              </Td>
              <Td className="text-right tabular-nums">
                <MetricCell value={row.visibility} delta={row.visibilityDelta} />
              </Td>
              <Td className="text-right tabular-nums">
                <MetricCell value={row.shareOfVoice} delta={row.shareOfVoiceDelta} />
              </Td>
              <Td>
                {row.sentiment ? (
                  <Badge variant={sentimentVariant(row.sentiment)} className="text-[10px]">
                    {row.sentiment}
                  </Badge>
                ) : (
                  <span className="text-neutral-400">—</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("px-3 py-2 text-left text-[10px] font-medium", className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 align-middle text-neutral-700", className)}>{children}</td>;
}

function MetricCell({ value, delta }: { value: number | null; delta: number | null }) {
  if (value == null) return <span className="text-neutral-400">—</span>;
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <span className="text-neutral-900">{formatPct(value)}</span>
      {delta != null && delta !== 0 && <DeltaChip delta={delta} />}
    </span>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  const pp = Math.round(delta * 100);
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const color =
    delta > 0
      ? "text-semantic-success-700"
      : delta < 0
        ? "text-semantic-error-700"
        : "text-neutral-500";
  return (
    <span className={cn("inline-flex items-center text-[10px]", color)}>
      <Icon className="h-2.5 w-2.5" aria-hidden />
      {Math.abs(pp)}pp
    </span>
  );
}

function sentimentVariant(
  value: string,
): "default" | "secondary" | "outline" | "success" | "warning" {
  switch (value) {
    case "Positive":
      return "success";
    case "Negative":
    case "Mixed":
      return "warning";
    default:
      return "secondary";
  }
}

// ---------------------------------------------------------------------------
// AI-generated narrative section
// ---------------------------------------------------------------------------

/**
 * Optional LLM-authored narrative below the templated one. Hidden when
 * there's no scan data yet (nothing for the model to summarize); shows
 * a single button until clicked, then surfaces the response inline with
 * a "Regenerate" affordance. The mutation result lives in the hook so
 * filter changes don't blow it away — the user has to click Regenerate
 * to refresh after a scope change.
 */
function AiNarrativeSection({
  selection,
  trackerIds,
  hasData,
}: {
  selection: ReturnType<typeof defaultDateRangeSelection>;
  trackerIds: readonly string[];
  hasData: boolean;
}) {
  const generate = useGenerateInsightsNarrative();

  if (!hasData) return null;

  function fire() {
    generate.mutate({ selection, trackerIds });
  }

  const errorMessage =
    generate.isError && generate.error instanceof Error
      ? generate.error.message
      : generate.isError
        ? "Could not generate the AI summary. Try again."
        : null;

  if (!generate.data && !generate.isPending && !generate.isError) {
    return (
      <div className="border-t border-neutral-100 pt-3">
        <Button variant="outline" size="sm" onClick={fire}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Generate AI summary
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-neutral-100 pt-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-neutral-500">
        <Sparkles className="h-3 w-3" aria-hidden />
        AI summary
        {generate.data && (
          <Badge variant="outline" className="text-[10px]">
            via {generate.data.platformCode}
          </Badge>
        )}
      </div>

      {generate.isPending && (
        <div
          className="flex items-center gap-2 text-xs text-neutral-500"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Asking the model…
        </div>
      )}

      {generate.data && !generate.isPending && (
        <p className="whitespace-pre-wrap text-sm text-neutral-700">{generate.data.narrative}</p>
      )}

      {errorMessage && (
        <p className="text-xs text-semantic-error-600" role="alert">
          {errorMessage}
        </p>
      )}

      <div>
        <Button variant="outline" size="sm" onClick={fire} disabled={generate.isPending}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {generate.data || generate.isError ? "Regenerate" : "Generate AI summary"}
        </Button>
      </div>
    </div>
  );
}
