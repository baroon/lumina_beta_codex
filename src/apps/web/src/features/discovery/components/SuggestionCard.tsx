import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ConfidenceTag } from "./ConfidenceTag";
import { cn } from "@/lib/utils";
import type { CandidateDto } from "@/types/api";

interface SuggestionCardProps {
  candidate: CandidateDto;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function SuggestionCard({ candidate, selected, onToggle }: SuggestionCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer",
        selected
          ? "border-primary-600 bg-primary-50"
          : "border-neutral-200 hover:border-neutral-300"
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
          <span className="font-medium text-sm text-neutral-900 truncate">{candidate.name}</span>
          <ConfidenceTag confidence={candidate.confidence} />
          {candidate.source === "LLMSuggested" && (
            <Badge variant="outline" className="text-xs">AI</Badge>
          )}
        </div>
        {candidate.description && (
          <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{candidate.description}</p>
        )}
      </div>
    </div>
  );
}
