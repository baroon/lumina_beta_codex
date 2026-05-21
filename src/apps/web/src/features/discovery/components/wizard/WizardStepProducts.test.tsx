import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WizardStepProducts } from "./WizardStepProducts";
import type { CandidateDto } from "@/types/api";

function cand(id: string, name: string): CandidateDto {
  return {
    id,
    name,
    description: null,
    confidence: 0.9,
    source: "LLMSuggested",
    status: "Suggested",
    metadata: {},
  };
}

describe("WizardStepProducts", () => {
  it("renders the products section with candidates", () => {
    render(
      <WizardStepProducts
        candidates={[cand("p1", "Alpha")]}
        selectedIds={new Set(["p1"])}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
        onDeselectAll={vi.fn()}
        onAddCustom={vi.fn()}
      />,
    );
    expect(screen.getByText("Products & Services")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });
});
