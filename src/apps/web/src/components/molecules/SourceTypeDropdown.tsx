import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/atoms/tooltip";
import { Info } from "lucide-react";
import type { SourceTypeReferenceDto } from "@/types/api";

interface SourceTypeDropdownProps {
  /** Current SourceType code (e.g. "Editorial"). */
  value: string;
  /** Called with the new SourceType code. */
  onChange: (next: string) => void;
  /** 12-row source_types reference table, loaded by useSourceTypes(). */
  sourceTypes: readonly SourceTypeReferenceDto[];
  disabled?: boolean;
  /** Accessible label for screen readers. */
  ariaLabel?: string;
}

/**
 * Editable source-type picker for the Source/Citation view (Phase 4 v1
 * plan §D20). Shows the 12 enum codes with their display names + a tooltip
 * containing the ADR-003 definition from the source_types reference table.
 * Caller wires the value back to the row via
 * <c>useUpdateSourceClassification</c>.
 */
export function SourceTypeDropdown({
  value,
  onChange,
  sourceTypes,
  disabled = false,
  ariaLabel = "Source type",
}: SourceTypeDropdownProps) {
  // Defensive: if the current value isn't in the reference set (e.g. enum drift),
  // surface it as-is so the user can still see + change it.
  const fallback = sourceTypes.some((t) => t.code === value)
    ? null
    : { id: "unknown", code: value, name: value, description: "", displayOrder: 999 };
  const items = fallback ? [...sourceTypes, fallback] : sourceTypes;

  return (
    <TooltipProvider delayDuration={200}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger selectSize="sm" className="w-[180px]" aria-label={ariaLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((type) => (
            <SelectItem key={type.id} value={type.code} className="pr-2">
              <span className="flex flex-1 items-center justify-between gap-2">
                <span>{type.name}</span>
                {type.description && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="flex h-4 w-4 items-center justify-center text-neutral-400 hover:text-neutral-600"
                        aria-label={`About ${type.name}`}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      {type.description}
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </TooltipProvider>
  );
}
