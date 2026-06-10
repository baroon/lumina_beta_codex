import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { cn } from "@/lib/utils";

interface AliasEditorProps {
  aliases: string[];
  onChange: (aliases: string[]) => void;
  /** Optional label rendered next to the + / input action. Pass `null` to omit. */
  label?: string | null;
  placeholder?: string;
  /** Lower-density variant for embedding inside other cards (no border, smaller padding). */
  variant?: "framed" | "inline";
  className?: string;
}

export function AliasEditor({
  aliases,
  onChange,
  label,
  placeholder,
  variant = "framed",
  className,
}: AliasEditorProps) {
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function add() {
    const value = draft.trim();
    if (value && !aliases.some((a) => a.toLowerCase() === value.toLowerCase())) {
      onChange([...aliases, value]);
    }
    setDraft("");
  }

  function openEditor() {
    setEditing(true);
    // Defer focus to after the input mounts.
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleBlur() {
    add();
    // Collapse back to the "+" button only if the editor is now empty —
    // supports the "click +, add a few in a row, click away" flow.
    if (!draft.trim()) setEditing(false);
  }

  const actionInput = (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          add();
          // Keep focus so the user can add another in succession.
        } else if (e.key === "Escape") {
          e.preventDefault();
          setDraft("");
          setEditing(false);
        }
      }}
      onBlur={handleBlur}
      placeholder={placeholder}
      aria-label={label ?? placeholder ?? "Add alias"}
      className="h-7 min-w-[8rem] flex-1 rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    />
  );

  const actionPlus = (
    <button
      type="button"
      onClick={openEditor}
      aria-label={label ? `Add ${label.toLowerCase()}` : "Add alias"}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <Plus className="h-3.5 w-3.5" />
    </button>
  );

  const chips = aliases.map((alias) => (
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
  ));

  return (
    <div
      className={cn(
        variant === "framed" && "rounded-lg border border-neutral-200 p-3",
        variant === "inline" && "space-y-1",
        className,
      )}
    >
      {label ? (
        <>
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
              {label}
            </div>
            {!editing && actionPlus}
          </div>
          {editing && <div className="mt-2 flex">{actionInput}</div>}
          {chips.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">{chips}</div>
          )}
        </>
      ) : (
        <>
          {(chips.length > 0 || !editing) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {chips}
              {!editing && actionPlus}
            </div>
          )}
          {editing && <div className={cn(chips.length > 0 && "mt-2", "flex")}>{actionInput}</div>}
        </>
      )}
    </div>
  );
}
