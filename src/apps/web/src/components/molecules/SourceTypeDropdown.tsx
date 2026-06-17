import {
  Building2,
  BookOpen,
  HelpCircle,
  Home,
  Landmark,
  MessageSquare,
  MoreHorizontal,
  Newspaper,
  Share2,
  ShoppingBag,
  Star,
  Swords,
  type LucideIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import { cn } from "@/lib/utils";
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

// Per-SourceType identity icon. Keyed by the enum code (matches
// SourceType.ToString()). When a new SourceType lands, add it here so
// the dropdown still reads as "this is a kind of source" at a glance.
const SOURCE_TYPE_ICONS: Readonly<Record<string, LucideIcon>> = {
  Owned: Home,
  Competitor: Swords,
  Corporate: Building2,
  UGC: MessageSquare,
  Editorial: Newspaper,
  ReviewSite: Star,
  Social: Share2,
  Institutional: Landmark,
  Reference: BookOpen,
  Marketplace: ShoppingBag,
  Other: MoreHorizontal,
  Unknown: HelpCircle,
};

/**
 * Editable source-type picker for the Source/Citation view. Shows the
 * 12 enum codes with their display names + a per-type identity icon
 * so the dropdown reads as a glance row instead of a wall of text.
 * Caller wires the value back via <c>useUpdateSourceClassification</c>.
 */
export function SourceTypeDropdown({
  value,
  onChange,
  sourceTypes,
  disabled = false,
  ariaLabel = "Source type",
}: SourceTypeDropdownProps) {
  // Defensive: if the current value isn't in the reference set (e.g.
  // enum drift), surface it as-is so the user can still see + change it.
  const fallback = sourceTypes.some((t) => t.code === value)
    ? null
    : { id: "unknown", code: value, name: value, description: "", displayOrder: 999 };
  const items = fallback ? [...sourceTypes, fallback] : sourceTypes;

  const SelectedIcon = SOURCE_TYPE_ICONS[value] ?? HelpCircle;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        selectSize="sm"
        // 160px fits "User-Generated Content" with a slight ellipsis if
        // the trigger sits in a narrow column; everything else lands
        // comfortably.
        className="w-[160px]"
        aria-label={ariaLabel}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <SelectedIcon className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />
          <span className="truncate">
            <SelectValue />
          </span>
        </span>
      </SelectTrigger>
      <SelectContent>
        {items.map((type) => {
          const Icon = SOURCE_TYPE_ICONS[type.code] ?? HelpCircle;
          const isActive = type.code === value;
          return (
            <SelectItem
              key={type.id}
              value={type.code}
              // Slightly tighter than the default SelectItem padding —
              // icon + label sit close so the row reads as one chip.
              className={cn("py-1 pl-2 pr-7 text-xs", isActive && "font-medium")}
              icon={<Icon className="h-3.5 w-3.5 text-neutral-500" aria-hidden />}
            >
              {type.name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
