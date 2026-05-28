import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Checkbox } from "@/components/atoms/checkbox";
import { Input } from "@/components/atoms/input";
import { cn } from "@/lib/utils";

/**
 * One entity in the selector — either a tracked Brand or a Competitor.
 * `id` is `Brand.Id` or `Competitor.Id`; the FE composes a stable selection
 * key as `<entityType>:<id>` so the two namespaces never collide.
 */
export interface BrandSelectorEntity {
  id: string;
  entityType: "Brand" | "Competitor";
  name: string;
}

interface BrandSelectorProps {
  /** Tracked brands — shown in the top "Tracked brand(s)" section, alphabetical. */
  trackedBrands: readonly BrandSelectorEntity[];
  /** Competitors — shown in the lower "All brands" section, alphabetical. */
  competitors: readonly BrandSelectorEntity[];
  /** Currently-selected keys, formatted as `Brand:<id>` or `Competitor:<id>`. */
  selectedKeys: readonly string[];
  /** Called with the next selected-keys set whenever the user toggles. */
  onChange: (next: string[]) => void;
  /** Optional aria-label / data-testid base name. */
  ariaLabel?: string;
}

/**
 * Phase 4 v3 Slice A — entity multi-selector for the Workspace Overview.
 *
 * Mirrors the peec.ai brand-picker UX: button shows "N of M" (or "All
 * brands" when everything is checked); the dropdown panel splits entities
 * into "Tracked brand(s)" + "All brands", each with a section-level
 * master checkbox plus per-entity checkboxes, gated by a single
 * substring search on `name`. Selection state is owned by the caller —
 * the molecule is presentational + click-outside-aware.
 */
export function BrandSelector({
  trackedBrands,
  competitors,
  selectedKeys,
  onChange,
  ariaLabel = "Brand selector",
}: BrandSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on click outside.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  // Substring filter (case-insensitive) applied to both sections.
  const q = query.trim().toLowerCase();
  const trackedVisible = useMemo(
    () =>
      q === "" ? trackedBrands : trackedBrands.filter((e) => e.name.toLowerCase().includes(q)),
    [q, trackedBrands],
  );
  const competitorsVisible = useMemo(
    () => (q === "" ? competitors : competitors.filter((e) => e.name.toLowerCase().includes(q))),
    [q, competitors],
  );

  const totalCount = trackedBrands.length + competitors.length;
  const selectedCount = selectedKeys.length;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  const buttonLabel =
    totalCount === 0
      ? "No brands"
      : allSelected
        ? "All brands"
        : `${selectedCount} of ${totalCount} brands`;

  const keyOf = (e: BrandSelectorEntity) => `${e.entityType}:${e.id}`;

  const toggle = (entity: BrandSelectorEntity) => {
    const k = keyOf(entity);
    if (selectedSet.has(k)) {
      onChange(selectedKeys.filter((x) => x !== k));
    } else {
      onChange([...selectedKeys, k]);
    }
  };

  const setSectionAll = (section: readonly BrandSelectorEntity[], checked: boolean) => {
    const sectionKeys = section.map(keyOf);
    if (checked) {
      const merged = new Set(selectedKeys);
      for (const k of sectionKeys) merged.add(k);
      onChange(Array.from(merged));
    } else {
      const drop = new Set(sectionKeys);
      onChange(selectedKeys.filter((k) => !drop.has(k)));
    }
  };

  const trackedAllSelected =
    trackedBrands.length > 0 && trackedBrands.every((e) => selectedSet.has(keyOf(e)));
  const competitorsAllSelected =
    competitors.length > 0 && competitors.every((e) => selectedSet.has(keyOf(e)));

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-between gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50",
          "min-w-[180px]",
        )}
      >
        <span>{buttonLabel}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-neutral-400 transition", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={`${ariaLabel} options`}
          className="absolute z-30 mt-1 w-72 rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          <div className="border-b border-neutral-100 p-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <Input
                inputSize="sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search brands…"
                aria-label="Search brands"
                className="pl-7"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {trackedBrands.length > 0 && (
              <SectionBlock
                title="Tracked brand"
                pluralTitle="Tracked brands"
                items={trackedVisible}
                isItemSelected={(e) => selectedSet.has(keyOf(e))}
                onToggle={toggle}
                masterChecked={trackedAllSelected}
                onMasterToggle={(next) => setSectionAll(trackedBrands, next)}
                showYouChip
                totalInSection={trackedBrands.length}
              />
            )}
            {competitors.length > 0 && (
              <SectionBlock
                title="All brands"
                pluralTitle="All brands"
                items={competitorsVisible}
                isItemSelected={(e) => selectedSet.has(keyOf(e))}
                onToggle={toggle}
                masterChecked={competitorsAllSelected}
                onMasterToggle={(next) => setSectionAll(competitors, next)}
                totalInSection={competitors.length}
              />
            )}
            {trackedVisible.length === 0 && competitorsVisible.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-neutral-500">
                No brands match “{query}”.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SectionBlockProps {
  title: string;
  pluralTitle: string;
  items: readonly BrandSelectorEntity[];
  isItemSelected: (entity: BrandSelectorEntity) => boolean;
  onToggle: (entity: BrandSelectorEntity) => void;
  masterChecked: boolean;
  onMasterToggle: (next: boolean) => void;
  showYouChip?: boolean;
  /** Used to pluralize the header label. */
  totalInSection: number;
}

function SectionBlock({
  title,
  pluralTitle,
  items,
  isItemSelected,
  onToggle,
  masterChecked,
  onMasterToggle,
  showYouChip = false,
  totalInSection,
}: SectionBlockProps) {
  const headerLabel = totalInSection === 1 ? title : pluralTitle;
  return (
    <div className="py-1">
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wide text-neutral-500">
        <Checkbox
          checked={masterChecked}
          onCheckedChange={(checked) => onMasterToggle(checked === true)}
          aria-label={`Toggle all ${headerLabel.toLowerCase()}`}
          checkboxSize="sm"
        />
        <span className="ml-1">{headerLabel}</span>
      </div>
      <ul role="group" className="space-y-0">
        {items.map((entity) => {
          const checked = isItemSelected(entity);
          return (
            <li key={`${entity.entityType}:${entity.id}`}>
              <label className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(entity)}
                  aria-label={entity.name}
                  checkboxSize="sm"
                />
                <span className="flex-1 truncate">{entity.name}</span>
                {showYouChip && (
                  <Badge variant="secondary" className="text-[10px]">
                    You
                  </Badge>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
