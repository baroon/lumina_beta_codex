import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WizardStepCompetitiveLandscape } from "./WizardStepCompetitiveLandscape";
import type { CandidateDto } from "@/types/api";

function cand(id: string, name: string): CandidateDto {
  return {
    id,
    name,
    description: null,
    confidence: 0.9,
    source: "LLMSuggested",
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

describe("WizardStepCompetitiveLandscape", () => {
  it("renders the competitors, topics, and trust-signals sections", () => {
    render(
      <WizardStepCompetitiveLandscape
        topics={section([cand("t1", "Pricing")])}
        competitors={section([cand("c1", "Acme")])}
        trustSignals={section([cand("ts1", "SOC2")])}
      />,
    );
    expect(screen.getByText("Competitors")).toBeInTheDocument();
    expect(screen.getByText("Topics")).toBeInTheDocument();
    expect(screen.getByText("Trust Signals")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("SOC2")).toBeInTheDocument();
  });

  it("shows the resuggesting overlay when loading", () => {
    render(
      <WizardStepCompetitiveLandscape
        topics={section([])}
        competitors={section([])}
        trustSignals={section([])}
        isLoading
      />,
    );
    expect(screen.getByText(/improving suggestions/i)).toBeInTheDocument();
  });
});
