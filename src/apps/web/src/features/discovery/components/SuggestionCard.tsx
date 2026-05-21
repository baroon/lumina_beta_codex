import { Checkbox } from "@/components/atoms/checkbox";
import { Sparkles, UserPen, X } from "lucide-react";
import { DISCOVERY_COPY } from "@/content/discovery";
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
}: SuggestionCardProps) {
  const typeValue = typeMetadataKey ? candidate.metadata?.[typeMetadataKey] : undefined;
  const typeLabel = typeValue && typeLabels ? typeLabels[typeValue] : undefined;
  const flagUrl = countryCodeToFlagUrl(candidate.metadata?.countryCode);

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer",
        selected
          ? "border-primary-600 bg-primary-50"
          : "border-neutral-200 hover:border-neutral-300",
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
              className="h-3 w-auto shrink-0 rounded-[2px]"
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
        {candidate.description && (
          <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{candidate.description}</p>
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
