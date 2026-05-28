import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import type { WorkspaceOverviewDto } from "@/types/api";
import { WorkspaceOverviewScreen } from "./WorkspaceOverviewScreen";

type HookReturn = {
  data?: WorkspaceOverviewDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => Promise<void>;
};

let hookState: HookReturn;

vi.mock("../hooks/useWorkspaceOverview", () => ({
  useWorkspaceOverview: () => hookState,
}));

// Stub the chart wrapper — same pattern as the v2 dashboard test. Lets us
// assert on series shape without rendering real SVG.
vi.mock("@/components/charts/LineChartWrapper", () => ({
  LineChartWrapper: ({
    series,
  }: {
    series?: Array<{ id: string; name: string; data: Array<{ x: string; y: number | null }> }>;
  }) => (
    <div data-testid="line-chart">
      {series?.map((s) => (
        <span key={s.id} data-testid={`series-${s.id}`}>
          {s.name}
        </span>
      ))}
    </div>
  ),
}));

const acmeId = "brand-acme";
const betaId = "brand-beta";
const indeedId = "comp-indeed";

const fixture: WorkspaceOverviewDto = {
  workspaceId: "00000000-0000-0000-0000-000000000000",
  days: 30,
  windowStart: "2026-04-28T00:00:00Z",
  scanCount: 4,
  trackedBrands: [
    { brandId: acmeId, name: "Acme" },
    { brandId: betaId, name: "Beta" },
  ],
  competitors: [{ competitorId: indeedId, name: "Indeed" }],
  hero: { queries: 100, mentions: 60, citations: 15, brandMentionRate: 0.45 },
  series: [
    {
      entityType: "Brand",
      entityId: acmeId,
      entityName: "Acme",
      metricName: "BrandMentionRate",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: 0.4, category: null },
        { scanRunId: "s2", capturedAt: "2026-05-21T00:00:00Z", value: 0.5, category: null },
      ],
    },
    {
      entityType: "Brand",
      entityId: betaId,
      entityName: "Beta",
      metricName: "BrandMentionRate",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s3", capturedAt: "2026-05-01T00:00:00Z", value: 0.2, category: null },
        { scanRunId: "s4", capturedAt: "2026-05-21T00:00:00Z", value: 0.3, category: null },
      ],
    },
    {
      entityType: "Competitor",
      entityId: indeedId,
      entityName: "Indeed",
      metricName: "MentionRate",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: 0.1, category: null },
        { scanRunId: "s2", capturedAt: "2026-05-21T00:00:00Z", value: 0.2, category: null },
      ],
    },
  ],
  topEntities: [
    {
      entityType: "Brand",
      entityId: acmeId,
      name: "Acme",
      isTrackedBrand: true,
      visibility: 0.5,
      visibilityDelta: 0.1,
      shareOfVoice: 0.6,
      shareOfVoiceDelta: null,
      sentiment: "Positive",
    },
    {
      entityType: "Brand",
      entityId: betaId,
      name: "Beta",
      isTrackedBrand: true,
      visibility: 0.3,
      visibilityDelta: 0.1,
      shareOfVoice: 0.25,
      shareOfVoiceDelta: null,
      sentiment: "Neutral",
    },
    {
      entityType: "Competitor",
      entityId: indeedId,
      name: "Indeed",
      isTrackedBrand: false,
      visibility: 0.2,
      visibilityDelta: 0.1,
      shareOfVoice: null,
      shareOfVoiceDelta: null,
      sentiment: null,
    },
  ],
};

describe("WorkspaceOverviewScreen", () => {
  it("renders loading state", () => {
    hookState = { isLoading: true, isError: false, refetch: vi.fn() };
    const { container } = render(<WorkspaceOverviewScreen />);
    // LoadingPage renders an animate-pulse skeleton.
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders empty-state placeholder when workspace has no brands", () => {
    hookState = {
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      data: {
        ...fixture,
        trackedBrands: [],
        competitors: [],
        topEntities: [],
        series: [],
      },
    };
    render(<WorkspaceOverviewScreen />);
    expect(screen.getByText(/tracked brands yet/i)).toBeInTheDocument();
  });

  it("renders hero + trend + top entities with multiple tracked brands", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    // Hero counts.
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();

    // Trend chart series for both tracked brands.
    expect(screen.getByTestId(`series-${acmeId}`)).toHaveTextContent("Acme");
    expect(screen.getByTestId(`series-${betaId}`)).toHaveTextContent("Beta");

    // Both tracked brands carry the "You" chip in the Top Entities table.
    expect(screen.getAllByText(/^You$/)).toHaveLength(2);

    // Indeed appears as a competitor row in the Top Entities table.
    const table = screen.getByRole("table");
    expect(within(table).getByText("Indeed")).toBeInTheDocument();
  });

  it("brand selector defaults to all-selected and shows 'All brands' label", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);
    expect(screen.getByRole("button", { name: /brand selector/i })).toHaveTextContent("All brands");
  });

  it("deselecting an entity drops its series + table row", async () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    // Open the selector and uncheck Indeed.
    await userEvent.click(screen.getByRole("button", { name: /brand selector/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Indeed" }));

    // Series for Indeed is dropped from the chart.
    expect(screen.queryByTestId(`series-${indeedId}`)).not.toBeInTheDocument();
    // Indeed's row in Top Entities is also gone — Acme + Beta remain.
    // (The selector still lists "Indeed" inside the open dropdown panel; we
    // look specifically for it in the table by checking the visible row text.)
    const table = screen.getByRole("table");
    expect(within(table).queryByText("Indeed")).not.toBeInTheDocument();
  });
});
