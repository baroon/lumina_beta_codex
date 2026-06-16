import {
  AlertCircle,
  Heart,
  Quote,
  Search,
  ShoppingCart,
  Swords,
  type LucideIcon,
} from "lucide-react";
import { VISIBILITY_LENSES } from "@/content/lenses";
import { cn } from "@/lib/utils";

// Per-lens glyph. Mirrors the metric-category icons used by the section
// pills above (Heart for sentiment, Quote for citations, Swords for
// competitive) so the lens chips read as a denser, color-coded version
// of the same taxonomy.
const LENS_ICONS: Record<string, LucideIcon> = {
  Discovery: Search,
  BuyingIntent: ShoppingCart,
  CompetitorComparison: Swords,
  SentimentAndTrust: Heart,
  CitationVisibility: Quote,
  ContentGaps: AlertCircle,
};

interface LensChipRowProps {
  /**
   * Selected lens codes. The default state on the Workspace Overview is
   * "all 6 selected" (cross-lens summary). The host can also represent
   * "all selected" as the full 6-code array — either form renders every
   * chip pressed; the click handler below normalizes the next value.
   */
  selectedCodes: readonly string[];
  /**
   * Called with the next selected set when the user clicks a chip. The
   * row implements toggle-back semantics — clicking a chip that is the
   * only selected one snaps back to "all 6 selected"; clicking any other
   * chip narrows to just that chip.
   */
  onChange: (next: string[]) => void;
  /**
   * Called when the user clicks any chip, with the lens code. Lets the
   * host scroll to that section in the same gesture. Fires *in addition
   * to* onChange.
   */
  onActivate?: (code: string) => void;
  /** Optional per-lens mention count keyed by lens code. */
  countsByCode?: Readonly<Record<string, number>>;
}

const ALL_LENS_CODES = VISIBILITY_LENSES.map((l) => l.code);

/**
 * Six lens chips that act as both filter selectors AND section anchors
 * for the Workspace Overview. Default state has every chip pressed
 * (cross-lens summary); clicking one narrows the selection to that lens
 * alone (and the host scrolls to its section). Clicking the only-selected
 * chip a second time toggles back to "all 6 selected".
 */
export function LensChipRow({
  selectedCodes,
  onChange,
  onActivate,
  countsByCode,
}: LensChipRowProps) {
  const selectedSet = new Set(selectedCodes);
  const allSelected = selectedSet.size === ALL_LENS_CODES.length;

  function handleClick(code: string) {
    onActivate?.(code);
    const isOnlySelected = selectedSet.size === 1 && selectedSet.has(code);
    if (isOnlySelected) {
      // Toggle back to "all 6 selected" — represented as the full array
      // so the host can pass it through to the BE filter param as-is.
      onChange(ALL_LENS_CODES);
    } else {
      onChange([code]);
    }
  }

  function isPressed(code: string): boolean {
    return allSelected || selectedSet.has(code);
  }

  return (
    <nav className="flex flex-nowrap items-center gap-1" aria-label="Visibility lens selectors">
      {VISIBILITY_LENSES.map((lens) => (
        <LensChip
          key={lens.code}
          name={lens.name}
          shortName={LENS_SHORT_NAMES[lens.code] ?? lens.name}
          Icon={LENS_ICONS[lens.code]}
          pressed={isPressed(lens.code)}
          count={countsByCode?.[lens.code]}
          onClick={() => handleClick(lens.code)}
        />
      ))}
    </nav>
  );
}

// Short display labels for the lens chips. Trades off two long labels
// ("Competitor Comparison", "Citation Visibility") so all six chips +
// the right-side scope toggle + Filters chip fit on a single row at
// typical workspace widths. Full name still flows through aria-label
// and the chip title for screen readers + tooltips.
const LENS_SHORT_NAMES: Record<string, string> = {
  CompetitorComparison: "Comparison",
  CitationVisibility: "Citations",
  SentimentAndTrust: "Sentiment",
};

interface LensChipProps {
  /** Full lens name — used for aria-label + title (hover tooltip). */
  name: string;
  /** Compact label rendered on the chip. May equal `name`. */
  shortName: string;
  /** Lens-specific glyph rendered to the left of the label. */
  Icon?: LucideIcon;
  pressed: boolean;
  count?: number;
  onClick: () => void;
}

function LensChip({ name, shortName, Icon, pressed, count, onClick }: LensChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={name}
      title={name}
      className={cn(
        // shrink-0 so the chips don't squish on narrow viewports —
        // the parent row uses overflow-x-auto, so chips slide
        // horizontally instead of compressing.
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition",
        pressed
          ? "border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100"
          : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50",
      )}
    >
      {Icon && (
        <Icon size={12} aria-hidden className={pressed ? "text-primary-500" : "text-neutral-400"} />
      )}
      <span>{shortName}</span>
      {count !== undefined && <LensCountBadge count={count} pressed={pressed} />}
    </button>
  );
}

function LensCountBadge({ count, pressed }: { count: number; pressed: boolean }) {
  const empty = count === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1 py-0 text-[10px] font-semibold tabular-nums",
        empty
          ? "bg-neutral-100 text-neutral-400"
          : pressed
            ? "bg-primary-100 text-primary-700"
            : "bg-neutral-100 text-neutral-600",
      )}
      aria-label={`${count} ${count === 1 ? "mention" : "mentions"}`}
    >
      {count}
    </span>
  );
}
