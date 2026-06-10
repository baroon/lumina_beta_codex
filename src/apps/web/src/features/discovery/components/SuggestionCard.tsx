import { Checkbox } from "@/components/atoms/checkbox";
import { Sparkles, UserPen, X } from "lucide-react";
import { DISCOVERY_COPY } from "@/content/discovery";
import { AliasEditor } from "@/components/molecules/AliasEditor";
import { ConfidenceTag } from "./ConfidenceTag";
import { cn } from "@/lib/utils";
import { countryCodeToFlagUrl } from "../flag";
import type { CandidateDto } from "@/types/api";

interface SuggestionCardProps {
  candidate: CandidateDto;
  selected: boolean;
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
  typeMetadataKey?: string;
  typeLabels?: Record<string, string>;
  /**
   * When provided (Product + Competitor cards), renders an inline alias chip
   * editor below the candidate description and round-trips edits via the
   * callback. The whole-card click-to-toggle pattern is preserved; chip
   * interactions are isolated with `stopPropagation`.
   */
  aliases?: string[];
  onAliasesChange?: (aliases: string[]) => void;
}

function SourceIcon({ source }: { source: CandidateDto["source"] }) {
  if (source === "LLMSuggested" || source === "WebsiteCrawl") {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-primary-600"
        title={DISCOVERY_COPY.labels.aiSource}
      >
        <Sparkles className="h-3 w-3" />
        {DISCOVERY_COPY.labels.aiSource}
      </span>
    );
  }
  if (source === "UserAdded") {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-neutral-500"
        title={DISCOVERY_COPY.labels.manualSource}
      >
        <UserPen className="h-3 w-3" />
        {DISCOVERY_COPY.labels.manualSource}
      </span>
    );
  }
  return null;
}

export function SuggestionCard({
  candidate,
  selected,
  onToggle,
  onRemove,
  typeMetadataKey,
  typeLabels,
  aliases,
  onAliasesChange,
}: SuggestionCardProps) {
  const typeValue = typeMetadataKey ? candidate.metadata?.[typeMetadataKey] : undefined;
  const typeLabel = typeValue && typeLabels ? typeLabels[typeValue] : undefined;
  const flagUrl = countryCodeToFlagUrl(candidate.metadata?.countryCode);
  const aliasesEnabled = aliases !== undefined && onAliasesChange !== undefined;

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all",
        selected
          ? "border-primary-500 bg-primary-50 ring-1 ring-primary-500/20"
          : "border-neutral-200 hover:border-neutral-300 hover:shadow-sm",
      )}
      onClick={() => onToggle(candidate.id)}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(candidate.id)}
        onClick={(e) => e.stopPropagation()}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {flagUrl && (
            <img
              src={flagUrl}
              alt={candidate.metadata?.countryCode}
              className="h-3 w-auto shrink-0 rounded-sm"
            />
          )}
          <span className="font-medium text-sm text-neutral-900 truncate">{candidate.name}</span>
          {typeLabel && (
            <span className="inline-flex shrink-0 items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
              {typeLabel}
            </span>
          )}
          <ConfidenceTag confidence={candidate.confidence} />
        </div>
        {candidate.metadata?.domain && (
          <p className="mt-0.5 truncate text-xs text-neutral-400">{candidate.metadata.domain}</p>
        )}
        {candidate.description && (
          <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{candidate.description}</p>
        )}
        {aliasesEnabled && (
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <AliasEditor
              aliases={aliases}
              onChange={onAliasesChange}
              label={DISCOVERY_COPY.confirmation.aliasesLabel}
              placeholder={DISCOVERY_COPY.confirmation.aliasesPlaceholder}
              variant="inline"
            />
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(candidate.id);
            }}
            aria-label={`Remove ${candidate.name}`}
            className="rounded-md p-1 text-neutral-400 opacity-0 transition-all hover:bg-neutral-100 hover:text-neutral-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-300 group-hover:opacity-100 pointer-coarse:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <SourceIcon source={candidate.source} />
      </div>
    </div>
  );
}
