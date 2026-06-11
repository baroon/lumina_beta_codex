import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { EditableChipList } from "./EditableChipList";

function setup(overrides: Partial<Parameters<typeof EditableChipList>[0]> = {}) {
  const onAdd = vi.fn();
  const onRemove = vi.fn();
  render(
    <EditableChipList
      items={[{ id: "1", name: "Job seekers" }]}
      addPlaceholder="Add an audience…"
      addLabel="Add audience"
      emptyLabel="Not detected."
      removeAriaSingular="audience"
      onAdd={onAdd}
      onRemove={onRemove}
      {...overrides}
    />,
  );
  return { onAdd, onRemove };
}

describe("EditableChipList", () => {
  it("renders the empty label when there are no items", () => {
    setup({ items: [] });
    expect(screen.getByText("Not detected.")).toBeInTheDocument();
  });

  it("renders one chip per item with an aria-labelled remove button", () => {
    setup();
    expect(screen.getByText("Job seekers")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Remove audience Job seekers/i }),
    ).toBeInTheDocument();
  });

  it("clicking remove fires onRemove with the item id", async () => {
    const { onRemove } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Remove audience Job seekers/i }));
    expect(onRemove).toHaveBeenCalledWith("1");
  });

  it("Add is disabled when the input is empty", () => {
    setup();
    expect(screen.getByRole("button", { name: /^Add audience$/ })).toBeDisabled();
  });

  it("Add fires onAdd with the trimmed name + clears the input", async () => {
    const { onAdd } = setup();
    await userEvent.type(screen.getByPlaceholderText(/add an audience/i), "  HR teams  ");
    await userEvent.click(screen.getByRole("button", { name: /^Add audience$/ }));
    expect(onAdd).toHaveBeenCalledWith("HR teams");
    expect(screen.getByPlaceholderText(/add an audience/i)).toHaveValue("");
  });

  it("Add shows an inline error for a case-insensitive duplicate", async () => {
    const { onAdd } = setup();
    await userEvent.type(screen.getByPlaceholderText(/add an audience/i), "job SEEKERS");
    await userEvent.click(screen.getByRole("button", { name: /^Add audience$/ }));
    expect(screen.getByText(/already in the list/i)).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("Add reads Enter as submit", async () => {
    const { onAdd } = setup();
    await userEvent.type(screen.getByPlaceholderText(/add an audience/i), "HR teams{enter}");
    expect(onAdd).toHaveBeenCalledWith("HR teams");
  });

  it("Add button reads 'Adding…' while isAdding is true", () => {
    setup({ isAdding: true });
    expect(screen.getByRole("button", { name: /Adding…/i })).toBeDisabled();
  });

  it("disables the X for the chip whose id matches pendingRemoveId", () => {
    setup({ pendingRemoveId: "1" });
    expect(screen.getByRole("button", { name: /Remove audience Job seekers/i })).toBeDisabled();
  });

  it("shows the serverError message when one is supplied", () => {
    setup({ serverError: "Add failed — try again." });
    expect(screen.getByText(/Add failed/i)).toBeInTheDocument();
  });
});
