import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@/api/apiClient";
import type { TrackerTrendDto } from "@/types/api";
import { TrackerDashboardScreen } from "./TrackerDashboardScreen";

type HookReturn = {
  data?: TrackerTrendDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => Promise<void>;
};

let hookState: HookReturn;

vi.mock("../hooks/useTrackerTrend", () => ({
  useTrackerTrend: () => hookState,
}));

// nivo + jsdom: stub line chart so we can assert on series shape without
// rendering the real SVG.
vi.mock("@/components/charts/LineChartWrapper", () => ({
  LineChartWrapper: ({ data }: { data: Array<{ x: string; y: number | null }> }) => (
    <div data-testid="line-chart">
      {data.map((p, i) => (
        <span key={i}>
          {p.x}={p.y ?? "null"}
        </span>
      ))}
    </div>
  ),
}));

const fixture: TrackerTrendDto = {
  trackerId: "t1",
  days: 30,
  windowStart: "2026-04-28T00:00:00Z",
  series: [
    {
      metricName: "BrandMentionRate",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s1", capturedAt: "2026-04-28T00:00:00Z", value: 0.25, category: null },
        { scanRunId: "s2", capturedAt: "2026-05-21T00:00:00Z", value: 0.38, category: null },
      ],
    },
    {
      metricName: "OverallSentiment",
      seriesKind: "Categorical",
      points: [
        { scanRunId: "s1", capturedAt: "2026-04-28T00:00:00Z", value: null, category: "Neutral" },
        { scanRunId: "s2", capturedAt: "2026-05-21T00:00:00Z", value: null, category: "Positive" },
      ],
    },
  ],
};

describe("TrackerDashboardScreen", () => {
  it("renders loading state", () => {
    hookState = { isLoading: true, isError: false, refetch: vi.fn() };
    const { container } = render(<TrackerDashboardScreen trackerId="t1" />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders 404 placeholder when tracker is not found", () => {
    hookState = {
      isLoading: false,
      isError: true,
      error: new ApiError(404, "not found"),
      refetch: vi.fn(),
    };
    render(<TrackerDashboardScreen trackerId="missing" />);
    expect(screen.getByText(/tracker not found/i)).toBeInTheDocument();
  });

  it("renders one card per series with the correct chart shape", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<TrackerDashboardScreen trackerId="t1" />);

    expect(screen.getByText(/brand mention rate/i)).toBeInTheDocument();
    expect(screen.getByText(/overall sentiment/i)).toBeInTheDocument();
    // Numeric series renders the line-chart stub.
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    // Categorical series renders both Positive + Neutral as legend badges.
    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("Neutral")).toBeInTheDocument();
  });

  it("renders header with window-day-count interpolated", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<TrackerDashboardScreen trackerId="t1" />);
    expect(screen.getByText(/past 30 days/i)).toBeInTheDocument();
  });
});
