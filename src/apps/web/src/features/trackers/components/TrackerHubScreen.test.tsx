import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  PromptList,
  ScanListItemDto,
  TrackerListItemDto,
  TrackerScheduleSetup,
} from "@/types/api";

// Stub TanStack so Link renders plain anchors + useParams is harmless.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => {
    let resolved = to;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        resolved = resolved.replace(`$${key}`, value);
      }
    }
    return <a href={resolved}>{children}</a>;
  },
  useParams: () => ({}),
}));

// Hook state we drive from each test.
let summaryState: {
  tracker?: TrackerListItemDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};
let scheduleState: { data?: TrackerScheduleSetup };
let promptsState: { data?: PromptList; isLoading: boolean; isError: boolean };
let scansState: { scans: ScanListItemDto[]; isLoading: boolean; isError: boolean };
let runScanMutate: ReturnType<typeof vi.fn>;
let runScanIsPending = false;
let runScanIsSuccess = false;

vi.mock("@/features/trackers/hooks/useAllTrackers", () => ({
  useAllTrackers: () => ({ data: [], isLoading: false }),
  useTrackerSummary: () => summaryState,
}));
vi.mock("@/features/trackers/hooks/useTrackerSchedule", () => ({
  useTrackerScheduleSetup: () => scheduleState,
  useConfigureTrackerSchedule: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/features/trackers/hooks/usePrompts", () => ({
  usePrompts: () => promptsState,
}));
vi.mock("@/features/trackers/hooks/useScans", () => ({
  useRunScan: () => ({
    mutate: runScanMutate,
    isPending: runScanIsPending,
    isSuccess: runScanIsSuccess,
  }),
  useTrackerScans: () => scansState,
  useLatestScan: () => ({ data: undefined }),
}));

import { TrackerHubScreen } from "./TrackerHubScreen";

function makeTracker(overrides: Partial<TrackerListItemDto> = {}): TrackerListItemDto {
  return {
    trackerId: "t1",
    name: "Acme · US Tracker",
    brandId: "b1",
    brandName: "Acme",
    status: "Active",
    createdAt: "2026-06-01T00:00:00Z",
    scanCount: 3,
    latestScanCompletedAt: "2026-06-09T00:00:00Z",
    ...overrides,
  };
}

const scheduleFixture: TrackerScheduleSetup = {
  trackerId: "t1",
  trackerName: "Acme · US Tracker",
  cadence: "Daily",
  timezone: "UTC",
  activePromptCount: 12,
  platforms: [
    { id: "p1", code: "openai", name: "ChatGPT", configured: true },
    { id: "p2", code: "perplexity", name: "Perplexity", configured: true },
  ],
  selectedPlatformIds: ["p1", "p2"],
};

const promptsFixture: PromptList = {
  promptAllocation: 50,
  count: 2,
  brandName: "Acme",
  trackerName: "Acme · US Tracker",
  prompts: [
    {
      id: "pr1",
      text: "What's the best resume builder?",
      status: "Active",
      source: "Generated",
      lensId: "l1",
      lensName: "Discovery",
      topics: ["Resume builders"],
      reviewReason: null,
    },
    {
      id: "pr2",
      text: "Top 5 resume builders 2026?",
      status: "Active",
      source: "Generated",
      lensId: "l2",
      lensName: "Comparison",
      topics: ["Resume builders"],
      reviewReason: null,
    },
  ],
  checks: [],
  topics: [],
};

const scansFixture: ScanListItemDto[] = [
  {
    scanRunId: "s1",
    trackerId: "t1",
    trackerName: "Acme · US Tracker",
    brandId: "b1",
    brandName: "Acme",
    startedAt: "2026-06-09T08:00:00Z",
    completedAt: "2026-06-09T08:05:00Z",
    scanStatus: "Completed",
    analysisStatus: "Completed",
    scanCheckCount: 24,
    completedCount: 24,
    failedCount: 0,
  },
];

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  summaryState = { tracker: makeTracker(), isLoading: false, isError: false };
  scheduleState = { data: scheduleFixture };
  promptsState = { data: promptsFixture, isLoading: false, isError: false };
  scansState = { scans: scansFixture, isLoading: false, isError: false };
  runScanMutate = vi.fn();
  runScanIsPending = false;
  runScanIsSuccess = false;
});

describe("TrackerHubScreen", () => {
  it("renders the tracker name in the header", () => {
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByRole("heading", { name: "Acme · US Tracker" })).toBeInTheDocument();
  });

  it("renders a breadcrumb with brand context", () => {
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(within(nav).getByText("Brands")).toBeInTheDocument();
    expect(within(nav).getByText("Acme")).toBeInTheDocument();
    expect(within(nav).getByText("Acme · US Tracker")).toBeInTheDocument();
  });

  it("shows the cadence + platform count chips in the header", () => {
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByText("Daily")).toBeInTheDocument();
    expect(screen.getByText(/2 platforms/i)).toBeInTheDocument();
  });

  it("renders all five tabs", () => {
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByRole("tab", { name: /Overview/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Schedule/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Prompts/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Lenses/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Scans/i })).toBeInTheDocument();
  });

  it("Schedule tab shows cadence, timezone, prompts and selected platforms", async () => {
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("tab", { name: /Schedule/i }));
    expect(screen.getAllByText("Daily").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("UTC")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("ChatGPT")).toBeInTheDocument();
    expect(screen.getByText("Perplexity")).toBeInTheDocument();
  });

  it("Prompts tab lists the tracker's prompts", async () => {
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("tab", { name: /Prompts/i }));
    expect(screen.getByText("What's the best resume builder?")).toBeInTheDocument();
    expect(screen.getByText("Top 5 resume builders 2026?")).toBeInTheDocument();
  });

  it("Scans tab links each scan to its results page", async () => {
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("tab", { name: /Scans/i }));
    const link = screen.getByRole("link", { name: /Started/i });
    expect(link).toHaveAttribute("href", "/scans/s1/results");
  });

  it("Scans tab shows the empty-state when there are no scans", async () => {
    scansState = { scans: [], isLoading: false, isError: false };
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("tab", { name: /Scans/i }));
    expect(screen.getByText(/no scans yet/i)).toBeInTheDocument();
  });

  it("Run scan button fires the mutation", async () => {
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("button", { name: /Run scan now/i }));
    expect(runScanMutate).toHaveBeenCalledOnce();
  });

  it("Run scan button shows 'Starting…' while pending", () => {
    runScanIsPending = true;
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByRole("button", { name: /Starting…/i })).toBeDisabled();
  });

  it("Renders 'Tracker not found.' when the summary returns no tracker", () => {
    summaryState = { tracker: undefined, isLoading: false, isError: false };
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByText(/tracker not found/i)).toBeInTheDocument();
  });
});
