import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { EntityMentionDto } from "@/types/api";

vi.mock("@/components/charts/BarChartWrapper", () => ({
  BarChartWrapper: ({ data }: { data: ReadonlyArray<{ label: string; value: number }> }) => (
    <div data-testid="bar-chart">
      {data.map((d) => (
        <span key={d.label} data-bar={d.label}>
          {d.label}:{d.value}
        </span>
      ))}
    </div>
  ),
}));

import { BrandVsCompetitorCard } from "./BrandVsCompetitorCard";

function mention(overrides: Partial<EntityMentionDto>): EntityMentionDto {
  return {
    entityType: "Brand",
    entityId: "x",
    name: "X",
    isTrackedBrand: false,
    mentionCount: 0,
    share: 0,
    ...overrides,
  };
}

describe("BrandVsCompetitorCard", () => {
  it("renders the no-data message when no entity has any mentions", () => {
    render(
      <BrandVsCompetitorCard mentions={[mention({ entityId: "a", name: "A", mentionCount: 0 })]} />,
    );
    expect(screen.getByText(/no mention data in this window/i)).toBeInTheDocument();
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
  });

  it("renders one bar per non-zero entity", () => {
    render(
      <BrandVsCompetitorCard
        mentions={[
          mention({ entityId: "a", name: "Acme", isTrackedBrand: true, mentionCount: 6 }),
          mention({ entityId: "b", name: "Beta", mentionCount: 4 }),
          mention({ entityId: "c", name: "Drop", mentionCount: 0 }),
        ]}
      />,
    );
    const chart = screen.getByTestId("bar-chart");
    expect(within(chart).getByText("Acme:6")).toBeInTheDocument();
    expect(within(chart).getByText("Beta:4")).toBeInTheDocument();
    expect(within(chart).queryByText(/Drop/)).not.toBeInTheDocument();
  });

  it("narrows to selectedKeys when provided", () => {
    render(
      <BrandVsCompetitorCard
        mentions={[
          mention({ entityId: "a", name: "Acme", mentionCount: 6 }),
          mention({ entityId: "b", name: "Beta", mentionCount: 4 }),
        ]}
        selectedKeys={["Brand:a"]}
      />,
    );
    const chart = screen.getByTestId("bar-chart");
    expect(within(chart).getByText(/Acme/)).toBeInTheDocument();
    expect(within(chart).queryByText(/Beta/)).not.toBeInTheDocument();
  });

  it("treats an undefined selectedKeys as 'no filter'", () => {
    render(
      <BrandVsCompetitorCard
        mentions={[
          mention({ entityId: "a", name: "Acme", mentionCount: 6 }),
          mention({ entityId: "b", name: "Beta", mentionCount: 4 }),
        ]}
      />,
    );
    const chart = screen.getByTestId("bar-chart");
    expect(within(chart).getByText(/Acme/)).toBeInTheDocument();
    expect(within(chart).getByText(/Beta/)).toBeInTheDocument();
  });
});
