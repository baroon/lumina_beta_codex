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

  it("metric switcher exposes all six metrics", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);
    const switcher = screen.getByRole("combobox") as HTMLSelectElement;
    const labels = Array.from(switcher.options).map((o) => o.textContent);
    expect(labels).toEqual([
      "Mention rate",
      "Recommendation rate",
      "Share of voice",
      "Owned citation share",
      "Average brand rank",
      "Sentiment",
    ]);
  });

  it("Average brand rank renders with reversed Y-axis (1 at top)", async () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    await userEvent.selectOptions(screen.getByRole("combobox"), "rank");

    const chart = screen.getByTestId("line-chart");
    expect(chart).toHaveAttribute("data-reverse-y", "true");
    expect(chart).toHaveAttribute("data-min", "1");
    // Only Acme has a rank series in the fixture; Beta's BrandMentionRate
    // line drops out when the rank metric is selected.
    expect(screen.getByTestId(`series-${acmeId}`)).toHaveTextContent("2.4");
    expect(screen.queryByTestId(`series-${betaId}`)).not.toBeInTheDocument();
    // Competitors don't have brand-only metrics; Indeed drops out too.
    expect(screen.queryByTestId(`series-${indeedId}`)).not.toBeInTheDocument();
  });

  it("Sentiment renders a colored-markers timeline instead of the line chart", async () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    await userEvent.selectOptions(screen.getByRole("combobox"), "sentiment");

    // Line chart is replaced — no line-chart testid in the sentiment view.
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();

    // The timeline carries one row per series with the entity name on the
    // left + the legend at the bottom listing every sentiment category.
    expect(screen.getByText("Acme", { selector: "div" })).toBeInTheDocument();
    expect(screen.getByText("Positive", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Negative", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Neutral", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Mixed", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Unknown", { selector: "span" })).toBeInTheDocument();
  });

  it("Share of voice + Owned citation share are brand-only (no competitor lines)", async () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<WorkspaceOverviewScreen />);

    await userEvent.selectOptions(screen.getByRole("combobox"), "sov");
    expect(screen.getByTestId(`series-${acmeId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`series-${indeedId}`)).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole("combobox"), "owned");
    expect(screen.getByTestId(`series-${acmeId}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`series-${indeedId}`)).not.toBeInTheDocument();
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

  it("renders Slice B competitive sections when competitive data loaded", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    competitiveState = {
      data: {
        workspaceId: "00000000-0000-0000-0000-000000000000",
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
        days: 30,
        windowStart: "2026-04-28T00:00:00Z",
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
        activityHeatmap: {
          rows: ["ChatGPT"],
          columns: ["May 1", "May 8"],
          cells: [{ row: "ChatGPT", column: "May 1", value: 2 }],
        },
        topicHeatmap: {
          rows: ["Architecture"],
          columns: ["ChatGPT"],
          cells: [{ row: "Architecture", column: "ChatGPT", value: 4 }],
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
            trackerId: "t1",
            trackerName: "Acme Tracker",
            brandId: acmeId,
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
    expect(screen.getByText(/activity heatmap/i)).toBeInTheDocument();
    expect(screen.getByText(/topic coverage/i)).toBeInTheDocument();
    expect(screen.getByText(/recent chats/i)).toBeInTheDocument();

    // Recent-chat card carries brand chip ("Acme") + opens drawer.
    expect(screen.getByText("Best architecture firms?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /best architecture firms/i }));
    const dialog = screen.getByRole("dialog");
    // Drawer surfaces brand + tracker labels.
    expect(within(dialog).getByText(/best architecture firms/i)).toBeInTheDocument();
    expect(within(dialog).getByText("Acme Tracker")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Acme").length).toBeGreaterThan(0);

    // Close drawer.
    await userEvent.click(within(dialog).getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    depthState = { data: undefined, isLoading: false, isError: false };
  });
});
