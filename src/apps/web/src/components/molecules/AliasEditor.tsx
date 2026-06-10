import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { cn } from "@/lib/utils";

interface AliasEditorProps {
  aliases: string[];
  onChange: (aliases: string[]) => void;
  /** Optional label rendered above the chip row. Pass `null` to omit. */
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

  function add() {
    const value = draft.trim();
    if (value && !aliases.some((a) => a.toLowerCase() === value.toLowerCase())) {
      onChange([...aliases, value]);
    }
    setDraft("");
  }

  return (
    <div
      className={cn(
        variant === "framed" && "rounded-lg border border-neutral-200 p-3",
        variant === "inline" && "space-y-1",
        className,
      )}
    >
      {label && (
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
          {label}
        </div>
      )}
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
          placeholder={placeholder}
          aria-label={label ?? placeholder ?? "Add alias"}
          className="h-7 min-w-[8rem] flex-1 rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        />
      </div>
    </div>
  );
}
