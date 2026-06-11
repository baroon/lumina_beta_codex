import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";

interface EditableChipListItem {
  id: string;
  name: string;
}

interface EditableChipListProps {
  items: readonly EditableChipListItem[];
  /** Placeholder text for the add input, e.g. "Add an audience…". */
  addPlaceholder: string;
  /** Button label, e.g. "Add audience". Doubles as the aria-label for the input. */
  addLabel: string;
  /**
   * Label shown for an empty list, e.g. "Not detected.". Should be the
   * same string the read-only DimensionSection uses so the empty state
   * doesn't shift visually when this section ships.
   */
  emptyLabel: string;
  /**
   * Singular noun for the item used in remove-button aria-labels:
   * `Remove {singular} {item.name}`. e.g. "audience" → "Remove audience Job seekers".
   */
  removeAriaSingular: string;
  /**
   * Called when the user submits a new name. The parent is responsible
   * for the actual mutation. The molecule's only client-side guard is
   * a trim + case-insensitive duplicate check against `items.name`.
   * Server-side validation surfaces via `serverError`.
   */
  onAdd: (name: string) => void;
  onRemove: (itemId: string) => void;
  isAdding?: boolean;
  /**
   * The id of the item currently being removed (drives the per-chip
   * disabled state). Null when no remove is in flight.
   */
  pendingRemoveId?: string | null;
  /** Server-side error message ("Add failed — try again." / etc.). */
  serverError?: string | null;
}

/**
 * Shared editable chip list for the brand profile's dimension sections
 * (audiences, markets, products, topics, competitors, trust signals).
 * Each chip carries an X that fires `onRemove(itemId)`; the bottom row
 * has an input + Add button that fires `onAdd(name)`. The molecule is
 * presentation only — mutation state, cache invalidation, and the
 * latest-DiscoveryRun anchoring all live in the parent.
 *
 * Client-side validation here is the minimum that prevents an obvious
 * bad submit: trim the typed text and reject empty / case-insensitive
 * duplicate of an item already in the list. Anything more (e.g. brand
 * name collisions for aliases) belongs to the parent that knows the
 * dimension's specific rules.
 */
export function EditableChipList({
  items,
  addPlaceholder,
  addLabel,
  emptyLabel,
  removeAriaSingular,
  onAdd,
  onRemove,
  isAdding = false,
  pendingRemoveId = null,
  serverError = null,
}: EditableChipListProps) {
  const [input, setInput] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (items.some((it) => it.name.toLowerCase() === trimmed.toLowerCase())) {
      setClientError(`"${trimmed}" is already in the list.`);
      return;
    }
    setClientError(null);
    onAdd(trimmed);
    // Optimistically clear the input. If the mutation fails on the
    // server the parent surfaces it through `serverError`; the typed
    // phrase was only client-side state and isn't load-bearing.
    setInput("");
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="text-xs text-neutral-500">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5" role="list">
          {items.map((item) => (
            <li key={item.id}>
              <Badge variant="secondary" className="inline-flex items-center gap-1 pr-1 text-xs">
                <span>{item.name}</span>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  disabled={pendingRemoveId === item.id}
                  aria-label={`Remove ${removeAriaSingular} ${item.name}`}
                  className="rounded-sm p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 disabled:opacity-50"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
        <Input
          inputSize="sm"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (clientError) setClientError(null);
          }}
          onKeyDown={handleKey}
          placeholder={addPlaceholder}
          aria-label={addLabel}
          className="max-w-xs"
          disabled={isAdding}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={input.trim() === "" || isAdding}
        >
          {isAdding ? "Adding…" : addLabel}
        </Button>
        {clientError && <span className="text-xs text-semantic-error-600">{clientError}</span>}
        {!clientError && serverError && (
          <span className="text-xs text-semantic-error-600">{serverError}</span>
        )}
      </div>
    </div>
  );
}
