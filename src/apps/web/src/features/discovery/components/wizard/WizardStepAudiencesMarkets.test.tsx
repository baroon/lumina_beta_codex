import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WizardStepAudiencesMarkets } from "./WizardStepAudiencesMarkets";
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

function section(candidates: CandidateDto[]) {
  return {
    candidates,
    selectedIds: new Set(candidates.map((c) => c.id)),
    onToggle: vi.fn(),
    onSelectAll: vi.fn(),
    onDeselectAll: vi.fn(),
    onAddCustom: vi.fn(),
  };
}

describe("WizardStepAudiencesMarkets", () => {
  it("renders both the audiences and markets sections", () => {
    render(
      <WizardStepAudiencesMarkets
        audiences={section([cand("a1", "Marketers")])}
        markets={section([cand("m1", "United States")])}
      />,
    );
    expect(screen.getByText("Target Audiences")).toBeInTheDocument();
    expect(screen.getByText("Markets")).toBeInTheDocument();
    expect(screen.getByText("Marketers")).toBeInTheDocument();
    expect(screen.getByText("United States")).toBeInTheDocument();
  });
});
