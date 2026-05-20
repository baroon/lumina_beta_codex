import { useState, useEffect, useRef } from "react";
import { Pencil, Sparkles, UserPen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfidenceTag } from "../ConfidenceTag";
import { DISCOVERY_COPY } from "@/content/discovery";
import type { BrandProfileDto, CandidateSource } from "@/types/api";

// ── Source icon (matches SuggestionCard pattern) ──────────────────

function SourceIcon({ source }: { source: CandidateSource }) {
  if (source === "LLMSuggested" || source === "WebsiteCrawl" || source === "SearchSuggested") {
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

// ── Editable field card (single-line) ─────────────────────────────

interface EditableFieldProps {
  label: string;
  value: string;
  source: CandidateSource;
  onChange: (value: string) => void;
  placeholder?: string;
}

function EditableField({
  label,
  value,
  source,
  onChange,
  placeholder = "Click to edit",
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed !== value) {
      onChange(trimmed);
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      commit();
    } else if (e.key === "Escape") {
      cancel();
    }
  }

  return (
    <div
      className="group cursor-pointer rounded-lg border border-neutral-200 p-3 transition-colors hover:border-neutral-300"
      onClick={() => !editing && setEditing(true)}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">{label}</span>
        <SourceIcon source={source} />
      </div>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 ring-offset-white placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        />
      ) : (
        <div className="flex items-center gap-1.5">
          <span
            className={cn("flex-1 text-sm", value ? "text-neutral-900" : "italic text-neutral-400")}
          >
            {value || placeholder}
          </span>
          <Pencil className="h-3 w-3 shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      )}
    </div>
  );
}

// ── Editable description card (multi-line) ────────────────────────

interface EditableDescriptionProps {
  label: string;
  value: string;
  source: CandidateSource;
  onChange: (value: string) => void;
  placeholder?: string;
}

function EditableDescription({
  label,
  value,
  source,
  onChange,
  placeholder = "Click to edit",
}: EditableDescriptionProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(draft.length, draft.length);
    }
  }, [editing, draft.length]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed !== value) {
      onChange(trimmed);
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      cancel();
    }
  }

  return (
    <div
      className="group cursor-pointer rounded-lg border border-neutral-200 p-3 transition-colors hover:border-neutral-300"
      onClick={() => !editing && setEditing(true)}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-400">{label}</span>
        <SourceIcon source={source} />
      </div>
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          rows={3}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 ring-offset-white placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        />
      ) : (
        <div className="flex items-start gap-1.5">
          <span
            className={cn(
              "flex-1 whitespace-pre-wrap text-sm",
              value ? "text-neutral-900" : "italic text-neutral-400",
            )}
          >
            {value || placeholder}
          </span>
          <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      )}
    </div>
  );
}

// ── WizardStepBrandIdentity ───────────────────────────────────────

interface WizardStepBrandIdentityProps {
  brandProfile: BrandProfileDto | null;
  onProfileChange?: (field: string, value: string) => void;
}

export function WizardStepBrandIdentity({
  brandProfile,
  onProfileChange,
}: WizardStepBrandIdentityProps) {
  if (!brandProfile) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-surface-card p-6 text-center text-neutral-500">
        No brand profile detected.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-surface-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-neutral-900">
            {DISCOVERY_COPY.sections.brandProfile.title}
          </h3>
          <ConfidenceTag confidence={brandProfile.confidence} />
        </div>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        {DISCOVERY_COPY.sections.brandProfile.description}
      </p>

      <div className="mt-4 space-y-2">
        <EditableDescription
          label={DISCOVERY_COPY.confirmation.descriptionLabel}
          value={brandProfile.shortDescription ?? ""}
          source={brandProfile.shortDescriptionSource ?? brandProfile.source}
          onChange={(v) => onProfileChange?.("shortDescription", v)}
          placeholder="Click to add a description"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <EditableField
            label={DISCOVERY_COPY.confirmation.industryLabel}
            value={brandProfile.industry ?? ""}
            source={brandProfile.industrySource ?? brandProfile.source}
            onChange={(v) => onProfileChange?.("industry", v)}
            placeholder="Click to add industry"
          />
          <EditableField
            label={DISCOVERY_COPY.confirmation.categoryLabel}
            value={brandProfile.category ?? ""}
            source={brandProfile.categorySource ?? brandProfile.source}
            onChange={(v) => onProfileChange?.("category", v)}
            placeholder="Click to add category"
          />
        </div>
        <EditableField
          label={DISCOVERY_COPY.confirmation.positioningLabel}
          value={brandProfile.positioning ?? ""}
          source={brandProfile.positioningSource ?? brandProfile.source}
          onChange={(v) => onProfileChange?.("positioning", v)}
          placeholder="Click to add positioning"
        />
      </div>
    </div>
  );
}
