import { Badge } from "@/components/atoms/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/atoms/tooltip";
import { SourceTypeDropdown } from "@/components/molecules/SourceTypeDropdown";
import { REPORTS_COPY } from "@/content/reports";
import { cn } from "@/lib/utils";
import { Bot, ExternalLink, Globe, ShieldCheck, UserCheck } from "lucide-react";
import type { SourceListItemDto, SourceTypeReferenceDto } from "@/types/api";

interface SourcesTableProps {
  sources: readonly SourceListItemDto[];
  sourceTypes: readonly SourceTypeReferenceDto[];
  /** Called when the user picks a new SourceType from a row's dropdown. */
  onClassify: (sourceId: string, sourceType: string) => void;
  /** Called when the user clicks a row to drill into the citations drawer. */
  onSelectSource: (sourceId: string) => void;
  /** Disable dropdowns while a mutation is in flight. */
  classifyDisabled?: boolean;
}

/**
 * Source/Citation view main table (Phase 4 v1 plan §D15). Renders one row
 * per source cited in this scan, with an editable type dropdown,
 * provenance icon, citation count, and platform badges. Clicking a row
 * surfaces the citation drawer (organism, separate component).
 */
export function SourcesTable({
  sources,
  sourceTypes,
  onClassify,
  onSelectSource,
  classifyDisabled,
}: SourcesTableProps) {
  const copy = REPORTS_COPY.sources.table;

  if (sources.length === 0) {
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
              {copy.headers.source}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              {copy.headers.type}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              {copy.headers.provenance}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {copy.headers.citations}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              {copy.headers.platforms}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium sr-only">
              {copy.headers.action}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {sources.map((source) => (
            <tr key={source.sourceId} className="hover:bg-neutral-50">
              <td className="px-4 py-3 align-top">
                <button
                  type="button"
                  onClick={() => onSelectSource(source.sourceId)}
                  className="text-left text-sm font-medium text-neutral-900 hover:text-primary-600"
                >
                  {source.sourceName}
                </button>
                {source.normalizedDomain && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                    <Globe className="h-3 w-3" aria-hidden="true" />
                    <span>{source.normalizedDomain}</span>
                  </div>
                )}
              </td>
              <td className="px-4 py-3 align-top">
                <SourceTypeDropdown
                  value={source.sourceType}
                  onChange={(next) => onClassify(source.sourceId, next)}
                  sourceTypes={sourceTypes}
                  disabled={classifyDisabled}
                  ariaLabel={`Source type for ${source.sourceName}`}
                />
              </td>
              <td className="px-4 py-3 align-top">
                <ProvenanceIndicator
                  provenance={source.provenanceSource}
                  confidence={source.confidenceScore}
                />
              </td>
              <td className="px-4 py-3 text-right align-top tabular-nums text-neutral-900">
                {source.citationCount}
              </td>
              <td className="px-4 py-3 align-top">
                <div className="flex flex-wrap gap-1">
                  {source.platforms.map((p) => (
                    <Badge key={p.platformId} variant="secondary" className="text-xs">
                      {p.name}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right align-top">
                <button
                  type="button"
                  onClick={() => onSelectSource(source.sourceId)}
                  aria-label={`View citations for ${source.sourceName}`}
                  className="inline-flex items-center text-neutral-500 hover:text-primary-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ProvenanceIndicatorProps {
  provenance: string;
  confidence: number;
}

/**
 * Small icon + label showing how this source was classified — the user
 * needs to see "the LLM guessed this" vs "I corrected this" at a glance
 * (D20). RuleBased = the URL-domain matcher; LLMClassified = LLM verdict;
 * UserCorrected/UserConfirmed = human verdict.
 */
function ProvenanceIndicator({ provenance, confidence }: ProvenanceIndicatorProps) {
  const labels = REPORTS_COPY.sources.provenance;
  const meta =
    provenance === "UserCorrected" || provenance === "UserConfirmed"
      ? { icon: UserCheck, label: labels.user, className: "text-semantic-success-700" }
      : provenance === "LLMClassified"
        ? { icon: Bot, label: labels.llm, className: "text-primary-600" }
        : { icon: ShieldCheck, label: labels.rule, className: "text-neutral-500" };

  const Icon = meta.icon;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 text-xs", meta.className)}>
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{meta.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          {labels.tooltip.replace("{confidence}", confidence.toFixed(2))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
