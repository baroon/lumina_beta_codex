import * as React from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/atoms/input";

interface InlineEditProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Render a multi-line textarea editor (Enter inserts a newline; blur or Ctrl/Cmd+Enter commits). */
  multiline?: boolean;
}

function InlineEdit({
  value,
  onChange,
  placeholder = "Click to edit",
  className,
  multiline = false,
}: InlineEditProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  React.useEffect(() => {
    if (!editing) return;
    if (multiline) textareaRef.current?.focus();
    else inputRef.current?.focus();
  }, [editing, multiline]);

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

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      commit();
    } else if (e.key === "Escape") {
      cancel();
    }
  }

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      cancel();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit();
    }
  }

  if (editing) {
    if (multiline) {
      return (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleTextareaKeyDown}
          rows={Math.min(8, Math.max(2, draft.split("\n").length + 1))}
          className={cn(
            "mt-0.5 w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 ring-offset-white transition-colors placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
            className,
          )}
        />
      );
    }
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleInputKeyDown}
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
        "group flex w-full gap-1.5 rounded-md border border-transparent px-2 py-1 text-left text-sm text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50",
        multiline ? "items-start" : "items-center",
        !value && "italic text-neutral-400",
        className,
      )}
    >
      <span className={cn("flex-1", multiline ? "whitespace-pre-wrap break-words" : "truncate")}>
        {value || placeholder}
      </span>
      <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

InlineEdit.displayName = "InlineEdit";

export { InlineEdit };
export type { InlineEditProps };
