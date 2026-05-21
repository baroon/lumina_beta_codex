import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardStepReview } from "./WizardStepReview";
import type { BrandProfileDto, CandidateDto } from "@/types/api";

function cand(
  id: string,
  name: string,
  source: CandidateDto["source"] = "LLMSuggested",
): CandidateDto {
  return {
    id,
    name,
    description: null,
    confidence: 0.9,
    source,
    status: "Suggested",
    metadata: {},
  };
}

function emptySection() {
  return { candidates: [] as CandidateDto[], selectedIds: new Set<string>() };
}

function makeSections(productCandidates: CandidateDto[], selected: string[]) {
  return {
    products: { candidates: productCandidates, selectedIds: new Set(selected) },
    audiences: emptySection(),
    markets: emptySection(),
    topics: emptySection(),
    competitors: emptySection(),
    trustSignals: emptySection(),
  };
}

const brandProfile = {
  id: "bp1",
  shortDescription: "A SaaS tool",
  industry: "Tech",
  category: "Software",
  positioning: "Leader",
  confidence: 0.9,
  source: "LLMSuggested",
  status: "Suggested",
} as BrandProfileDto;

function renderReview(
  overrides: {
    onToggle?: ReturnType<typeof vi.fn>;
    onAddCustom?: ReturnType<typeof vi.fn>;
    onRemoveCustom?: ReturnType<typeof vi.fn>;
    onEditSection?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const props = {
    brandProfile,
    sections: makeSections([cand("p1", "Alpha")], ["p1"]),
    onToggle: overrides.onToggle ?? vi.fn(),
    onAddCustom: overrides.onAddCustom ?? vi.fn(),
    onRemoveCustom: overrides.onRemoveCustom ?? vi.fn(),
    onEditSection: overrides.onEditSection ?? vi.fn(),
  };
  render(<WizardStepReview {...props} />);
  return props;
}

describe("WizardStepReview", () => {
  it("renders section labels, selected chips, counts, and empty states", () => {
    renderReview();
    expect(screen.getByText("Products & Services")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("1 / 1 selected")).toBeInTheDocument();
    expect(screen.getAllByText("None selected").length).toBe(5);
  });

  it("calls onEditSection for the brand profile and a section", async () => {
    const onEditSection = vi.fn();
    renderReview({ onEditSection });

    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    await userEvent.click(editButtons[0]);
    expect(onEditSection).toHaveBeenCalledWith("brandProfile");

    await userEvent.click(editButtons[1]);
    expect(onEditSection).toHaveBeenCalledWith("products");
  });

  it("removes a chip with undo", async () => {
    const onToggle = vi.fn();
    renderReview({ onToggle });

    await userEvent.click(screen.getByRole("button", { name: "Remove Alpha" }));
    expect(onToggle).toHaveBeenCalledWith("products", "p1");
    expect(screen.getByText(/Removed "Alpha"/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(onToggle).toHaveBeenLastCalledWith("products", "p1");
  });

  it("adds a custom item to a section", async () => {
    const onAddCustom = vi.fn();
    renderReview({ onAddCustom });

    const addCustomButtons = screen.getAllByRole("button", { name: /add custom/i });
    await userEvent.click(addCustomButtons[0]);
    await userEvent.type(
      screen.getByPlaceholderText("Add products & services..."),
      "Custom Product",
    );
    await userEvent.click(screen.getByRole("button", { name: /^add$/i }));

    expect(onAddCustom).toHaveBeenCalledWith("products", "Custom Product", undefined);
  });
});
