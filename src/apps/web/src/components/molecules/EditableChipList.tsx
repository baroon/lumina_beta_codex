import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { cn } from "@/lib/utils";

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
  /**
   * Optional rename callback. When provided each chip's text becomes
   * click-to-edit (button → inline input on click, commit on blur or
   * Enter, cancel on Escape). When omitted chips stay read-only — used
   * by callers (e.g. brand aliases) that don't yet have a rename
   * endpoint.
   */
  onRename?: (itemId: string, name: string) => void;
  /**
   * Optional per-chip "details" affordance — when provided, each chip
   * gets a small ⋯ button between the name and the X that fires
   * `onEditDetails(itemId)`. The parent handles the dialog / drawer /
   * popover; the molecule only emits the click. Used by callers that
   * have a dimension-specific deeper edit surface (e.g. competitor
   * aliases + domain) beyond what a single chip can express.
   */
  onEditDetails?: (itemId: string) => void;
  /**
   * Singular noun for the details-button aria-label:
   * `Edit details for {singular} {item.name}`.
   */
  detailsAriaSingular?: string;
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
  onRename,
  onEditDetails,
  detailsAriaSingular,
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
                <ChipText
                  item={item}
                  removeAriaSingular={removeAriaSingular}
                  onRename={onRename}
                  // Render against the live items list at commit time
                  // so the duplicate guard catches sibling collisions
                  // without re-creating the input on every render.
                  siblingNames={items.filter((it) => it.id !== item.id).map((it) => it.name)}
                />
                {onEditDetails && (
                  <button
                    type="button"
                    onClick={() => onEditDetails(item.id)}
                    aria-label={`Edit details for ${detailsAriaSingular ?? removeAriaSingular} ${item.name}`}
                    className="rounded-sm p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
                  >
                    <MoreHorizontal className="h-3 w-3" aria-hidden />
                  </button>
                )}
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

/**
 * Chip text — read-only span by default, click-to-edit when the parent
 * passed an `onRename` callback. Commit on blur or Enter, cancel on
 * Escape, no-op when the trimmed value equals the original (saves a
 * round-trip when the user clicks away unchanged). The duplicate guard
 * matches the Add input's behavior so a click-to-edit collision feels
 * identical to an Add collision.
 */
function ChipText({
  item,
  removeAriaSingular,
  onRename,
  siblingNames,
}: {
  item: EditableChipListItem;
  removeAriaSingular: string;
  onRename?: (itemId: string, name: string) => void;
  siblingNames: readonly string[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the draft when the canonical name changes (e.g. server
  // returns a casing change or another tab renames the row).
  useEffect(() => {
    setDraft(item.name);
  }, [item.name]);

  // Autofocus when entering edit mode.
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!onRename) {
    return <span>{item.name}</span>;
  }

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === item.name) {
      setDraft(item.name);
      return;
    }
    if (siblingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      // Server would reject with "already exists"; spare the
      // round-trip and revert silently. The clientError surface on
      // the bottom row only covers Add; for inline rename the chip
      // simply reverts.
      setDraft(item.name);
      return;
    }
    onRename!(item.id, trimmed);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft(item.name);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        aria-label={`Rename ${removeAriaSingular} ${item.name}`}
        className={cn(
          "rounded-sm bg-white px-1 py-0 text-xs text-neutral-900",
          "border border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-500",
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={`Rename ${removeAriaSingular} ${item.name}`}
      className="rounded-sm px-0.5 text-left hover:bg-neutral-200/60"
    >
      {item.name}
    </button>
  );
}
