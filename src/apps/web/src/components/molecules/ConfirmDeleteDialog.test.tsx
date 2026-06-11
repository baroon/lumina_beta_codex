import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

function Harness({
  expectedConfirmText = "Acme Corp",
  onConfirm = vi.fn(),
  isDeleting = false,
}: {
  expectedConfirmText?: string;
  onConfirm?: () => void;
  isDeleting?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmDeleteDialog
      open={open}
      onOpenChange={setOpen}
      title="Delete brand"
      description="This is irreversible."
      expectedConfirmText={expectedConfirmText}
      confirmLabel="Delete brand"
      onConfirm={onConfirm}
      isDeleting={isDeleting}
    />
  );
}

describe("ConfirmDeleteDialog", () => {
  it("renders the title + description while open", () => {
    render(<Harness />);
    // "Delete brand" appears twice (heading + destructive button); the
    // dialog title is the heading-role one.
    expect(screen.getByRole("heading", { name: "Delete brand" })).toBeInTheDocument();
    expect(screen.getByText("This is irreversible.")).toBeInTheDocument();
  });

  it("disables the destructive button until the typed text matches", async () => {
    render(<Harness />);
    const button = screen.getByRole("button", { name: /Delete brand/i });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Confirmation phrase/i), "Acme");
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Confirmation phrase/i), " Corp");
    expect(button).toBeEnabled();
  });

  it("matching is exact + case-sensitive", async () => {
    render(<Harness expectedConfirmText="Acme Corp" />);
    await userEvent.type(screen.getByLabelText(/Confirmation phrase/i), "acme corp");
    expect(screen.getByRole("button", { name: /Delete brand/i })).toBeDisabled();
  });

  it("calls onConfirm when the destructive button is clicked", async () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await userEvent.type(screen.getByLabelText(/Confirmation phrase/i), "Acme Corp");
    await userEvent.click(screen.getByRole("button", { name: /Delete brand/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("shows 'Deleting…' and disables the button while isDeleting is true", () => {
    render(<Harness isDeleting />);
    expect(screen.getByRole("button", { name: /Deleting…/i })).toBeDisabled();
  });
});
