import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@/api/apiClient";
import type { TrackerDashboardDto } from "@/types/api";
import { TrackerDashboardV2Screen } from "./TrackerDashboardV2Screen";

type HookReturn = {
  data?: TrackerDashboardDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => Promise<void>;
};

let hookState: HookReturn;

vi.mock("../hooks/useTrackerDashboard", () => ({
  useTrackerDashboard: () => hookState,
}));

// Slice B competitive sections fetched separately. Default: no data
// (returns null so Slice A tests are unaffected). Slice B tests below
// set competitiveState to drive the sections.
let competitiveState: {
  data?: import("@/types/api").TrackerCompetitiveDto;
  isLoading: boolean;
  isError: boolean;
} = {
  data: undefined,
  isLoading: false,
  isError: false,
};

vi.mock("../hooks/useTrackerCompetitive", () => ({
  useTrackerCompetitive: () => competitiveState,
}));

// Stub the chart wrappers used by Slice B so we can assert on their data
// without rendering real SVG (nivo + jsdom flakes).
vi.mock("@/components/charts/DonutChartWrapper", () => ({
  DonutChartWrapper: ({ data }: { data: Array<{ id: string; label: string; value: number }> }) => (
    <div data-testid="donut-chart">
      {data.map((d) => (
        <span key={d.id}>
          {d.label}={d.value}
        </span>
      ))}
    </div>
  ),
}));
vi.mock("@/components/charts/RadarChartWrapper", () => ({
  RadarChartWrapper: ({ data }: { data: Array<{ axis: string; value: number }> }) => (
    <div data-testid="radar-chart">
      {data.map((d) => (
        <span key={d.axis}>
          {d.axis}={d.value}
        </span>
      ))}
    </div>
  ),
}));
vi.mock("@/components/charts/BarChartWrapper", () => ({
  BarChartWrapper: ({ data }: { data: Array<{ label: string; value: number }> }) => (
    <div data-testid="bar-chart">
      {data.map((d, i) => (
        <span key={i}>
          {d.label}={d.value}
        </span>
      ))}
    </div>
  ),
}));

// Stub the chart wrapper so we can assert on the series shape passed in
// without rendering real SVG (nivo + jsdom flakes).
vi.mock("@/components/charts/LineChartWrapper", () => ({
  LineChartWrapper: ({
    series,
  }: {
    series?: Array<{ id: string; name: string; data: Array<{ x: string; y: number | null }> }>;
  }) => (
    <div data-testid="line-chart">
      {series?.map((s) => (
        <span key={s.id} data-testid={`series-${s.id}`}>
          {s.name}={s.data.map((p) => p.y ?? "null").join(",")}
        </span>
      ))}
    </div>
  ),
}));

const trackerId = "t1";
const brandId = "b1";
const competitorId = "c1";

const fixture: TrackerDashboardDto = {
  trackerId,
  trackerName: "Nostri Tracker",
  brandId,
  brandName: "Nostri",
  days: 30,
  windowStart: "2026-04-28T00:00:00Z",
  scanCount: 3,
  hero: {
    queries: 180,
    mentions: 96,
    citations: 12,
    brandMentionRate: 0.33,
  },
  series: [
    {
      entityType: "Brand",
      entityId: brandId,
      entityName: "Nostri",
      metricName: "BrandMentionRate",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: 0.25, category: null },
        { scanRunId: "s2", capturedAt: "2026-05-21T00:00:00Z", value: 0.38, category: null },
      ],
    },
    {
      entityType: "Competitor",
      entityId: competitorId,
      entityName: "Gensler",
      metricName: "MentionRate",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: 0.27, category: null },
        { scanRunId: "s2", capturedAt: "2026-05-21T00:00:00Z", value: 0.17, category: null },
      ],
    },
  ],
  topBrands: [
    {
      entityType: "Brand",
      entityId: brandId,
      name: "Nostri",
      isTrackedBrand: true,
      visibility: 0.38,
      visibilityDelta: 0.05,
      shareOfVoice: 0.5,
      shareOfVoiceDelta: null,
      sentiment: "Positive",
    },
    {
      entityType: "Competitor",
      entityId: competitorId,
      name: "Gensler",
      isTrackedBrand: false,
      visibility: 0.17,
      visibilityDelta: -0.03,
      shareOfVoice: null,
      shareOfVoiceDelta: null,
      sentiment: null,
    },
  ],
};

describe("TrackerDashboardV2Screen", () => {
  it("renders loading state", () => {
    hookState = { isLoading: true, isError: false, refetch: vi.fn() };
    const { container } = render(<TrackerDashboardV2Screen trackerId={trackerId} />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders 404 placeholder when tracker is not found", () => {
    hookState = {
      isLoading: false,
      isError: true,
      error: new ApiError(404, "not found"),
      refetch: vi.fn(),
    };
    render(<TrackerDashboardV2Screen trackerId={trackerId} />);
    expect(screen.getByText(/tracker not found/i)).toBeInTheDocument();
  });

  it("renders hero counts + header on success", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<TrackerDashboardV2Screen trackerId={trackerId} />);

    expect(screen.getByRole("heading", { name: "Nostri Tracker" })).toBeInTheDocument();
    expect(screen.getByText("180")).toBeInTheDocument(); // queries
    expect(screen.getByText("96")).toBeInTheDocument(); // mentions
    expect(screen.getByText("12")).toBeInTheDocument(); // citations
    expect(screen.getByText("33%")).toBeInTheDocument(); // brand mention rate
  });

  it("renders one chart series per entity for the selected metric", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<TrackerDashboardV2Screen trackerId={trackerId} />);

    // Default metric = Mention rate. Both Nostri (BrandMentionRate) and
    // Gensler (MentionRate) should appear in the chart.
    expect(screen.getByTestId(`series-${brandId}`)).toHaveTextContent("Nostri");
    expect(screen.getByTestId(`series-${competitorId}`)).toHaveTextContent("Gensler");
  });

  it("renders Top Brands rows with tracked brand first + You chip + Δ indicators", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<TrackerDashboardV2Screen trackerId={trackerId} />);

    expect(screen.getByText("Nostri")).toBeInTheDocument();
    expect(screen.getByText(/^You$/)).toBeInTheDocument();
    expect(screen.getByText("38%")).toBeInTheDocument(); // Nostri visibility
    expect(screen.getByText("+5pp")).toBeInTheDocument(); // Δ
    expect(screen.getByText("17%")).toBeInTheDocument(); // Gensler visibility
    expect(screen.getByText("-3pp")).toBeInTheDocument(); // Gensler Δ
    expect(screen.getByText("Positive")).toBeInTheDocument();
  });

  it("switches the chart when the metric switcher changes", async () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<TrackerDashboardV2Screen trackerId={trackerId} />);

    // Default = Mention rate. Switch to Recommendation rate.
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "rec");

    // Fixture only has BrandMentionRate + MentionRate series — Recommendation
    // rate switch should result in NO matching series in the stub.
    expect(screen.queryByTestId(`series-${brandId}`)).not.toBeInTheDocument();
  });

  it("filter bar quick-buttons toggle aria-pressed", async () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<TrackerDashboardV2Screen trackerId={trackerId} />);

    const d30 = screen.getByRole("button", { name: "30d" });
    expect(d30).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "7d" }));
    // After click, 7d is pressed.
    expect(screen.getByRole("button", { name: "7d" })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders Slice B competitive sections when competitive data is loaded", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    competitiveState = {
      data: {
        trackerId,
        brandId,
        brandName: "Nostri",
        days: 30,
        windowStart: "2026-04-28T00:00:00Z",
        topDomains: [
          {
            sourceId: "src-1",
            sourceName: "Trustpilot",
            normalizedDomain: "trustpilot.com",
            sourceType: "Editorial",
            citationCount: 4,
            citationRate: 0.8,
          },
          {
            sourceId: "src-2",
            sourceName: "Wikipedia",
            normalizedDomain: "en.wikipedia.org",
            sourceType: "Reference",
            citationCount: 1,
            citationRate: 0.2,
          },
        ],
        domainTypes: [
          { sourceType: "Editorial", citationCount: 4, share: 0.8 },
          { sourceType: "Reference", citationCount: 1, share: 0.2 },
        ],
        mentionDistribution: [
          {
            entityType: "Brand",
            entityId: brandId,
            name: "Nostri",
            isTrackedBrand: true,
            mentionCount: 5,
            share: 0.5,
          },
          {
            entityType: "Competitor",
            entityId: competitorId,
            name: "Gensler",
            isTrackedBrand: false,
            mentionCount: 3,
            share: 0.3,
          },
          {
            entityType: "Competitor",
            entityId: "c2",
            name: "HOK",
            isTrackedBrand: false,
            mentionCount: 2,
            share: 0.2,
          },
        ],
        competitiveGaps: [
          {
            competitorId,
            competitorName: "Gensler",
            brandMentions: 5,
            competitorMentions: 3,
            mentionsGap: 2,
            brandRecommendations: 2,
            competitorRecommendations: 1,
            recommendationsGap: 1,
          },
        ],
        recommendationRates: [
          {
            entityType: "Brand",
            entityId: brandId,
            name: "Nostri",
            isTrackedBrand: true,
            mentionCount: 5,
            recommendationRate: 0.4,
          },
          {
            entityType: "Competitor",
            entityId: competitorId,
            name: "Gensler",
            isTrackedBrand: false,
            mentionCount: 3,
            recommendationRate: 0.33,
          },
        ],
      },
      isLoading: false,
      isError: false,
    };
    render(<TrackerDashboardV2Screen trackerId={trackerId} />);

    // Section titles render.
    expect(screen.getByText(/share of voice/i)).toBeInTheDocument();
    expect(screen.getByText(/top citation domains/i)).toBeInTheDocument();
    expect(screen.getByText(/competitive gap/i)).toBeInTheDocument();
    expect(screen.getByText(/recommendation rate by entity/i)).toBeInTheDocument();
    expect(screen.getByText(/mention distribution/i)).toBeInTheDocument();

    // Top domains table has type chips ("Editorial" appears in both the
    // table chip and the Domain types donut, hence getAllByText).
    expect(screen.getByText("Trustpilot")).toBeInTheDocument();
    expect(screen.getAllByText("Editorial").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Reference").length).toBeGreaterThan(0);

    // Donut + radar fed the mention distribution data.
    const donut = screen.getByTestId("donut-chart");
    expect(donut).toHaveTextContent("Nostri=5");
    const radar = screen.getByTestId("radar-chart");
    expect(radar).toHaveTextContent("HOK=2");

    // Reset for downstream tests.
    competitiveState = { data: undefined, isLoading: false, isError: false };
  });
});
