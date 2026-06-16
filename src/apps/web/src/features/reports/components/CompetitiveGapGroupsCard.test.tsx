import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { BrandCompetitiveGapGroupDto } from "@/types/api";

vi.mock("@/components/charts/BarChartWrapper", () => ({
  BarChartWrapper: ({ data }: { data: ReadonlyArray<{ label: string; value: number }> }) => (
    <div data-testid="gap-bar">
      {data.map((d) => (
        <span key={d.label} data-bar={d.label}>
          {d.label}:{d.value}
        </span>
      ))}
    </div>
  ),
}));

import { CompetitiveGapGroupsCard } from "./CompetitiveGapGroupsCard";

function group(
  trackedBrandId: string,
  trackedBrandName: string,
  competitors: Array<{ id: string; name: string; gap: number }>,
): BrandCompetitiveGapGroupDto {
  return {
    trackedBrandId,
    trackedBrandName,
    gaps: competitors.map((c) => ({
      competitorId: c.id,
      competitorName: c.name,
      brandMentions: 0,
      competitorMentions: 0,
      mentionsGap: c.gap,
      brandRecommendations: 0,
      competitorRecommendations: 0,
      recommendationsGap: 0,
    })),
  };
}

describe("CompetitiveGapGroupsCard", () => {
  it("renders the no-groups message when nothing is passed", () => {
    render(<CompetitiveGapGroupsCard groups={[]} />);
    expect(screen.getByText(/no tracked-brand gap data/i)).toBeInTheDocument();
  });

  it("renders one block per tracked brand with the per-competitor bars", () => {
    render(
      <CompetitiveGapGroupsCard
        groups={[
          group("acme", "Acme", [
            { id: "canva", name: "Canva", gap: -8 },
            { id: "figma", name: "Figma", gap: 10 },
          ]),
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: /Gaps for Acme/i })).toBeInTheDocument();
    const bars = screen.getByTestId("gap-bar");
    expect(within(bars).getByText("Canva:-8")).toBeInTheDocument();
    expect(within(bars).getByText("Figma:10")).toBeInTheDocument();
  });

  it("drops groups whose tracked brand is excluded via selectedKeys", () => {
    render(
      <CompetitiveGapGroupsCard
        groups={[
          group("acme", "Acme", [{ id: "canva", name: "Canva", gap: -8 }]),
          group("beta", "Beta", [{ id: "figma", name: "Figma", gap: 10 }]),
        ]}
        selectedKeys={["Brand:acme", "Competitor:canva"]}
      />,
    );
    expect(screen.getByRole("heading", { name: /Gaps for Acme/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Gaps for Beta/i })).not.toBeInTheDocument();
  });

  it("drops groups that end up with zero visible bars after the competitor filter", () => {
    render(
      <CompetitiveGapGroupsCard
        groups={[group("acme", "Acme", [{ id: "canva", name: "Canva", gap: -8 }])]}
        selectedKeys={["Brand:acme"]}
      />,
    );
    // Brand is selected but the only competitor (canva) isn't — group
    // collapses to nothing and we fall through to the empty state.
    expect(screen.getByText(/no tracked-brand gap data/i)).toBeInTheDocument();
  });
});
