import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  PromptList,
  ScanListItemDto,
  TrackerLensesSetupDto,
  TrackerListItemDto,
  TrackerScheduleSetup,
  WorkspaceOverviewDto,
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
let lensesState: { data?: TrackerLensesSetupDto; isLoading: boolean; isError: boolean };
let overviewState: { data?: WorkspaceOverviewDto; isLoading: boolean; isError: boolean };

vi.mock("@/features/trackers/hooks/useAllTrackers", () => ({
  useAllTrackers: () => ({ data: [], isLoading: false }),
  useTrackerSummary: () => summaryState,
}));
vi.mock("@/features/trackers/hooks/useTrackerSchedule", () => ({
  useTrackerScheduleSetup: () => scheduleState,
  useConfigureTrackerSchedule: () => ({ mutate: vi.fn() }),
}));
let addPromptMutate: ReturnType<typeof vi.fn>;
let updatePromptMutate: ReturnType<typeof vi.fn>;
let removePromptMutate: ReturnType<typeof vi.fn>;
const idleMutation = { isPending: false, isError: false, isSuccess: false };

vi.mock("@/features/trackers/hooks/usePrompts", () => ({
  usePrompts: () => promptsState,
  useAddCustomPrompt: () => ({ mutate: addPromptMutate, ...idleMutation }),
  useUpdatePrompt: () => ({ mutate: updatePromptMutate, ...idleMutation }),
  useRemovePrompt: () => ({ mutate: removePromptMutate, ...idleMutation }),
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
vi.mock("@/features/trackers/hooks/useTrackerLenses", () => ({
  useTrackerLensesSetup: () => lensesState,
  useUpdateTrackerLenses: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/features/trackers/hooks/useTrackerOverview", () => ({
  useTrackerOverview: () => overviewState,
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

const overviewFixture: WorkspaceOverviewDto = {
  workspaceId: "w1",
  from: "2026-05-10T00:00:00Z",
  to: "2026-06-09T00:00:00Z",
  trackedBrands: [{ brandId: "b1", name: "Acme" }],
  competitors: [{ competitorId: "c1", name: "Canva" }],
  scanCount: 4,
  hero: {
    queries: 96,
    mentions: 30,
    citations: 12,
    brandMentionRate: 0.5,
    brandAbsenceRate: 0.4,
    brandFirstMentionRate: 0.35,
  },
  previousHero: {
    queries: 80,
    mentions: 20,
    citations: 10,
    brandMentionRate: 0.25,
    brandAbsenceRate: 0.55,
    brandFirstMentionRate: 0.2,
  },
  series: [],
  topEntities: [
    {
      entityType: "Brand",
      entityId: "b1",
      name: "Acme",
      isTrackedBrand: true,
      visibility: 0.5,
      visibilityDelta: 0.1,
      shareOfVoice: 0.4,
      shareOfVoiceDelta: 0.05,
      sentiment: "Positive",
      sentimentDelta: 1,
    },
    {
      entityType: "Competitor",
      entityId: "c1",
      name: "Canva",
      isTrackedBrand: false,
      visibility: 0.8,
      visibilityDelta: 0,
      shareOfVoice: 0.6,
      shareOfVoiceDelta: 0,
      sentiment: "Neutral",
      sentimentDelta: 0,
    },
  ],
  topBrandAttributes: [],
  coMentions: [],
};

const lensesFixture: TrackerLensesSetupDto = {
  trackerId: "t1",
  trackerName: "Acme · US Tracker",
  lenses: [
    {
      id: "l1",
      code: "category",
      name: "Category Discovery",
      description: "Top-of-funnel discovery prompts.",
      displayOrder: 1,
    },
    {
      id: "l2",
      code: "comparison",
      name: "Comparison",
      description: "Head-to-head comparison prompts.",
      displayOrder: 2,
    },
    {
      id: "l3",
      code: "problem",
      name: "Problem Resolution",
      description: "Task-oriented prompts.",
      displayOrder: 3,
    },
  ],
  selectedLensIds: ["l1", "l2"],
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
  lensesState = { data: lensesFixture, isLoading: false, isError: false };
  overviewState = { data: overviewFixture, isLoading: false, isError: false };
  addPromptMutate = vi.fn();
  updatePromptMutate = vi.fn();
  removePromptMutate = vi.fn();
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

  it("Prompts tab — clicking X on a prompt fires the remove mutation", async () => {
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("tab", { name: /Prompts/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /Remove prompt What's the best resume builder/i }),
    );
    expect(removePromptMutate).toHaveBeenCalledWith("pr1");
  });

  it("Prompts tab — Add prompt fires the mutation with the trimmed text + first lens", async () => {
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("tab", { name: /Prompts/i }));
    const input = screen.getByPlaceholderText(/Add a prompt/i);
    await userEvent.type(input, "  How do I optimize my resume for ATS?  ");
    await userEvent.click(screen.getByRole("button", { name: /^Add prompt$/ }));
    expect(addPromptMutate).toHaveBeenCalledOnce();
    expect(addPromptMutate.mock.calls[0][0]).toEqual({
      text: "How do I optimize my resume for ATS?",
      // First lens from the fixture defaults the select.
      lensId: "l1",
      primaryTopicId: null,
    });
  });

  it("Prompts tab — Add prompt is disabled when the allocation cap is reached", async () => {
    // Set allocation == prompt count so the cap is hit.
    promptsState = {
      data: { ...promptsFixture, promptAllocation: promptsFixture.prompts.length },
      isLoading: false,
      isError: false,
    };
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("tab", { name: /Prompts/i }));
    expect(screen.getByText(/\(at cap\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Add prompt$/ })).toBeDisabled();
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

  it("Lenses tab lists each lens with its active/inactive state", async () => {
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("tab", { name: /Lenses/i }));

    // Header summary reflects 2 of 3 selected.
    expect(screen.getByText(/2 of 3 Visibility Lenses active/i)).toBeInTheDocument();

    // Each lens name renders. We don't assert the chip color, just the
    // textual badge for active/inactive.
    expect(screen.getByText("Category Discovery")).toBeInTheDocument();
    expect(screen.getByText("Comparison")).toBeInTheDocument();
    expect(screen.getByText("Problem Resolution")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBe(2);
    expect(screen.getAllByText("Inactive").length).toBe(1);
  });

  it("Lenses tab Edit link points at the edit screen with tab=lenses", async () => {
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("tab", { name: /Lenses/i }));
    const editLink = screen.getByRole("link", { name: /Edit lenses/i });
    expect(editLink).toHaveAttribute("href", "/brands/b1/trackers/t1/edit");
  });

  it("Lenses tab shows a loading hint while setup is loading", async () => {
    lensesState = { data: undefined, isLoading: true, isError: false };
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("tab", { name: /Lenses/i }));
    expect(screen.getByText(/Loading lenses/i)).toBeInTheDocument();
  });

  it("Lenses tab shows an error hint when the setup query errors", async () => {
    lensesState = { data: undefined, isLoading: false, isError: true };
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("tab", { name: /Lenses/i }));
    expect(screen.getByText(/Failed to load lenses/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------
  // Overview tab — hero KPIs + top entities scoped to this tracker
  // -------------------------------------------------------------------

  it("Overview tab renders all four hero KPIs from the workspace overview hook", () => {
    // Overview is the default tab — no click needed.
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByText("96")).toBeInTheDocument(); // queries
    expect(screen.getByText("30")).toBeInTheDocument(); // mentions
    expect(screen.getByText("12")).toBeInTheDocument(); // citations
    // "50%" appears in the hero tile AND in Acme's visibility cell (also
    // 0.5). Two matches is the right count — collapsing them with
    // getAllByText keeps the assertion robust.
    expect(screen.getAllByText("50%").length).toBeGreaterThanOrEqual(1);
  });

  it("Overview tab renders the top entities table with the tracked brand highlighted", () => {
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByText(/Top entities by visibility/i)).toBeInTheDocument();
    expect(screen.getByText("Canva")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("Overview tab shows the empty-state when the tracker has no scans yet", () => {
    overviewState = {
      data: { ...overviewFixture, scanCount: 0 },
      isLoading: false,
      isError: false,
    };
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByText(/No scans in the last 30 days yet/i)).toBeInTheDocument();
  });

  it("Overview tab shows a loading hint while overview is loading", () => {
    overviewState = { data: undefined, isLoading: true, isError: false };
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByText(/Loading overview/i)).toBeInTheDocument();
  });

  it("Overview tab shows an error hint when overview errors", () => {
    overviewState = { data: undefined, isLoading: false, isError: true };
    render(<TrackerHubScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByText(/Failed to load overview/i)).toBeInTheDocument();
  });
});
