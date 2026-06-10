import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
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
  /**
   * Route the "Manage brands" footer link points at. Defaults to the brand
   * list page (`/brands`). Set to `null` to hide the footer link entirely
   * (e.g. for tests or for embedded contexts).
   */
  manageBrandsHref?: string | null;
}

/**
 * Entity multi-selector for the Workspace Overview top bar.
 *
 * Two sections (Tracked / All brands) with a leading colored-initial
 * avatar per row, a small primary dot on tracked brands (instead of a
 * heavier "You" badge), a per-section "Select all / Clear" link in
 * place of a section-level master checkbox, and a "Manage brands"
 * footer link. Selection state is owned by the caller.
 */
export function BrandSelector({
  trackedBrands,
  competitors,
  selectedKeys,
  onChange,
  ariaLabel = "Brand selector",
  manageBrandsHref = "/brands",
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
                allSelected={trackedAllSelected}
                onSectionToggle={(next) => setSectionAll(trackedBrands, next)}
                showTrackedDot
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
                allSelected={competitorsAllSelected}
                onSectionToggle={(next) => setSectionAll(competitors, next)}
                totalInSection={competitors.length}
              />
            )}
            {trackedVisible.length === 0 && competitorsVisible.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-neutral-500">
                No brands match &ldquo;{query}&rdquo;.
              </p>
            )}
          </div>

          {manageBrandsHref && (
            <div className="border-t border-neutral-100 p-1">
              {/* Plain <a> — clicking "Manage brands" navigates to a
                  heavyweight page where a fresh router boot is fine, and
                  this keeps the molecule decoupled from the router so it
                  can be unit-tested without a router context. */}
              <a
                href={manageBrandsHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                <Plus className="h-4 w-4 text-neutral-500" aria-hidden />
                <span>Manage brands</span>
              </a>
            </div>
          )}
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
  /** Whether every entity in the section is currently selected. */
  allSelected: boolean;
  /** Called by the section-level "Select all" / "Clear" link. */
  onSectionToggle: (next: boolean) => void;
  /** When true, renders a small primary dot after the brand name. */
  showTrackedDot?: boolean;
  /** Used to pluralize the header label. */
  totalInSection: number;
}

function SectionBlock({
  title,
  pluralTitle,
  items,
  isItemSelected,
  onToggle,
  allSelected,
  onSectionToggle,
  showTrackedDot = false,
  totalInSection,
}: SectionBlockProps) {
  const headerLabel = totalInSection === 1 ? title : pluralTitle;
  const linkLabel = allSelected ? "Clear" : "Select all";
  return (
    <div className="py-1">
      <div className="flex items-center justify-between px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
        <span>{headerLabel}</span>
        <button
          type="button"
          onClick={() => onSectionToggle(!allSelected)}
          className="text-[11px] font-medium normal-case tracking-normal text-primary-600 hover:text-primary-700"
        >
          {linkLabel}
        </button>
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
                />
                <BrandInitialAvatar name={entity.name} />
                <span className="flex-1 truncate">{entity.name}</span>
                {showTrackedDot && (
                  <span
                    aria-label="Tracked"
                    title="Tracked brand"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500"
                  />
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Colored initial avatar — small circle with the first letter of the
 * brand name. Color is picked deterministically from a 6-entry palette
 * via a tiny name hash so the same brand always renders the same color
 * across renders, but adjacent brands look distinct.
 */
function BrandInitialAvatar({ name }: { name: string }) {
  const trimmed = name.trim();
  const initial = trimmed.length === 0 ? "?" : trimmed[0].toUpperCase();
  const idx = nameHash(trimmed) % AVATAR_PALETTE.length;
  const palette = AVATAR_PALETTE[idx];
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
        palette.bg,
        palette.fg,
      )}
    >
      {initial}
    </span>
  );
}

const AVATAR_PALETTE = [
  { bg: "bg-primary-100", fg: "text-primary-700" },
  { bg: "bg-accent-100", fg: "text-accent-700" },
  { bg: "bg-amber-100", fg: "text-amber-700" },
  { bg: "bg-emerald-100", fg: "text-emerald-700" },
  { bg: "bg-rose-100", fg: "text-rose-700" },
  { bg: "bg-violet-100", fg: "text-violet-700" },
] as const;

function nameHash(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}
