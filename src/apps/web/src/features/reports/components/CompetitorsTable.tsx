import { Globe } from "lucide-react";
import { REPORTS_COPY } from "@/content/reports";
import { cn } from "@/lib/utils";
import type { CompetitorListItemDto } from "@/types/api";

interface CompetitorsTableProps {
  competitors: readonly CompetitorListItemDto[];
  /** Called when the user clicks a row to open the competitor detail page. */
  onSelectCompetitor: (competitorId: string) => void;
}

/**
 * Competitor view list table (Phase 4 v1 plan §Slice 4, D17). One row per
 * tracked competitor showing mention/recommendation counts + derived rates.
 * Empty state copy is the standard ADR-004 §"Status and empty states"
 * pattern for "no competitors configured" — the higher-level screen
 * surfaces the "add competitors" CTA when warranted.
 */
export function CompetitorsTable({ competitors, onSelectCompetitor }: CompetitorsTableProps) {
  const copy = REPORTS_COPY.competitors.table;

  if (competitors.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-surface-card p-8 text-center text-sm text-neutral-600">
        {copy.empty}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-surface-card">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              {copy.headers.competitor}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.headers.mentions}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.headers.mentionRate}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.headers.shareOfVoice}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.headers.recommendations}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.headers.recommendationRate}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {competitors.map((c) => (
            <tr
              key={c.competitorId}
              className="cursor-pointer hover:bg-neutral-50"
              onClick={() => onSelectCompetitor(c.competitorId)}
            >
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCompetitor(c.competitorId);
                  }}
                  className="text-left text-sm font-medium text-neutral-900 hover:text-primary-600"
                >
                  {c.name}
                </button>
                {c.domain && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                    <Globe className="h-3 w-3" aria-hidden="true" />
                    <span>{c.domain}</span>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-neutral-900">
                {c.mentionCount}
              </td>
              <RateCell value={c.mentionRate} />
              <RateCell value={c.shareOfVoice} />
              <td className="px-4 py-3 text-right tabular-nums text-neutral-900">
                {c.recommendationCount}
              </td>
              <RateCell value={c.recommendationRate} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RateCell({ value }: { value: number | null }) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-right tabular-nums",
        value === null ? "text-neutral-400" : "text-neutral-900",
      )}
    >
      {value === null ? REPORTS_COPY.competitors.table.noData : `${(value * 100).toFixed(1)}%`}
    </td>
  );
}
