import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { EntityRateDto } from "@/types/api";

// Stub the bar wrapper so jsdom doesn't have to mount Recharts.
vi.mock("@/components/charts/BarChartWrapper", () => ({
  BarChartWrapper: ({
    data,
    formatValue,
  }: {
    data: ReadonlyArray<{ label: string; value: number }>;
    formatValue?: (v: number) => string;
  }) => (
    <div data-testid="bar-chart">
      {data.map((d) => (
        <span key={d.label} data-bar={d.label}>
          {d.label}:{formatValue ? formatValue(d.value) : d.value}
        </span>
      ))}
    </div>
  ),
}));

import { RecommendationRateCard } from "./RecommendationRateCard";

function rate(overrides: Partial<EntityRateDto>): EntityRateDto {
  return {
    entityType: "Brand",
    entityId: "x",
    name: "X",
    isTrackedBrand: false,
    mentionCount: 0,
    recommendationRate: null,
    ...overrides,
  };
}

describe("RecommendationRateCard", () => {
  it("renders one bar per entity with a recommendation rate", () => {
    render(
      <RecommendationRateCard
        rates={[
          rate({ entityId: "a", name: "Acme", isTrackedBrand: true, recommendationRate: 0.45 }),
          rate({ entityId: "b", name: "Beta", recommendationRate: 0.6 }),
        ]}
      />,
    );
    const chart = screen.getByTestId("bar-chart");
    expect(within(chart).getByText("Acme:45%")).toBeInTheDocument();
    expect(within(chart).getByText("Beta:60%")).toBeInTheDocument();
  });

  it("drops entities with a null recommendation rate", () => {
    render(
      <RecommendationRateCard
        rates={[
          rate({ entityId: "a", name: "Acme", recommendationRate: 0.5 }),
          rate({ entityId: "b", name: "NoData", recommendationRate: null }),
        ]}
      />,
    );
    const chart = screen.getByTestId("bar-chart");
    expect(within(chart).getByText(/Acme/)).toBeInTheDocument();
    expect(within(chart).queryByText(/NoData/)).not.toBeInTheDocument();
  });

  it("renders the no-data message when every entity is null", () => {
    render(<RecommendationRateCard rates={[rate({ entityId: "a", name: "A" })]} />);
    expect(screen.getByText(/no mentions in this window/i)).toBeInTheDocument();
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
  });

  it("narrows to selectedKeys when provided", () => {
    render(
      <RecommendationRateCard
        rates={[
          rate({ entityId: "a", name: "Acme", recommendationRate: 0.5 }),
          rate({ entityId: "b", name: "Beta", recommendationRate: 0.6 }),
        ]}
        selectedKeys={["Brand:a"]}
      />,
    );
    const chart = screen.getByTestId("bar-chart");
    expect(within(chart).getByText(/Acme/)).toBeInTheDocument();
    expect(within(chart).queryByText(/Beta/)).not.toBeInTheDocument();
  });
});
