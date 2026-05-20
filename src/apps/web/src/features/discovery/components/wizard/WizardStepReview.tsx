import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/atoms/badge";
import { Input } from "@/components/atoms/input";
import { DISCOVERY_COPY } from "@/content/discovery";
import { AddCustomItemForm } from "../AddCustomItemForm";
import { X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CandidateDto, BrandProfileDto } from "@/types/api";

type SectionKey = "products" | "audiences" | "markets" | "topics" | "competitors" | "trustSignals";

interface WizardStepReviewProps {
  brandProfile: BrandProfileDto | null;
  sections: Record<SectionKey, { candidates: CandidateDto[]; selectedIds: Set<string> }>;
  onToggle: (sectionKey: string, id: string) => void;
  onAddCustom: (sectionKey: string, name: string, metadata?: Record<string, string>) => void;
  onRemoveCustom: (sectionKey: string, id: string) => void;
  onEditSection: (sectionKey: SectionKey | "brandProfile") => void;
}

const SECTION_ORDER: { key: SectionKey; label: string }[] = [
  { key: "products", label: DISCOVERY_COPY.sections.products.title },
  { key: "audiences", label: DISCOVERY_COPY.sections.audiences.title },
  { key: "markets", label: DISCOVERY_COPY.sections.markets.title },
  { key: "topics", label: DISCOVERY_COPY.sections.topics.title },
  { key: "competitors", label: DISCOVERY_COPY.sections.competitors.title },
  { key: "trustSignals", label: DISCOVERY_COPY.sections.trustSignals.title },
];

// ── ReviewChip ────────────────────────────────────────────────────

interface ReviewChipProps {
  candidate: CandidateDto;
  onRemove: () => void;
  onEdit: (newName: string) => void;
}

function ReviewChip({ candidate, onRemove, onEdit }: ReviewChipProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(candidate.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== candidate.name) {
      onEdit(trimmed);
    }
    setEditing(false);
    setDraft(candidate.name);
  }

  function cancel() {
    setDraft(candidate.name);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      commit();
    } else if (e.key === "Escape") {
      cancel();
    }
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        inputSize="sm"
        className="h-7 w-40 text-xs"
      />
    );
  }

  const isCustom = candidate.source === "UserAdded";

  return (
    <Badge
      variant="secondary"
      className={cn(
        "group/chip cursor-default gap-1 pr-1",
        isCustom && "border-primary-200 bg-primary-50",
      )}
    >
      <span className="cursor-pointer" onDoubleClick={() => setEditing(true)}>
        {candidate.name}
      </span>
      {isCustom && (
        <span className="text-[10px] font-normal text-primary-600">
          {DISCOVERY_COPY.review.customTag}
        </span>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="ml-0.5 rounded p-0.5 opacity-0 transition-opacity hover:bg-neutral-200 group-hover/chip:opacity-100"
        aria-label={`Edit ${candidate.name}`}
      >
        <Pencil className="h-2.5 w-2.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-0.5 hover:bg-neutral-200"
        aria-label={`Remove ${candidate.name}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </Badge>
  );
}

// ── UndoToast ─────────────────────────────────────────────────────

interface UndoItem {
  sectionKey: SectionKey;
  candidate: CandidateDto;
  timerId: ReturnType<typeof setTimeout>;
}

function UndoToast({ item, onUndo }: { item: UndoItem; onUndo: () => void }) {
  const message = DISCOVERY_COPY.review.removedUndo.replace("{name}", item.candidate.name);

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 shadow-lg transition-opacity">
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-700">{message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="text-sm font-medium text-primary-700 hover:text-primary-800"
        >
          {DISCOVERY_COPY.review.undoAction}
        </button>
      </div>
    </div>
  );
}

// ── WizardStepReview ──────────────────────────────────────────────

export function WizardStepReview({
  brandProfile,
  sections,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  onEditSection,
}: WizardStepReviewProps) {
  const [undoItem, setUndoItem] = useState<UndoItem | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoItem) {
        clearTimeout(undoItem.timerId);
      }
    };
    // Only run cleanup on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemove = useCallback(
    (sectionKey: SectionKey, candidate: CandidateDto) => {
      // Clear previous undo if any
      if (undoItem) {
        clearTimeout(undoItem.timerId);
      }

      // Deselect the item
      onToggle(sectionKey, candidate.id);

      // Set up undo with 5-second timer
      const timerId = setTimeout(() => {
        setUndoItem(null);
      }, 5000);

      setUndoItem({ sectionKey, candidate, timerId });
    },
    [undoItem, onToggle],
  );

  const handleUndo = useCallback(() => {
    if (!undoItem) return;
    clearTimeout(undoItem.timerId);
    // Re-toggle to re-select
    onToggle(undoItem.sectionKey, undoItem.candidate.id);
    setUndoItem(null);
  }, [undoItem, onToggle]);

  const handleEdit = useCallback(
    (sectionKey: SectionKey, candidate: CandidateDto, newName: string) => {
      // Deselect old item
      onToggle(sectionKey, candidate.id);
      // If custom, remove from custom items
      if (candidate.source === "UserAdded") {
        onRemoveCustom(sectionKey, candidate.id);
      }
      // Add new custom item (auto-selects)
      onAddCustom(sectionKey, newName);
    },
    [onToggle, onRemoveCustom, onAddCustom],
  );

  return (
    <div className="space-y-4">
      {/* Brand profile summary */}
      {brandProfile && (
        <div className="rounded-lg border border-neutral-200 bg-surface-card p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-neutral-900">
              {DISCOVERY_COPY.sections.brandProfile.title}
            </h4>
            <button
              type="button"
              onClick={() => onEditSection("brandProfile")}
              className="text-xs font-medium text-primary-700 hover:text-primary-800"
            >
              {DISCOVERY_COPY.review.editSection}
            </button>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            {brandProfile.shortDescription || brandProfile.industry || "\u2014"}
          </p>
        </div>
      )}

      {/* Section summaries */}
      {SECTION_ORDER.map(({ key, label }) => {
        const { candidates, selectedIds } = sections[key];
        const selected = candidates
          .filter((c) => selectedIds.has(c.id))
          .sort((a, b) => {
            // UserAdded items first
            if (a.source === "UserAdded" && b.source !== "UserAdded") return -1;
            if (a.source !== "UserAdded" && b.source === "UserAdded") return 1;
            return 0;
          });

        return (
          <div key={key} className="rounded-lg border border-neutral-200 bg-surface-card p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-neutral-900">{label}</h4>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-500">
                  {selected.length} / {candidates.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => onEditSection(key)}
                  className="text-xs font-medium text-primary-700 hover:text-primary-800"
                >
                  {DISCOVERY_COPY.review.editSection}
                </button>
              </div>
            </div>
            {selected.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.map((c) => (
                  <ReviewChip
                    key={c.id}
                    candidate={c}
                    onRemove={() => handleRemove(key, c)}
                    onEdit={(newName) => handleEdit(key, c, newName)}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-neutral-400">{DISCOVERY_COPY.review.noneSelected}</p>
            )}
            <div className="mt-2">
              <AddCustomItemForm
                placeholder={`Add ${label.toLowerCase()}...`}
                onAdd={(name, metadata) => onAddCustom(key, name, metadata)}
              />
            </div>
          </div>
        );
      })}

      {/* Undo toast */}
      {undoItem && <UndoToast item={undoItem} onUndo={handleUndo} />}
    </div>
  );
}
