import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import type { CompetitorListItemDto } from "@/types/api";
import { CompetitorsTable } from "./CompetitorsTable";

function competitor(overrides: Partial<CompetitorListItemDto> = {}): CompetitorListItemDto {
  return {
    competitorId: "c1",
    name: "Acme",
    domain: "acme.com",
    mentionCount: 12,
    recommendationCount: 4,
    mentionRate: 0.4,
    recommendationRate: 0.33,
    shareOfVoice: 0.5,
    ...overrides,
  };
}

describe("CompetitorsTable", () => {
  it("renders one row per competitor with mention + rec counts", () => {
    render(
      <CompetitorsTable
        competitors={[
          competitor(),
          competitor({ competitorId: "c2", name: "Beta", domain: "beta.com", mentionCount: 5 }),
        ]}
        onSelectCompetitor={vi.fn()}
      />,
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("acme.com")).toBeInTheDocument();
    expect(screen.getByText("beta.com")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders empty state when competitors is empty", () => {
    render(<CompetitorsTable competitors={[]} onSelectCompetitor={vi.fn()} />);
    expect(screen.getByText(/no competitor metrics available/i)).toBeInTheDocument();
  });

  it("renders em-dash for null rate fields", () => {
    render(
      <CompetitorsTable
        competitors={[competitor({ recommendationRate: null, mentionRate: null })]}
        onSelectCompetitor={vi.fn()}
      />,
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("calls onSelectCompetitor when the name button is clicked", async () => {
    const onSelectCompetitor = vi.fn();
    render(
      <CompetitorsTable competitors={[competitor()]} onSelectCompetitor={onSelectCompetitor} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Acme" }));
    expect(onSelectCompetitor).toHaveBeenCalledWith("c1");
  });
});
