import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { cn } from "@/lib/utils";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Headline shown at the top of the dialog. */
  title: string;
  /** Multi-sentence warning explaining what will be deleted and that it's irreversible. */
  description: string;
  /**
   * The exact text the user must type to enable the destructive button.
   * Use the resource's display name (e.g. the brand name or tracker
   * name) — copying it is a deliberate friction step.
   */
  expectedConfirmText: string;
  /** Label for the destructive button (e.g. "Delete brand"). */
  confirmLabel: string;
  /**
   * Fires when the user clicks the destructive button after typing the
   * confirm phrase. The dialog does NOT auto-close on confirm — the
   * caller controls closing (typically after the mutation settles).
   */
  onConfirm: () => void;
  /** Disables the button + shows a pending label while the mutation is in flight. */
  isDeleting?: boolean;
}

/**
 * Type-to-confirm destructive-action dialog backed by Radix Dialog.
 * Used for tracker + brand delete: the user must type the exact name
 * of the resource to enable the destructive button — a small friction
 * step that makes the typical "click-the-X-by-accident" sequence
 * impossible. The matching is case-sensitive and exact (no trim) so
 * the typed phrase has to mirror what the dialog actually shows.
 *
 * Closing the dialog (either via the X, the backdrop, or Cancel)
 * resets the typed text so re-opening doesn't surface stale input.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  expectedConfirmText,
  confirmLabel,
  onConfirm,
  isDeleting = false,
}: ConfirmDeleteDialogProps) {
  const [typed, setTyped] = useState("");

  // Reset the typed text whenever the dialog closes so a subsequent
  // open shows a blank input. Without this, re-opening keeps the
  // previously-typed phrase and the destructive button stays enabled.
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const matches = typed === expectedConfirmText;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-neutral-200 bg-white p-5 shadow-xl focus:outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-semantic-error-50 text-semantic-error-600"
              aria-hidden
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <Dialog.Title className="text-base font-semibold text-neutral-900">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-neutral-600">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="confirm-delete-input" className="text-[11px] text-neutral-600">
              Type{" "}
              <span className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px] text-neutral-800">
                {expectedConfirmText}
              </span>{" "}
              to confirm:
            </Label>
            <Input
              id="confirm-delete-input"
              inputSize="sm"
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={expectedConfirmText}
              aria-label="Confirmation phrase"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm" disabled={isDeleting}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              variant="destructive"
              size="sm"
              onClick={onConfirm}
              disabled={!matches || isDeleting}
            >
              {isDeleting ? "Deleting…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
