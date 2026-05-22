import { useState, useEffect, useRef } from "react";
import { Pencil, Sparkles, UserPen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/atoms/badge";
import { SectionHeader } from "@/components/molecules/SectionHeader";
import { ConfidenceTag } from "../ConfidenceTag";
import { SECTION_ICONS } from "../../sectionIcons";
import { DISCOVERY_COPY } from "@/content/discovery";
import type { BrandProfileDto, CandidateSource } from "@/types/api";

// ── Source icon (matches SuggestionCard pattern) ──────────────────

function SourceIcon({ source }: { source: CandidateSource }) {
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
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
          {label}
        </span>
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
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              aria-label={`Clear ${label}`}
              className="rounded-md p-1 text-neutral-400 opacity-0 transition-all hover:bg-neutral-100 hover:text-neutral-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-300 group-hover:opacity-100 pointer-coarse:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          )}
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
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
          {label}
        </span>
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

// ── Alias editor ──────────────────────────────────────────────────

interface AliasEditorProps {
  aliases: string[];
  onChange: (aliases: string[]) => void;
}

function AliasEditor({ aliases, onChange }: AliasEditorProps) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (value && !aliases.some((a) => a.toLowerCase() === value.toLowerCase())) {
      onChange([...aliases, value]);
    }
    setDraft("");
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-3">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {DISCOVERY_COPY.confirmation.aliasesLabel}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {aliases.map((alias) => (
          <Badge key={alias} variant="secondary" className="gap-1 pr-1">
            <span>{alias}</span>
            <button
              type="button"
              onClick={() => onChange(aliases.filter((a) => a !== alias))}
              aria-label={`Remove ${alias}`}
              className="rounded p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={DISCOVERY_COPY.confirmation.aliasesPlaceholder}
          className="h-7 min-w-[8rem] flex-1 rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        />
      </div>
    </div>
  );
}

// ── WizardStepBrandIdentity ───────────────────────────────────────

interface WizardStepBrandIdentityProps {
  brandProfile: BrandProfileDto | null;
  onProfileChange?: (field: string, value: string) => void;
  aliases?: string[];
  onAliasesChange?: (aliases: string[]) => void;
}

export function WizardStepBrandIdentity({
  brandProfile,
  onProfileChange,
  aliases = [],
  onAliasesChange,
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
      <SectionHeader
        icon={SECTION_ICONS.brandProfile}
        title={DISCOVERY_COPY.sections.brandProfile.title}
        description={DISCOVERY_COPY.sections.brandProfile.description}
        meta={<ConfidenceTag confidence={brandProfile.confidence} />}
      />

      <div className="mt-4 space-y-2">
        <EditableDescription
          label={DISCOVERY_COPY.confirmation.descriptionLabel}
          value={brandProfile.shortDescription ?? ""}
          source={brandProfile.shortDescriptionSource ?? brandProfile.source}
          onChange={(v) => onProfileChange?.("shortDescription", v)}
          placeholder={DISCOVERY_COPY.confirmation.descriptionPlaceholder}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <EditableField
            label={DISCOVERY_COPY.confirmation.industryLabel}
            value={brandProfile.industry ?? ""}
            source={brandProfile.industrySource ?? brandProfile.source}
            onChange={(v) => onProfileChange?.("industry", v)}
            placeholder={DISCOVERY_COPY.confirmation.industryPlaceholder}
          />
          <EditableField
            label={DISCOVERY_COPY.confirmation.categoryLabel}
            value={brandProfile.category ?? ""}
            source={brandProfile.categorySource ?? brandProfile.source}
            onChange={(v) => onProfileChange?.("category", v)}
            placeholder={DISCOVERY_COPY.confirmation.categoryPlaceholder}
          />
        </div>
        <EditableField
          label={DISCOVERY_COPY.confirmation.positioningLabel}
          value={brandProfile.positioning ?? ""}
          source={brandProfile.positioningSource ?? brandProfile.source}
          onChange={(v) => onProfileChange?.("positioning", v)}
          placeholder={DISCOVERY_COPY.confirmation.positioningPlaceholder}
        />
        {onAliasesChange && <AliasEditor aliases={aliases} onChange={onAliasesChange} />}
      </div>
    </div>
  );
}
