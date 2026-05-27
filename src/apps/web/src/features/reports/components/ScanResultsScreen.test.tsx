import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@/api/apiClient";
import type { ScanResultsDto } from "@/types/api";
import { ScanResultsScreen } from "./ScanResultsScreen";

// Stub TanStack Link as a plain anchor — Phase 4 Slice 2 added a "View
// sources" link to the screen header which would otherwise need a full
// router context. Matches the pattern used elsewhere (BrandList.test).
vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...rest
    }: { to: string; children: React.ReactNode } & Record<string, unknown>) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

type HookReturn = {
  data?: ScanResultsDto;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<void>;
};

let hookState: HookReturn;

vi.mock("../hooks/useScanResults", () => ({
  useScanResults: () => hookState,
}));

// Stub the chart wrappers so we can assert on the data they receive without
// pulling in real nivo SVG rendering (slow + jsdom-flaky). Each stub emits
// the labels as plain text — same approach the wrappers' own tests use.
vi.mock("@/components/charts/SentimentDonut", () => ({
  SentimentDonut: ({ data }: { data: Record<string, number> }) => (
    <div data-testid="sentiment-donut">
      {Object.entries(data).map(([k, v]) => (
        <span key={k}>
          {k}: {v}
        </span>
      ))}
    </div>
  ),
}));
vi.mock("@/components/charts/BarChartWrapper", () => ({
  BarChartWrapper: ({ data }: { data: Array<{ label: string; value: number }> }) => (
    <div data-testid="bar-chart">
      {data.map((d) => (
        <span key={d.label}>{d.label}</span>
      ))}
    </div>
  ),
}));

function makeResults(overrides: Partial<ScanResultsDto> = {}): ScanResultsDto {
  return {
    scanRunId: "s1",
    summary: {
      trackerId: "t1",
      trackerName: "Nostri Tracker",
      brandId: "b1",
      brandName: "Nostri",
      startedAt: "2026-05-27T10:00:00Z",
      completedAt: "2026-05-27T10:05:00Z",
      scanStatus: "Completed",
      analysisStatus: "Completed",
      analysisError: null,
      scanCheckCount: 30,
      completedCount: 30,
      failedCount: 0,
      platforms: [{ platformId: "p1", code: "ChatGpt", name: "ChatGPT" }],
    },
    coreMetrics: {
      brandMentionRate: 0.333,
      brandRecommendationRate: 0.1,
      brandShareOfVoice: 0.667,
      averageBrandRank: null,
      competitorMentionCount: 7,
      productMentionCount: 0,
      citationCount: 9,
      ownedCitationCount: 2,
      competitorCitationCount: 3,
      thirdPartyCitationCount: 3,
      unknownCitationCount: 1,
      brandSentimentDistribution: { Positive: 6, Neutral: 4, Unknown: 20 },
      topCitedSources: [
        { rank: 1, sourceName: "Trustpilot", citationCount: 5 },
        { rank: 2, sourceName: "G2", citationCount: 3 },
      ],
    },
    breakdowns: {
      byPlatform: [
        {
          platformId: "p1",
          platformName: "ChatGPT",
          brandMentionRate: 0.333,
          brandRecommendationRate: 0.1,
          brandShareOfVoice: 0.667,
          citationCount: 9,
          brandSentimentDistribution: { Positive: 6 },
        },
      ],
      byLens: [
        {
          lensId: "l1",
          lensName: "Competitor Comparison",
          brandMentionRate: 1.0,
          brandRecommendationRate: 0.0,
          brandShareOfVoice: 0.5,
          citationCount: 0,
          brandSentimentDistribution: {},
        },
      ],
      byTopic: [
        {
          topicId: "tp1",
          topicName: "Sustainable Design",
          brandMentionRate: 0.25,
          brandRecommendationRate: 0.0,
          brandShareOfVoice: 0.5,
          citationCount: 0,
        },
      ],
      byCompetitor: [
        { competitorId: "c1", competitorName: "Acme", mentionCount: 3, recommendationCount: 1 },
        { competitorId: "c2", competitorName: "Beta", mentionCount: 0, recommendationCount: 0 },
      ],
    },
    ...overrides,
  };
}

describe("ScanResultsScreen", () => {
  it("shows a loading state while fetching", () => {
    hookState = {
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    const { container } = render(<ScanResultsScreen scanRunId="s1" />);
    // LoadingPage renders Skeleton elements with .animate-pulse — mirror the
    // existing LoadingPage.test.tsx assertion shape.
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders a friendly 404 placeholder when the scan is not found", () => {
    hookState = {
      isLoading: false,
      isError: true,
      error: new ApiError(404, "not found"),
      refetch: vi.fn(),
    };
    render(<ScanResultsScreen scanRunId="missing" />);
    expect(screen.getByText(/scan results not found/i)).toBeInTheDocument();
  });

  it("renders an error page for non-404 errors", () => {
    hookState = {
      isLoading: false,
      isError: true,
      error: new Error("boom"),
      refetch: vi.fn(),
    };
    render(<ScanResultsScreen scanRunId="s1" />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("renders summary + core metrics + breakdowns on success", () => {
    hookState = {
      data: makeResults(),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    render(<ScanResultsScreen scanRunId="s1" />);

    expect(screen.getByRole("heading", { name: "Scan Results" })).toBeInTheDocument();
    expect(screen.getByText(/Nostri.*Nostri Tracker/)).toBeInTheDocument();
    // Core metric tiles render the rates.
    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    // Top-cited-sources bar chart receives the sources as bar labels.
    expect(screen.getByText("Trustpilot")).toBeInTheDocument();
    // ChatGPT appears as a platform chip in the summary AND as the per-platform
    // bar chart label.
    expect(screen.getAllByText("ChatGPT").length).toBeGreaterThan(0);
    // Each per-scope breakdown gets a bar chart with the scope's items as labels.
    expect(screen.getByText("Competitor Comparison")).toBeInTheDocument();
    expect(screen.getByText("Sustainable Design")).toBeInTheDocument();
    expect(screen.getByText("Acme")).toBeInTheDocument();
    // Tracked-but-unmentioned competitor is included with mentionCount=0
    // (BackdownChartCard renders the bar with the empty value).
    expect(screen.getByText("Beta")).toBeInTheDocument();
    // Sentiment donut received the distribution dict.
    expect(screen.getByTestId("sentiment-donut")).toHaveTextContent("Positive: 6");
    expect(screen.getByTestId("sentiment-donut")).toHaveTextContent("Neutral: 4");
    // 4 breakdown bar charts (Platform/Lens/Topic/Competitor) + 1 TopCitedSources
    // bar chart = 5 BarChartWrapper renders.
    expect(screen.getAllByTestId("bar-chart").length).toBe(5);
  });

  it("renders 'No data' for nullable rates that come back null", () => {
    const data = makeResults({
      coreMetrics: {
        ...makeResults().coreMetrics,
        brandMentionRate: null,
        averageBrandRank: null,
      },
    });
    hookState = {
      data,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    render(<ScanResultsScreen scanRunId="s1" />);
    expect(screen.getAllByText(/no data/i).length).toBeGreaterThan(0);
  });
});
