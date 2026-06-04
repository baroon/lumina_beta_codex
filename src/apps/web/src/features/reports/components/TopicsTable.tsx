import { Badge } from "@/components/atoms/badge";
import { REPORTS_COPY } from "@/content/reports";
import { cn } from "@/lib/utils";
import type { TopicListItemDto } from "@/types/api";

interface TopicsTableProps {
  topics: readonly TopicListItemDto[];
  /** Called when the user clicks a row to open the topic detail page. */
  onSelectTopic: (topicId: string) => void;
}

/**
 * Topic view list table (Phase 4 v1 plan §Slice 3, D16). One row per topic
 * with the per-topic metric pivot. Clicking a row navigates to the detail
 * route. Rates render as percentages with one decimal; null rates render
 * the table's "no data" placeholder so missing-data is distinguishable
 * from a real zero.
 */
export function TopicsTable({ topics, onSelectTopic }: TopicsTableProps) {
  const copy = REPORTS_COPY.topics.table;

  if (topics.length === 0) {
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
              {copy.headers.topic}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              {copy.headers.ownership}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.headers.mentionRate}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.headers.recommendationRate}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.headers.shareOfVoice}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.headers.avgRank}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.headers.citations}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.headers.ownedShare}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              {copy.headers.sentiment}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {topics.map((t) => (
            <tr
              key={t.topicId}
              className="cursor-pointer hover:bg-neutral-50"
              onClick={() => onSelectTopic(t.topicId)}
            >
              <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTopic(t.topicId);
                  }}
                  className="text-left hover:text-primary-600"
                >
                  {t.topicName}
                </button>
              </td>
              <OwnershipCell band={t.ownershipBand} score={t.ownershipScore} />
              <RateCell value={t.brandMentionRate} />
              <RateCell value={t.brandRecommendationRate} />
              <RateCell value={t.brandShareOfVoice} />
              <NumberCell value={t.averageBrandRank} digits={1} />
              <td className="px-4 py-3 text-right tabular-nums text-neutral-900">
                {t.citationCount}
              </td>
              <RateCell value={t.ownedCitationShare} />
              <td className="px-4 py-3">
                {t.dominantSentiment ? (
                  <Badge variant={sentimentVariant(t.dominantSentiment)} className="text-xs">
                    {t.dominantSentiment}
                  </Badge>
                ) : (
                  <span className="text-xs text-neutral-400">{copy.noData}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface RateCellProps {
  value: number | null;
}
function RateCell({ value }: RateCellProps) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-right tabular-nums",
        value === null ? "text-neutral-400" : "text-neutral-900",
      )}
    >
      {value === null ? REPORTS_COPY.topics.table.noData : `${(value * 100).toFixed(1)}%`}
    </td>
  );
}

interface NumberCellProps {
  value: number | null;
  digits: number;
}
function NumberCell({ value, digits }: NumberCellProps) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-right tabular-nums",
        value === null ? "text-neutral-400" : "text-neutral-900",
      )}
    >
      {value === null ? REPORTS_COPY.topics.table.noData : value.toFixed(digits)}
    </td>
  );
}

interface OwnershipCellProps {
  band: string;
  score: number;
}
/**
 * Ownership column — colored badge with the band label + the raw
 * score as percentage sub-text. "Owned" wins green, "Contested"
 * amber, "Lost" red. Falls through to a neutral badge for unknown
 * future bands so the FE doesn't crash if the BE adds more.
 */
function OwnershipCell({ band, score }: OwnershipCellProps) {
  const label = REPORTS_COPY.topics.table.ownership[band] ?? band;
  return (
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <Badge variant={ownershipVariant(band)} className="text-xs">
          {label}
        </Badge>
        <span className="text-xs tabular-nums text-neutral-500">
          {`${(score * 100).toFixed(0)}%`}
        </span>
      </div>
    </td>
  );
}

function ownershipVariant(
  band: string,
): "default" | "secondary" | "outline" | "success" | "warning" | "destructive" {
  switch (band) {
    case "Owned":
      return "success";
    case "Contested":
      return "warning";
    case "Lost":
      return "destructive";
    default:
      return "secondary";
  }
}

function sentimentVariant(
  value: string,
): "default" | "secondary" | "outline" | "success" | "warning" {
  switch (value) {
    case "Positive":
      return "success";
    case "Negative":
      return "warning";
    case "Mixed":
      return "warning";
    case "Neutral":
    case "Unknown":
    default:
      return "secondary";
  }
}
