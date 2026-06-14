import { useEffect, useMemo, useRef, useState } from "react";
import { Box, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/atoms/checkbox";
import { Input } from "@/components/atoms/input";
import { cn } from "@/lib/utils";
import type { BrandedDimensionGroupDto } from "@/types/api";

interface ProductSelectorProps {
  productsByBrand: readonly BrandedDimensionGroupDto[];
  selectedNames: readonly string[];
  onChange: (next: string[]) => void;
  countsByName?: Readonly<Record<string, number>>;
  ariaLabel?: string;
}

/**
 * Dropdown chip for filtering the Workspace Overview by Product. Same
 * structure as {@link TopicSelector} — per-brand sections in the body,
 * name-based selection (shared names toggle together). Threads as
 * `?productNames=` through the three overview endpoints.
 */
export function ProductSelector({
  productsByBrand,
  selectedNames,
  onChange,
  countsByName,
  ariaLabel = "Product selector",
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

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

  const allNames = useMemo(() => {
    const set = new Set<string>();
    for (const g of productsByBrand) for (const i of g.items) set.add(i.name);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [productsByBrand]);

  const q = query.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    if (q === "") return productsByBrand;
    return productsByBrand
      .map((g) => ({ ...g, items: g.items.filter((i) => i.name.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [productsByBrand, q]);

  const total = allNames.length;
  const selected = selectedNames.length;
  const allSelected = selected === 0 || selected === total;
  const buttonLabel = allSelected
    ? `${total} products & services`
    : `${selected} of ${total} products & services`;

  function isChecked(name: string): boolean {
    return selectedNames.length === 0 || selectedNames.includes(name);
  }

  function toggle(name: string) {
    const base = selectedNames.length === 0 ? allNames : selectedNames;
    if (base.includes(name)) {
      const next = base.filter((n) => n !== name);
      onChange(next.length === 0 ? [] : next);
    } else {
      const next = [...base, name];
      onChange(next.length === total ? [] : next);
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        disabled={total === 0}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 transition hover:bg-primary-100",
          total === 0 && "cursor-default opacity-60 hover:bg-primary-50",
        )}
      >
        <Box size={12} aria-hidden className="text-primary-500" />
        <span>{total === 0 ? "No products & services" : buttonLabel}</span>
        {total > 0 && (
          <ChevronDown
            className={cn("h-3 w-3 text-neutral-400 transition", open && "rotate-180")}
            aria-hidden="true"
          />
        )}
      </button>

      {open && total > 0 && (
        <div
          role="listbox"
          aria-label={`${ariaLabel} options`}
          className="absolute z-30 mt-1 w-72 rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          <div className="border-b border-neutral-100 p-2">
            <Input
              inputSize="sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products & services…"
              aria-label="Search products & services"
            />
          </div>
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <span>Products &amp; Services</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] font-medium normal-case tracking-normal text-primary-600 hover:text-primary-700"
            >
              {allSelected ? "Clear" : "Select all"}
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {visibleGroups.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-neutral-500">
                No products &amp; services match &ldquo;{query}&rdquo;.
              </p>
            ) : (
              visibleGroups.map((group) => (
                <BrandSection
                  key={group.brandId}
                  brandName={group.brandName}
                  itemNames={group.items.map((i) => i.name)}
                  isChecked={isChecked}
                  onToggle={toggle}
                  countsByName={countsByName}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface BrandSectionProps {
  brandName: string;
  itemNames: readonly string[];
  isChecked: (name: string) => boolean;
  onToggle: (name: string) => void;
  countsByName?: Readonly<Record<string, number>>;
}

function BrandSection({
  brandName,
  itemNames,
  isChecked,
  onToggle,
  countsByName,
}: BrandSectionProps) {
  return (
    <div className="py-1">
      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {brandName}
      </div>
      <ul role="group" aria-label={brandName}>
        {itemNames.map((name) => {
          const checked = isChecked(name);
          return (
            <li key={`${brandName}:${name}`}>
              <label className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(name)}
                  aria-label={name}
                />
                <span className="flex-1 truncate font-medium text-neutral-900">{name}</span>
                {countsByName && name in countsByName && <MentionChip count={countsByName[name]} />}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MentionChip({ count }: { count: number }) {
  const empty = count === 0;
  return (
    <span
      title={`${count} ${count === 1 ? "mention" : "mentions"} in this window`}
      className={cn(
        "ml-1 inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
        empty ? "bg-neutral-100 text-neutral-400" : "bg-primary-50 text-primary-700",
      )}
    >
      {count}
    </span>
  );
}
