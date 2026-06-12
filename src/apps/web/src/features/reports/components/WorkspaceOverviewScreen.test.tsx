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

// Lens-count chip data — the screen calls this hook unconditionally
// for the LensSelector dropdown chips. Stub it as "no data" by default;
// individual tests don't need to assert on it.
vi.mock("../hooks/useLensCounts", () => ({
  useLensCounts: () => ({ data: undefined, isLoading: false, isError: false }),
}));

vi.mock("../hooks/useTopicCounts", () => ({
  useTopicCounts: () => ({ data: undefined, isLoading: false, isError: false }),
}));

vi.mock("../hooks/useProductCounts", () => ({
  useProductCounts: () => ({ data: undefined, isLoading: false, isError: false }),
}));

vi.mock("../hooks/useMarketCounts", () => ({
  useMarketCounts: () => ({ data: undefined, isLoading: false, isError: false }),
}));

vi.mock("../hooks/useAudienceCounts", () => ({
  useAudienceCounts: () => ({ data: undefined, isLoading: false, isError: false }),
}));

// Discovery-summary strip is also called unconditionally. Stubbed empty
// so the rest of the screen rendering tests aren't affected by it.
vi.mock("../hooks/useDiscoverySummary", () => ({
  useDiscoverySummary: () => ({ data: undefined, isLoading: false, isError: false }),
}));

// Slice B competitive sections fetched separately. Default: no data.
let competitiveState: {
  data?: import("@/types/api").WorkspaceCompetitiveDto;
  isLoading: boolean;
  isError: boolean;
} = {
  data: undefined,
  isLoading: false,
  isError: false,
};

vi.mock("../hooks/useWorkspaceCompetitive", () => ({
  useWorkspaceCompetitive: () => competitiveState,
}));

// Slice C depth sections fetched separately. Default: no data.
let depthState: {
  data?: import("@/types/api").WorkspaceDepthDto;
  isLoading: boolean;
  isError: boolean;
} = {
  data: undefined,
  isLoading: false,
  isError: false,
};

vi.mock("../hooks/useWorkspaceDepth", () => ({
  useWorkspaceDepth: () => depthState,
}));

// Stub HeatmapWrapper so we can assert on the data shape without
// rendering the actual grid.
vi.mock("@/components/charts/HeatmapWrapper", () => ({
  HeatmapWrapper: ({
    data,
  }: {
    data: {
      rows: string[];
      cols: string[];
      cells: Array<{ row: string; col: string; value: number }>;
    };
  }) => (
    <div data-testid="heatmap">
      <span data-testid="heatmap-rows">{data.rows.join(",")}</span>
      <span data-testid="heatmap-cols">{data.cols.join(",")}</span>
      {data.cells.map((c) => (
        <span key={`${c.row}__${c.col}`}>
          {c.row}-{c.col}={c.value}
        </span>
      ))}
    </div>
  ),
}));

// Stub Slice B chart wrappers so we can assert on the data shape without
// rendering real SVG.
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

// Stub the chart wrapper — same pattern as the v2 dashboard test. Lets us
// assert on series shape without rendering real SVG. We also capture the
// reverseY flag + the first/last y-values so the test can verify the
// metric-format axis wiring.
vi.mock("@/components/charts/LineChartWrapper", () => ({
  LineChartWrapper: ({
    series,
    reverseY,
    minValue,
    maxValue,
  }: {
    series?: Array<{ id: string; name: string; data: Array<{ x: string; y: number | null }> }>;
    reverseY?: boolean;
    minValue?: number;
    maxValue?: number;
  }) => (
    <div
      data-testid="line-chart"
      data-reverse-y={reverseY ? "true" : "false"}
      data-min={minValue ?? ""}
      data-max={maxValue ?? ""}
    >
      {series?.map((s) => (
        <span key={s.id} data-testid={`series-${s.id}`}>
          {s.name}={s.data.map((p) => p.y ?? "null").join(",")}
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
  from: "2026-04-28T00:00:00Z",
  to: "2026-05-28T00:00:00Z",
  scanCount: 4,
  trackedBrands: [
    { brandId: acmeId, name: "Acme" },
    { brandId: betaId, name: "Beta" },
  ],
  competitors: [{ competitorId: indeedId, name: "Indeed" }],
  hero: {
    queries: 100,
    mentions: 60,
    citations: 15,
    brandMentionRate: 0.45,
    brandAbsenceRate: 0.4,
    brandFirstMentionRate: 0.35,
  },
  previousHero: {
    queries: 80,
    mentions: 40,
    citations: 10,
    brandMentionRate: 0.3,
    brandAbsenceRate: 0.55,
    brandFirstMentionRate: 0.25,
  },
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
    // Brand-only metrics — exercise SoV / OwnedCitationShare / AvgRank /
    // Sentiment switcher options. Only Acme carries them in this fixture
    // so the test can assert that competitor lines drop when those
    // metrics are selected.
    {
      entityType: "Brand",
      entityId: acmeId,
      entityName: "Acme",
      metricName: "BrandShareOfVoice",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: 0.42, category: null },
      ],
    },
    {
      entityType: "Brand",
      entityId: acmeId,
      entityName: "Acme",
      metricName: "OwnedCitationShare",
      seriesKind: "Numeric",
      points: [{ scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: 0.6, category: null }],
    },
    {
      entityType: "Brand",
      entityId: acmeId,
      entityName: "Acme",
      metricName: "AverageBrandRank",
      seriesKind: "Numeric",
      points: [{ scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: 2.4, category: null }],
    },
    {
      entityType: "Brand",
      entityId: acmeId,
      entityName: "Acme",
      metricName: "OverallSentiment",
      seriesKind: "Categorical",
      points: [
        { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: null, category: "Positive" },
        { scanRunId: "s2", capturedAt: "2026-05-21T00:00:00Z", value: null, category: "Negative" },
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
      sentimentDelta: 2,
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
      sentimentDelta: null,
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
      sentimentDelta: null,
    },
  ],
  topBrandAttributes: [
    { rank: 1, name: "trustworthy", polarity: "Positive", mentionCount: 8 },
    { rank: 2, name: "in-depth", polarity: "Positive", mentionCount: 4 },
    { rank: 3, name: "slow", polarity: "Negative", mentionCount: 2 },
  ],
  coMentions: [
    {
      competitorId: indeedId,
      competitorName: "Indeed",
      coMentionCount: 6,
      competitorMentionCount: 10,
    },
  ],
  topBrandRiskFlags: [
    { rank: 1, flagType: "layoffs", severity: "High", mentionCount: 3 },
    { rank: 2, flagType: "outage", severity: "Medium", mentionCount: 1 },
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

  it("renders hero + 6 trend cards + top entities with multiple tracked brands", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    // Hero counts.
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();

    // All six metric cards render (no dropdown anymore).
    expect(screen.getByTestId("trend-card-mention")).toBeInTheDocument();
    expect(screen.getByTestId("trend-card-rec")).toBeInTheDocument();
    expect(screen.getByTestId("trend-card-sov")).toBeInTheDocument();
    expect(screen.getByTestId("trend-card-owned")).toBeInTheDocument();
    expect(screen.getByTestId("trend-card-rank")).toBeInTheDocument();
    expect(screen.getByTestId("trend-card-sentiment")).toBeInTheDocument();

    // Mention rate card carries both tracked brand series + the competitor.
    const mentionCard = screen.getByTestId("trend-card-mention");
    expect(within(mentionCard).getByTestId(`series-${acmeId}`)).toHaveTextContent("Acme");
    expect(within(mentionCard).getByTestId(`series-${betaId}`)).toHaveTextContent("Beta");
    expect(within(mentionCard).getByTestId(`series-${indeedId}`)).toHaveTextContent("Indeed");

    // Both tracked brands carry the "You" chip in the Top Entities table.
    expect(screen.getAllByText(/^You$/)).toHaveLength(2);

    const table = screen.getByRole("table");

    // Acme's sentiment moved Negative → Positive in the fixture → +2pts
    // chip rendered next to the Positive badge.
    expect(within(table).getByText("+2pts")).toBeInTheDocument();

    // Indeed appears as a competitor row in the Top Entities table.
    expect(within(table).getByText("Indeed")).toBeInTheDocument();
  });

  it("brand selector defaults to all-selected and shows 'All brands' label", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);
    expect(screen.getByRole("button", { name: /brand selector/i })).toHaveTextContent("All brands");
  });

  it("Hero tile drill-down scrolls to the matching trend card via aria-label", async () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    // jsdom doesn't implement scrollIntoView — stub on prototype so the
    // assertion can verify it was called rather than crashing.
    const scrollSpy = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollSpy,
    });
    try {
      render(<WorkspaceOverviewScreen />);

      const citationsTile = screen.getByRole("button", { name: /view trend by citations/i });
      await userEvent.click(citationsTile);
      expect(scrollSpy).toHaveBeenCalled();

      const brandRateTile = screen.getByRole("button", {
        name: /view trend by brand mention rate/i,
      });
      await userEvent.click(brandRateTile);
      expect(scrollSpy).toHaveBeenCalledTimes(2);
    } finally {
      // @ts-expect-error — restore by deleting the override
      delete window.HTMLElement.prototype.scrollIntoView;
    }
  });

  it("renders the Absence rate and First-mention rate hero tiles with the new measurement-model fields", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    // Labels appear in the hero row.
    expect(screen.getByText(/absence rate/i)).toBeInTheDocument();
    expect(screen.getByText(/first-mention rate/i)).toBeInTheDocument();
  });

  it("renders the co-mention landscape card with per-competitor share text", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    // Card title.
    expect(screen.getByText(/who we appear alongside/i)).toBeInTheDocument();
    // Per-competitor row: "6 / 10 (60% of competitor's mentions)"
    expect(screen.getByText(/6 \/ 10/)).toBeInTheDocument();
    expect(screen.getByText(/60%.*of competitor's mentions/i)).toBeInTheDocument();
  });

  it("renders the workspace top risk flags as severity-colored chips", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    expect(screen.getByText(/risk flags/i)).toBeInTheDocument();
    expect(screen.getByText("layoffs")).toBeInTheDocument();
    expect(screen.getByText("outage")).toBeInTheDocument();
    expect(screen.getByText("×3")).toBeInTheDocument();
    expect(screen.getByText("×1")).toBeInTheDocument();
  });

  it("renders the workspace top brand attributes as polarity-colored chips", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    // All 3 fixture attributes appear in the Sentiment & Trust section.
    expect(screen.getByText("trustworthy")).toBeInTheDocument();
    expect(screen.getByText("in-depth")).toBeInTheDocument();
    expect(screen.getByText("slow")).toBeInTheDocument();
    // Counts render alongside the names.
    expect(screen.getByText("×8")).toBeInTheDocument();
    expect(screen.getByText("×4")).toBeInTheDocument();
    expect(screen.getByText("×2")).toBeInTheDocument();
  });

  it("Absence rate delta renders DOWN as success-colored (invertDelta) because lower is better", () => {
    // Fixture: previousAbsenceRate=0.55, currentAbsenceRate=0.4 → -27%.
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    const delta = screen.getByLabelText(/Down 27 percent vs previous period/i);
    expect(delta).toHaveClass("text-semantic-success-600");
  });

  it("Average brand rank card renders with reversed Y-axis (1 at top)", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    const rankCard = screen.getByTestId("trend-card-rank");
    const chart = within(rankCard).getByTestId("line-chart");
    expect(chart).toHaveAttribute("data-reverse-y", "true");
    expect(chart).toHaveAttribute("data-min", "1");
    // Only Acme has a rank series.
    expect(within(rankCard).getByTestId(`series-${acmeId}`)).toHaveTextContent("2.4");
    expect(within(rankCard).queryByTestId(`series-${betaId}`)).not.toBeInTheDocument();
    expect(within(rankCard).queryByTestId(`series-${indeedId}`)).not.toBeInTheDocument();
  });

  it("Sentiment card renders a colored-markers timeline (no line chart)", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    const sentimentCard = screen.getByTestId("trend-card-sentiment");
    expect(within(sentimentCard).queryByTestId("line-chart")).not.toBeInTheDocument();
    // Timeline legend names every sentiment category.
    for (const label of ["Positive", "Neutral", "Mixed", "Negative", "Unknown"]) {
      expect(within(sentimentCard).getByText(label)).toBeInTheDocument();
    }
  });

  it("Share of voice + Owned citation share cards are brand-only (no competitor lines)", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    const sovCard = screen.getByTestId("trend-card-sov");
    expect(within(sovCard).getByTestId(`series-${acmeId}`)).toBeInTheDocument();
    expect(within(sovCard).queryByTestId(`series-${indeedId}`)).not.toBeInTheDocument();

    const ownedCard = screen.getByTestId("trend-card-owned");
    expect(within(ownedCard).getByTestId(`series-${acmeId}`)).toBeInTheDocument();
    expect(within(ownedCard).queryByTestId(`series-${indeedId}`)).not.toBeInTheDocument();
  });

  it("deselecting an entity drops its series from every trend card + table row", async () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    // Open the selector and uncheck Indeed.
    await userEvent.click(screen.getByRole("button", { name: /brand selector/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Indeed" }));

    // Indeed series is dropped from every trend card it appeared in
    // (the Mention rate card was the only one with a competitor line).
    expect(screen.queryByTestId(`series-${indeedId}`)).not.toBeInTheDocument();
    // Indeed's row in Top Entities is also gone — Acme + Beta remain.
    const table = screen.getByRole("table");
    expect(within(table).queryByText("Indeed")).not.toBeInTheDocument();
  });

  it("renders Slice B competitive sections when competitive data loaded", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    competitiveState = {
      data: {
        workspaceId: "00000000-0000-0000-0000-000000000000",
        from: "2026-04-28T00:00:00Z",
        to: "2026-05-28T00:00:00Z",
        topDomains: [
          {
            sourceId: "src-1",
            sourceName: "Trustpilot",
            normalizedDomain: "trustpilot.com",
            sourceType: "Editorial",
            citationCount: 4,
            citationRate: 0.8,
          },
        ],
        domainTypes: [{ sourceType: "Editorial", citationCount: 4, share: 1 }],
        mentionDistribution: [
          {
            entityType: "Brand",
            entityId: acmeId,
            name: "Acme",
            isTrackedBrand: true,
            mentionCount: 4,
            share: 0.4,
          },
          {
            entityType: "Brand",
            entityId: betaId,
            name: "Beta",
            isTrackedBrand: true,
            mentionCount: 3,
            share: 0.3,
          },
          {
            entityType: "Competitor",
            entityId: indeedId,
            name: "Indeed",
            isTrackedBrand: false,
            mentionCount: 3,
            share: 0.3,
          },
        ],
        competitiveGaps: [
          {
            trackedBrandId: acmeId,
            trackedBrandName: "Acme",
            gaps: [
              {
                competitorId: indeedId,
                competitorName: "Indeed",
                brandMentions: 4,
                competitorMentions: 2,
                mentionsGap: 2,
                brandRecommendations: 2,
                competitorRecommendations: 1,
                recommendationsGap: 1,
              },
            ],
          },
          {
            trackedBrandId: betaId,
            trackedBrandName: "Beta",
            gaps: [
              {
                competitorId: indeedId,
                competitorName: "Indeed",
                brandMentions: 3,
                competitorMentions: 5,
                mentionsGap: -2,
                brandRecommendations: 1,
                competitorRecommendations: 2,
                recommendationsGap: -1,
              },
            ],
          },
        ],
        recommendationRates: [
          {
            entityType: "Brand",
            entityId: acmeId,
            name: "Acme",
            isTrackedBrand: true,
            mentionCount: 4,
            recommendationRate: 0.5,
          },
          {
            entityType: "Competitor",
            entityId: indeedId,
            name: "Indeed",
            isTrackedBrand: false,
            mentionCount: 3,
            recommendationRate: 0.33,
          },
        ],
      },
      isLoading: false,
      isError: false,
    };
    render(<WorkspaceOverviewScreen />);

    // Section titles. "Share of voice" now also appears in the metric
    // switcher dropdown, so we look for the card-shaped occurrence
    // specifically (the donut card uses a CardTitle with that text).
    expect(screen.getAllByText(/share of voice/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/competitive gap/i)).toBeInTheDocument();
    expect(screen.getByText(/recommendation rate by entity/i)).toBeInTheDocument();
    expect(screen.getByText(/brand vs competitor/i)).toBeInTheDocument();
    expect(screen.getByText(/mention distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/top citation domains/i)).toBeInTheDocument();
    expect(screen.getByText(/domain types/i)).toBeInTheDocument();

    // Multi-brand gap groups — one header per tracked brand.
    expect(screen.getByText(/Gaps for Acme/i)).toBeInTheDocument();
    expect(screen.getByText(/Gaps for Beta/i)).toBeInTheDocument();

    // Top domains table row.
    expect(screen.getByText("Trustpilot")).toBeInTheDocument();

    competitiveState = { data: undefined, isLoading: false, isError: false };
  });

  it("renders Slice C depth sections + recent-chat drawer with multi-tracker context", async () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    depthState = {
      data: {
        workspaceId: "00000000-0000-0000-0000-000000000000",
        from: "2026-04-28T00:00:00Z",
        to: "2026-05-28T00:00:00Z",
        mentionsByPlatform: [
          {
            platformId: "p1",
            platformCode: "openai",
            platformName: "ChatGPT",
            answerCount: 4,
            brandMentionCount: 3,
            brandMentionRate: 0.75,
          },
        ],
        sentimentDistribution: [
          { sentiment: "Positive", count: 2, share: 0.66 },
          { sentiment: "Negative", count: 1, share: 0.33 },
        ],
        topicHeatmap: {
          rows: ["Architecture"],
          columns: ["ChatGPT"],
          cells: [{ row: "Architecture", column: "ChatGPT", answerCount: 4, citationCount: 7 }],
        },
        recentChats: [
          {
            answerId: "a1",
            promptRunId: "r1",
            promptText: "Best architecture firms?",
            platformId: "p1",
            platformCode: "openai",
            platformName: "ChatGPT",
            lensCode: "x",
            lensName: "Category Discovery",
            answerSnippet: "Acme leads the field…",
            capturedAt: "2026-05-27T08:00:00Z",
            mentionCount: 3,
            citationCount: 5,
            brandSentiment: "Positive",
            brandName: "Acme",
          },
        ],
      },
      isLoading: false,
      isError: false,
    };
    render(<WorkspaceOverviewScreen />);

    // Section titles render.
    expect(screen.getByText(/mentions by platform/i)).toBeInTheDocument();
    expect(screen.getByText(/brand sentiment distribution/i)).toBeInTheDocument();
    // Activity heatmap is intentionally removed from /overview.
    expect(screen.queryByText(/activity heatmap/i)).not.toBeInTheDocument();
    // Card title is exactly "Topic coverage". The new subtitle now
    // includes the phrase "per-topic coverage" too — match the title.
    expect(screen.getByText(/^topic coverage$/i)).toBeInTheDocument();
    expect(screen.getByText(/recent chats/i)).toBeInTheDocument();

    // Recent-chat card carries brand chip ("Acme") + opens drawer.
    expect(screen.getByText("Best architecture firms?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /best architecture firms/i }));
    const dialog = screen.getByRole("dialog");
    // Drawer surfaces brand + tracker labels.
    expect(within(dialog).getByText(/best architecture firms/i)).toBeInTheDocument();
    // Drawer no longer surfaces a tracker name — brand chip is enough.
    expect(within(dialog).queryByText("Acme Tracker")).not.toBeInTheDocument();
    expect(within(dialog).getAllByText("Acme").length).toBeGreaterThan(0);

    // Close drawer.
    await userEvent.click(within(dialog).getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Topic heatmap toggle. Default is Answers (cell value = 4); flipping
    // to Citations should re-render the heatmap with citationCount (7).
    // The HeatmapWrapper stub renders each cell as "<row>-<col>=<value>"
    // so the value is queryable as text directly.
    const toggleGroup = screen.getByRole("group", { name: /topic metric/i });
    expect(
      screen.getByText((_t, el) => el?.textContent === "Architecture-ChatGPT=4"),
    ).toBeInTheDocument();

    await userEvent.click(within(toggleGroup).getByRole("button", { name: "Citations" }));
    expect(
      screen.queryByText((_t, el) => el?.textContent === "Architecture-ChatGPT=4"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText((_t, el) => el?.textContent === "Architecture-ChatGPT=7"),
    ).toBeInTheDocument();

    depthState = { data: undefined, isLoading: false, isError: false };
  });
});
