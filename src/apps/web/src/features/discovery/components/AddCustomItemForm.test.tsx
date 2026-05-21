import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddCustomItemForm } from "./AddCustomItemForm";

describe("AddCustomItemForm", () => {
  beforeAll(() => {
    // Radix Select relies on these in jsdom.
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.hasPointerCapture = vi.fn(() => false);
    Element.prototype.releasePointerCapture = vi.fn();
  });

  it("starts collapsed showing the add-custom button", () => {
    render(<AddCustomItemForm placeholder="Add product" onAdd={vi.fn()} />);
    expect(screen.getByRole("button", { name: /add custom/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Add product")).not.toBeInTheDocument();
  });

  it("opens the form when the add-custom button is clicked", async () => {
    render(<AddCustomItemForm placeholder="Add product" onAdd={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /add custom/i }));
    expect(screen.getByPlaceholderText("Add product")).toBeInTheDocument();
  });

  it("submits the trimmed value and collapses again", async () => {
    const onAdd = vi.fn();
    render(<AddCustomItemForm placeholder="Add product" onAdd={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: /add custom/i }));
    await userEvent.type(screen.getByPlaceholderText("Add product"), "  Widget  ");
    await userEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(onAdd).toHaveBeenCalledWith("Widget", undefined);
    expect(screen.getByRole("button", { name: /add custom/i })).toBeInTheDocument();
  });

  it("disables Add until a value is entered", async () => {
    render(<AddCustomItemForm placeholder="Add product" onAdd={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /add custom/i }));
    expect(screen.getByRole("button", { name: /^add$/i })).toBeDisabled();
  });

  it("keeps Add disabled when a type is required but not selected", async () => {
    render(
      <AddCustomItemForm
        placeholder="Add signal"
        onAdd={vi.fn()}
        typeOptions={[{ value: "AwardsAndRecognitions", label: "Awards" }]}
        metadataKey="signalType"
        typeRequired
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /add custom/i }));
    await userEvent.type(screen.getByPlaceholderText("Add signal"), "Best SaaS 2026");
    expect(screen.getByRole("button", { name: /^add$/i })).toBeDisabled();
  });

  it("cancels and collapses without calling onAdd", async () => {
    const onAdd = vi.fn();
    render(<AddCustomItemForm placeholder="Add product" onAdd={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: /add custom/i }));
    await userEvent.type(screen.getByPlaceholderText("Add product"), "X");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /add custom/i })).toBeInTheDocument();
  });

  it("does not reuse a previously chosen type for the next custom item", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <AddCustomItemForm
        placeholder="Add product"
        onAdd={onAdd}
        typeOptions={[
          { value: "Product", label: "Product" },
          { value: "Service", label: "Service" },
        ]}
        metadataKey="productType"
      />,
    );

    // First item: explicitly choose the "Service" type.
    await user.click(screen.getByRole("button", { name: /add custom/i }));
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Service" }));
    await user.type(screen.getByPlaceholderText("Add product"), "First");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    expect(onAdd).toHaveBeenLastCalledWith("First", { productType: "Service" });

    // Second item: do NOT touch the type selector — it must not inherit "Service".
    await user.click(screen.getByRole("button", { name: /add custom/i }));
    await user.type(screen.getByPlaceholderText("Add product"), "Second");
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    expect(onAdd).toHaveBeenLastCalledWith("Second", undefined);
  });
});
