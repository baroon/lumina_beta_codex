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
  },
];

function setup() {
  const onRegenerate = vi.fn();
  const onRemove = vi.fn();
  const onEdit = vi.fn();
  render(
    <PromptCheckGroup
      title="Discovery"
      prompts={prompts}
      onRegenerate={onRegenerate}
      onRemove={onRemove}
      onEdit={onEdit}
    />,
  );
  return { onRegenerate, onRemove, onEdit };
}

describe("PromptCheckGroup", () => {
  it("renders prompts with source icons and topic", () => {
    setup();
    expect(screen.getByText("AI prompt")).toBeInTheDocument();
    expect(screen.getByText("Custom prompt")).toBeInTheDocument();
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
    await userEvent.keyboard("{Enter}");
    expect(onEdit).toHaveBeenCalledWith("p1", "Edited");
  });
});
