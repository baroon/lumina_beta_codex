import * as React from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/atoms/input";

interface InlineEditProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function InlineEdit({
  value,
  onChange,
  placeholder = "Click to edit",
  className,
}: InlineEditProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  React.useEffect(() => {
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

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        inputSize="sm"
        className={cn("mt-0.5", className)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "group inline-flex w-full items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-left text-sm text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50",
        !value && "italic text-neutral-400",
        className,
      )}
    >
      <span className="flex-1 truncate">{value || placeholder}</span>
      <Pencil className="h-3 w-3 shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

InlineEdit.displayName = "InlineEdit";

export { InlineEdit };
export type { InlineEditProps };
