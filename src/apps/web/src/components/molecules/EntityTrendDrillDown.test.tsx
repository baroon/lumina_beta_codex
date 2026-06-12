import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { EntityTrendSeriesDto } from "@/types/api";
import { EntityTrendDrillDown } from "./EntityTrendDrillDown";

function series(points: EntityTrendSeriesDto["points"]): EntityTrendSeriesDto {
  return {
    entityType: "Brand",
    entityId: "b1",
    entityName: "Acme",
    metricName: "BrandMentionRate",
    seriesKind: "Numeric",
    points,
  };
}

describe("EntityTrendDrillDown", () => {
  it("renders the chart caption when there are numeric points", () => {
    render(
      <EntityTrendDrillDown
        name="Acme"
        trend={series([
          { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: 0.3, category: null },
          { scanRunId: "s2", capturedAt: "2026-05-15T00:00:00Z", value: 0.5, category: null },
        ])}
      />,
    );
    expect(screen.getByText(/Visibility per scan — Acme/i)).toBeInTheDocument();
  });

  it("renders a hint when the trend is undefined", () => {
    render(<EntityTrendDrillDown name="Acme" trend={undefined} />);
    expect(screen.getByText(/Not enough per-scan data to plot Acme's trend/i)).toBeInTheDocument();
  });

  it("renders the hint when every point is null", () => {
    render(
      <EntityTrendDrillDown
        name="Acme"
        trend={series([
          { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: null, category: null },
          { scanRunId: "s2", capturedAt: "2026-05-15T00:00:00Z", value: null, category: null },
        ])}
      />,
    );
    expect(screen.getByText(/Not enough per-scan data to plot Acme's trend/i)).toBeInTheDocument();
  });
});
