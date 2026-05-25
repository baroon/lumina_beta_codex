import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PromptCheckGroup } from "./PromptCheckGroup";
import type { PromptDto } from "@/types/api";

const prompts: PromptDto[] = [
  {
    id: "p1",
    text: "AI prompt",
    status: "Draft",
    source: "Generated",
    visibilityCheckId: "c1",
    visibilityCheckName: "Discovery",
    primaryTopicId: "t1",
    primaryTopicName: "Pricing",
    reviewReason: null,
  },
  {
    id: "p2",
    text: "Custom prompt",
    status: "Draft",
    source: "UserAdded",
    visibilityCheckId: "c1",
    visibilityCheckName: "Discovery",
    primaryTopicId: null,
    primaryTopicName: null,
    reviewReason: null,
  },
];

function setup(canAdd = true, reviewReason?: string) {
  const onRegenerate = vi.fn();
  const onRemove = vi.fn();
  const onEdit = vi.fn();
  const onAdd = vi.fn();
  render(
    <PromptCheckGroup
      title="Discovery"
      prompts={prompts}
      topics={[{ id: "t1", name: "Pricing" }]}
      canAdd={canAdd}
      reviewReason={reviewReason}
      onRegenerate={onRegenerate}
      onRemove={onRemove}
      onEdit={onEdit}
      onAdd={onAdd}
    />,
  );
  return { onRegenerate, onRemove, onEdit, onAdd };
}

describe("PromptCheckGroup", () => {
  it("renders prompts, the check description, source icons, and topic", () => {
    setup();
    expect(screen.getByText("AI prompt")).toBeInTheDocument();
    expect(screen.getByText("Custom prompt")).toBeInTheDocument();
    expect(screen.getByText(/Does AI surface your brand/)).toBeInTheDocument();
    expect(screen.getByTitle("AI-generated")).toBeInTheDocument();
    expect(screen.getByTitle("Added by you")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
  });

  it("collapses and expands when the header is toggled", async () => {
    setup();
    expect(screen.getByText("AI prompt")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Collapse Discovery" }));
    expect(screen.queryByText("AI prompt")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Expand Discovery" }));
    expect(screen.getByText("AI prompt")).toBeInTheDocument();
  });

  it("fires regenerate, remove, and edit callbacks", async () => {
    const { onRegenerate, onRemove, onEdit } = setup();

    await userEvent.click(screen.getByRole("button", { name: "Regenerate Discovery" }));
    expect(onRegenerate).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Remove prompt: AI prompt" }));
    expect(onRemove).toHaveBeenCalledWith("p1");

    await userEvent.click(screen.getByRole("button", { name: "AI prompt" }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "Edited");
    await userEvent.tab();
    expect(onEdit).toHaveBeenCalledWith("p1", "Edited");
  });

  it("adds a custom prompt from the section", async () => {
    const { onAdd } = setup();
    await userEvent.click(screen.getByRole("button", { name: /add custom prompt/i }));
    await userEvent.type(screen.getByPlaceholderText("Type a prompt..."), "My prompt");
    await userEvent.click(screen.getByRole("button", { name: /^Add$/ }));
    expect(onAdd).toHaveBeenCalledWith("My prompt", null);
  });

  it("hides the add control when the tracker is full", () => {
    setup(false);
    expect(screen.queryByRole("button", { name: /add custom prompt/i })).not.toBeInTheDocument();
  });

  it("shows a review badge when a reason is provided", () => {
    setup(true, "No competitors configured to compare against.");
    expect(screen.getByText("Review")).toBeInTheDocument();
  });
});
