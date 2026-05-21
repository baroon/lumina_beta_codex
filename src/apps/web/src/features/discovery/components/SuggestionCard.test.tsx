import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SuggestionCard } from "./SuggestionCard";
import type { CandidateDto } from "@/types/api";

function candidate(overrides?: Partial<CandidateDto>): CandidateDto {
  return {
    id: "c1",
    name: "Acme",
    description: "A competitor",
    confidence: 0.9,
    source: "LLMSuggested",
    metadata: {},
    ...overrides,
  };
}

describe("SuggestionCard", () => {
  it("renders the candidate name and description", () => {
    render(<SuggestionCard candidate={candidate()} selected={false} onToggle={vi.fn()} />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("A competitor")).toBeInTheDocument();
  });

  it("shows an AI source label for AI-sourced candidates", () => {
    render(
      <SuggestionCard
        candidate={candidate({ source: "LLMSuggested" })}
        selected={false}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("shows a Manual source label for user-added candidates", () => {
    render(
      <SuggestionCard
        candidate={candidate({ source: "UserAdded" })}
        selected={false}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText("Manual")).toBeInTheDocument();
  });

  it("calls onToggle with the candidate id when clicked", async () => {
    const onToggle = vi.fn();
    render(<SuggestionCard candidate={candidate()} selected={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByText("Acme"));
    expect(onToggle).toHaveBeenCalledWith("c1");
  });

  it("reflects the selected state on the checkbox", () => {
    render(<SuggestionCard candidate={candidate()} selected onToggle={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("renders a type label when typeMetadataKey and typeLabels are provided", () => {
    render(
      <SuggestionCard
        candidate={candidate({ metadata: { productType: "Service" } })}
        selected={false}
        onToggle={vi.fn()}
        typeMetadataKey="productType"
        typeLabels={{ Service: "Service" }}
      />,
    );
    expect(screen.getByText("Service")).toBeInTheDocument();
  });

  it("renders a country flag for markets with a countryCode", () => {
    render(
      <SuggestionCard
        candidate={candidate({ name: "United States", metadata: { countryCode: "US" } })}
        selected={false}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByText("🇺🇸")).toBeInTheDocument();
  });
});
