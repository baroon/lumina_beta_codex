import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DiscoverySummaryDto, WorkspacePromptRowDto, WorkspacePromptsDto } from "@/types/api";

let scopeState: { scope: "all" | string[] };
let promptsState: {
  data?: WorkspacePromptsDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};
let discoverySummaryState: {
  data?: DiscoverySummaryDto;
  isLoading: boolean;
  isError: boolean;
};

let updatePromptMutate: ReturnType<typeof vi.fn>;
let removePromptMutate: ReturnType<typeof vi.fn>;
const idleMutation = { isPending: false, isError: false, isSuccess: false };

vi.mock("@/hooks/useTrackerScope", () => ({
  useTrackerScope: () => scopeState,
}));
vi.mock("@/features/reports/hooks/useWorkspacePrompts", () => ({
  useWorkspacePrompts: () => ({ ...promptsState, refetch: vi.fn() }),
  useUpdateWorkspacePrompt: () => ({ mutate: updatePromptMutate, ...idleMutation }),
  useRemoveWorkspacePrompt: () => ({ mutate: removePromptMutate, ...idleMutation }),
}));
vi.mock("@/features/reports/hooks/useDiscoverySummary", () => ({
  useDiscoverySummary: () => discoverySummaryState,
}));
vi.mock("@/features/reports/hooks/useTopicCounts", () => ({
  useTopicCounts: () => ({ data: undefined, isLoading: false, isError: false }),
}));
vi.mock("@/features/reports/hooks/useProductCounts", () => ({
  useProductCounts: () => ({ data: undefined, isLoading: false, isError: false }),
}));
vi.mock("@/features/reports/hooks/useMarketCounts", () => ({
  useMarketCounts: () => ({ data: undefined, isLoading: false, isError: false }),
}));
vi.mock("@/features/reports/hooks/useAudienceCounts", () => ({
  useAudienceCounts: () => ({ data: undefined, isLoading: false, isError: false }),
}));
// Drawer hook is exercised in PromptAnswerHistoryDrawer.test.tsx; here we
// just verify the row click is plumbed correctly and the drawer mounts.
vi.mock("@/features/reports/hooks/usePromptAnswerHistory", () => ({
  usePromptAnswerHistory: () => ({ data: undefined, isLoading: false, isError: false }),
}));

// Stub the chart wrappers so we can render the screen without pulling
// Recharts' SVG machinery into jsdom. We just record what data was
// passed so the relevant tests can assert on it.
vi.mock("@/components/charts/DonutChartWrapper", () => ({
  DonutChartWrapper: ({ data }: { data: ReadonlyArray<{ label: string; value: number }> }) => (
    <div data-testid="donut">
      {data.map((d) => (
        <span key={d.label} data-label={d.label}>
          {d.label}:{d.value}
        </span>
      ))}
    </div>
  ),
}));
vi.mock("@/components/charts/BarChartWrapper", () => ({
  BarChartWrapper: ({ data }: { data: ReadonlyArray<{ label: string; value: number }> }) => (
    <div data-testid="histogram">
      {data.map((d) => (
        <span key={d.label}>
          {d.label}:{d.value}
        </span>
      ))}
    </div>
  ),
}));

import { PromptsScreen, filterRows, sortPrompts, deriveSummary } from "./PromptsScreen";

function row(overrides: Partial<WorkspacePromptRowDto>): WorkspacePromptRowDto {
  return {
    promptId: "p1",
    text: "Best resume builder?",
    lensId: "l1",
    lensName: "Discovery",
    topics: ["Resume builders"],
    products: [],
    audiences: [],
    markets: [],
    marketCountryCodes: [],
    trackerId: "t1",
    trackerName: "Acme · US",
    brandId: "b1",
    brandName: "Acme",
    scanCount: 3,
    lastScanAt: "2026-06-09T08:00:00Z",
    platformCodes: ["ChatGpt"],
    visibilityRate: 0.5,
    brandMentionCount: 4,
    dominantSentiment: "Positive",
    averageFirstMentionPosition: 0.35,
    ...overrides,
  };
}

function payload(rows: WorkspacePromptRowDto[]): WorkspacePromptsDto {
  return {
    workspaceId: "w1",
    from: "2026-05-09T00:00:00Z",
    to: "2026-06-09T00:00:00Z",
    prompts: rows,
  };
}

beforeEach(() => {
  scopeState = { scope: "all" };
  promptsState = { data: payload([]), isLoading: false, isError: false };
  discoverySummaryState = { data: undefined, isLoading: false, isError: false };
  updatePromptMutate = vi.fn();
  removePromptMutate = vi.fn();
});

describe("filterRows (pure)", () => {
  const rows = [
    row({ promptId: "a", text: "Best resume builder?", lensName: "Discovery", topics: ["Resume"] }),
    row({ promptId: "b", text: "How do I write a CV?", lensName: "Comparison", topics: ["CV"] }),
    row({
      promptId: "c",
      text: "Career sites compared",
      lensName: "Discovery",
      topics: ["Career"],
      brandName: "Beta",
    }),
  ];

  it("returns all rows when query is empty", () => {
    expect(filterRows(rows, "")).toHaveLength(3);
  });

  it("matches prompt text", () => {
    const result = filterRows(rows, "resume");
    expect(result.map((r) => r.promptId)).toEqual(["a"]);
  });

  it("matches lens name", () => {
    const result = filterRows(rows, "comparison");
    expect(result.map((r) => r.promptId)).toEqual(["b"]);
  });

  it("matches topic name (case-insensitive)", () => {
    const result = filterRows(rows, "CAREER");
    expect(result.map((r) => r.promptId)).toEqual(["c"]);
  });

  it("matches brand name", () => {
    const result = filterRows(rows, "beta");
    expect(result.map((r) => r.promptId)).toEqual(["c"]);
  });
});

describe("sortPrompts (pure)", () => {
  const rows = [
    row({ promptId: "a", visibilityRate: 0.4, brandMentionCount: 5, scanCount: 3 }),
    row({ promptId: "b", visibilityRate: 0.8, brandMentionCount: 12, scanCount: 1 }),
    row({ promptId: "c", visibilityRate: null, brandMentionCount: 0, scanCount: 2 }),
  ];

  it("returns rows unchanged when sortBy is default", () => {
    expect(sortPrompts(rows, "default", "desc").map((r) => r.promptId)).toEqual(["a", "b", "c"]);
  });

  it("sorts by visibility descending and pushes nulls to the bottom", () => {
    expect(sortPrompts(rows, "visibility", "desc").map((r) => r.promptId)).toEqual(["b", "a", "c"]);
  });

  it("sorts by visibility ascending and still pushes nulls to the bottom", () => {
    expect(sortPrompts(rows, "visibility", "asc").map((r) => r.promptId)).toEqual(["a", "b", "c"]);
  });

  it("sorts by mentions descending", () => {
    expect(sortPrompts(rows, "mentions", "desc").map((r) => r.promptId)).toEqual(["b", "a", "c"]);
  });
});

describe("deriveSummary (pure)", () => {
  it("returns null aggregates when the list is empty", () => {
    expect(deriveSummary([])).toEqual({
      withMentionsCount: 0,
      withMentionsPct: null,
      measuredCount: 0,
      avgVisibility: null,
      totalMentions: 0,
      avgMentions: null,
    });
  });

  it("rolls up the four KPIs from the row set", () => {
    const out = deriveSummary([
      row({ promptId: "a", visibilityRate: 0.4, brandMentionCount: 4 }),
      row({ promptId: "b", visibilityRate: 0.8, brandMentionCount: 10 }),
      row({ promptId: "c", visibilityRate: null, brandMentionCount: 0 }),
    ]);
    expect(out.withMentionsCount).toBe(2);
    expect(out.withMentionsPct).toBeCloseTo(2 / 3, 5);
    expect(out.measuredCount).toBe(2);
    expect(out.avgVisibility).toBeCloseTo(0.6, 5);
    expect(out.totalMentions).toBe(14);
    expect(out.avgMentions).toBeCloseTo(14 / 3, 5);
  });
});

describe("PromptsScreen", () => {
  it("renders the page header", () => {
    render(<PromptsScreen />);
    expect(screen.getByRole("heading", { name: /Prompts/i })).toBeInTheDocument();
  });

  it("renders the empty hint when there are no prompts in scope", () => {
    render(<PromptsScreen />);
    expect(screen.getByText(/no active prompts in scope yet/i)).toBeInTheDocument();
  });

  it("renders one row per prompt with lens, topics, tracker, and activity", () => {
    promptsState = {
      data: payload([
        row({
          promptId: "p1",
          text: "Best resume builder?",
          lensName: "Discovery",
          topics: ["Resume builders"],
          trackerName: "Acme · US",
          brandName: "Acme",
          scanCount: 3,
          platformCodes: ["ChatGpt"],
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    // One section → one table.
    const table = screen.getByRole("table");
    expect(within(table).getByText("Best resume builder?")).toBeInTheDocument();
    expect(within(table).getByText("Resume builders")).toBeInTheDocument();
    expect(within(table).getByText("Acme")).toBeInTheDocument();
    expect(within(table).getByText("Acme · US")).toBeInTheDocument();
    expect(within(table).getByText(/3 scans · ChatGpt/)).toBeInTheDocument();
  });

  it("renders analytical columns (visibility, sentiment, mentions)", () => {
    promptsState = {
      data: payload([
        row({
          promptId: "p1",
          visibilityRate: 0.75,
          brandMentionCount: 6,
          dominantSentiment: "Positive",
          averageFirstMentionPosition: 0.22,
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("75%")).toBeInTheDocument();
    expect(within(table).getByText("pos 0.22")).toBeInTheDocument();
    expect(within(table).getByText("Positive")).toBeInTheDocument();
    expect(within(table).getByText("6")).toBeInTheDocument();
  });

  it("renders em-dash fallbacks when analytical columns are null", () => {
    promptsState = {
      data: payload([
        row({
          promptId: "p1",
          visibilityRate: null,
          brandMentionCount: 0,
          dominantSentiment: null,
          averageFirstMentionPosition: null,
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    const table = screen.getByRole("table");
    // Visibility, sentiment, and mentions all collapse to "—" when the
    // prompt has no in-window answers.
    expect(within(table).getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("filters the table when the user types in the search input", async () => {
    promptsState = {
      data: payload([
        row({ promptId: "a", text: "Best resume builder?", scanCount: 3 }),
        row({ promptId: "b", text: "How do I write a CV?", scanCount: 1 }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    expect(screen.getByText("Best resume builder?")).toBeInTheDocument();
    expect(screen.getByText("How do I write a CV?")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/search prompts/i), "CV");
    expect(screen.queryByText("Best resume builder?")).not.toBeInTheDocument();
    expect(screen.getByText("How do I write a CV?")).toBeInTheDocument();
  });

  it("renders 'never' when a prompt has no last-scan timestamp", () => {
    promptsState = {
      data: payload([row({ lastScanAt: null, scanCount: 0 })]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    expect(screen.getByText("never")).toBeInTheDocument();
  });

  it("groups prompts by lens into separate section tables", () => {
    promptsState = {
      data: payload([
        row({ promptId: "a", text: "Discovery prompt", lensName: "Discovery" }),
        row({ promptId: "b", text: "Sentiment prompt", lensName: "Sentiment & Trust" }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    // Each section becomes its own table.
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(2);
    expect(within(tables[0]).getByText("Discovery prompt")).toBeInTheDocument();
    expect(within(tables[1]).getByText("Sentiment prompt")).toBeInTheDocument();
  });

  it("isolates a single lens section when its chip is clicked", async () => {
    promptsState = {
      data: payload([
        row({ promptId: "a", text: "Discovery prompt", lensName: "Discovery" }),
        row({ promptId: "b", text: "Sentiment prompt", lensName: "Sentiment & Trust" }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    await userEvent.click(screen.getByRole("button", { name: "Discovery" }));
    expect(screen.getByText("Discovery prompt")).toBeInTheDocument();
    expect(screen.queryByText("Sentiment prompt")).not.toBeInTheDocument();
  });

  it("keeps the section visible with an empty state when filters exclude all rows in that lens", async () => {
    // Discovery has two prompts (one Positive, one Negative). Sentiment
    // & Trust has one prompt with no measured sentiment. When the user
    // filters to "Positive", Discovery should still show its single
    // Positive row, but Sentiment & Trust should KEEP its section
    // header visible with an empty-state message — not silently drop
    // off the page (since unfiltered the lens has a prompt).
    promptsState = {
      data: payload([
        row({
          promptId: "a",
          text: "Positive discovery prompt",
          lensName: "Discovery",
          dominantSentiment: "Positive",
        }),
        row({
          promptId: "b",
          text: "Negative discovery prompt",
          lensName: "Discovery",
          dominantSentiment: "Negative",
        }),
        row({
          promptId: "c",
          text: "Neutral sentiment prompt",
          lensName: "Sentiment & Trust",
          dominantSentiment: "Neutral",
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    // Open the filters popover and click the Positive sentiment chip.
    await userEvent.click(screen.getByRole("button", { name: /^Filters$/i }));
    await userEvent.click(screen.getByRole("button", { name: /Filter by Positive/i }));

    // Discovery section keeps the row that matches.
    expect(screen.getByText("Positive discovery prompt")).toBeInTheDocument();
    expect(screen.queryByText("Negative discovery prompt")).not.toBeInTheDocument();

    // Sentiment & Trust section stays visible with an empty-state
    // message; its prompt is hidden by the filter. Use the section
    // heading element specifically (the donut-legend mock also
    // surfaces the lens name as plain text).
    expect(screen.queryByText("Neutral sentiment prompt")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sentiment & Trust" })).toBeInTheDocument();
    expect(screen.getByText(/no prompts.*match.*current filters/i)).toBeInTheDocument();
  });

  it("still drops sections that have zero in-scope prompts even before any filter is applied", () => {
    // Only Discovery has any prompts — Sentiment & Trust has none in
    // scope. No filter is active, so Sentiment & Trust should NOT
    // appear at all (no header, no empty-state — the lens just has
    // nothing here yet).
    promptsState = {
      data: payload([row({ promptId: "a", text: "Discovery only", lensName: "Discovery" })]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    expect(screen.getByText("Discovery only")).toBeInTheDocument();
    expect(screen.queryByText(/Sentiment & Trust/)).not.toBeInTheDocument();
    expect(screen.queryByText(/no prompts.*match/i)).not.toBeInTheDocument();
  });

  it("renders flag images in the Country column for valid alpha-2 codes", () => {
    promptsState = {
      data: payload([
        row({
          promptId: "a",
          text: "Multi-country prompt",
          marketCountryCodes: ["US", "GB"],
        }),
        row({
          promptId: "b",
          text: "Country-less prompt",
          marketCountryCodes: [],
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    // Multi-country row: one img per code, with the uppercased code as alt.
    expect(screen.getByRole("img", { name: "US" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "GB" })).toBeInTheDocument();
    // Country-less row: the cell falls through to the em-dash placeholder.
    const table = screen.getByRole("table");
    expect(within(table).getAllByText("—").length).toBeGreaterThanOrEqual(1);
  });

  it("renders an info-tooltip icon on every summary tile and chart card", () => {
    promptsState = {
      data: payload([row({ promptId: "a", text: "Prompt 1", visibilityRate: 0.5 })]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    // 4 summary-tile labels.
    expect(screen.getByRole("button", { name: "About Prompts in view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About % with mentions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About Avg visibility" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About Avg mentions / prompt" })).toBeInTheDocument();
    // 2 chart-card titles.
    expect(screen.getByRole("button", { name: "About Prompts by lens" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "About Visibility distribution" }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------
  // Models (platform) filter — inside the FiltersPopover
  // -------------------------------------------------------------------

  it("filters the table when a Models chip is selected, and clears with 'Clear all'", async () => {
    promptsState = {
      data: payload([
        row({ promptId: "a", text: "ChatGPT-only prompt", platformCodes: ["ChatGpt"] }),
        row({ promptId: "b", text: "Gemini-only prompt", platformCodes: ["Gemini"] }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    // Both visible by default — no models filter applied.
    expect(screen.getByText("ChatGPT-only prompt")).toBeInTheDocument();
    expect(screen.getByText("Gemini-only prompt")).toBeInTheDocument();

    // Open the FiltersPopover and pick "ChatGPT" from the Models row.
    await userEvent.click(screen.getByRole("button", { name: /^Filters$/i }));
    await userEvent.click(screen.getByRole("button", { name: /Filter by ChatGPT/i }));

    expect(screen.getByText("ChatGPT-only prompt")).toBeInTheDocument();
    expect(screen.queryByText("Gemini-only prompt")).not.toBeInTheDocument();

    // The "Clear all" link in the popover header should reset.
    await userEvent.click(screen.getByRole("button", { name: /Clear all/i }));
    expect(screen.getByText("ChatGPT-only prompt")).toBeInTheDocument();
    expect(screen.getByText("Gemini-only prompt")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------
  // Sentiment filter — inline chip strip in the FiltersPopover, mirrors
  // the Models filter shape but keyed off the row's dominantSentiment.
  // -------------------------------------------------------------------

  it("filters the table when a Sentiment chip is selected, and clears with 'Clear all'", async () => {
    promptsState = {
      data: payload([
        row({ promptId: "a", text: "Positive prompt", dominantSentiment: "Positive" }),
        row({ promptId: "b", text: "Negative prompt", dominantSentiment: "Negative" }),
        row({ promptId: "c", text: "Unmeasured prompt", dominantSentiment: null }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    expect(screen.getByText("Positive prompt")).toBeInTheDocument();
    expect(screen.getByText("Negative prompt")).toBeInTheDocument();
    expect(screen.getByText("Unmeasured prompt")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^Filters$/i }));
    await userEvent.click(screen.getByRole("button", { name: /Filter by Positive/i }));

    expect(screen.getByText("Positive prompt")).toBeInTheDocument();
    expect(screen.queryByText("Negative prompt")).not.toBeInTheDocument();
    // Prompts with no measured sentiment are filtered out when a sentiment
    // filter is active — they don't claim a sentiment to match against.
    expect(screen.queryByText("Unmeasured prompt")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Clear all/i }));
    expect(screen.getByText("Positive prompt")).toBeInTheDocument();
    expect(screen.getByText("Negative prompt")).toBeInTheDocument();
    expect(screen.getByText("Unmeasured prompt")).toBeInTheDocument();
  });

  it("inline chip filters accumulate multi-selection and never unselect on a second click", async () => {
    promptsState = {
      data: payload([
        row({ promptId: "a", text: "ChatGPT prompt", platformCodes: ["ChatGpt"] }),
        row({ promptId: "b", text: "Gemini prompt", platformCodes: ["Gemini"] }),
        row({ promptId: "c", text: "Claude prompt", platformCodes: ["Claude"] }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    await userEvent.click(screen.getByRole("button", { name: /^Filters$/i }));

    // First click narrows: pick ChatGPT → only ChatGPT row visible.
    await userEvent.click(screen.getByRole("button", { name: /Filter by ChatGPT/i }));
    expect(screen.getByText("ChatGPT prompt")).toBeInTheDocument();
    expect(screen.queryByText("Gemini prompt")).not.toBeInTheDocument();
    expect(screen.queryByText("Claude prompt")).not.toBeInTheDocument();

    // Second click ADDS to the selection (multi-select), it does NOT
    // replace. Both ChatGPT and Gemini rows should now be visible.
    await userEvent.click(screen.getByRole("button", { name: /Filter by Gemini/i }));
    expect(screen.getByText("ChatGPT prompt")).toBeInTheDocument();
    expect(screen.getByText("Gemini prompt")).toBeInTheDocument();
    expect(screen.queryByText("Claude prompt")).not.toBeInTheDocument();

    // Clicking an already-selected chip is a no-op (don't-unselect rule).
    await userEvent.click(screen.getByRole("button", { name: /Filter by ChatGPT/i }));
    expect(screen.getByText("ChatGPT prompt")).toBeInTheDocument();
    expect(screen.getByText("Gemini prompt")).toBeInTheDocument();
    expect(screen.queryByText("Claude prompt")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------
  // Markets filter — proxies for Products / Audiences too since all three
  // share the same intersection + selector wiring. Exercises the full
  // path: discoverySummary → MarketSelector → row filter.
  // -------------------------------------------------------------------

  it("filters the table when a Market is selected from the FiltersPopover", async () => {
    discoverySummaryState = {
      data: {
        products: [],
        markets: [
          {
            brandId: "b1",
            brandName: "Acme",
            items: [
              { id: "m1", name: "United States" },
              { id: "m2", name: "United Kingdom" },
            ],
          },
        ],
        audiences: [],
        topics: [],
        trustSignals: [],
      },
      isLoading: false,
      isError: false,
    };
    promptsState = {
      data: payload([
        row({ promptId: "a", text: "US prompt", markets: ["United States"] }),
        row({ promptId: "b", text: "UK prompt", markets: ["United Kingdom"] }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    expect(screen.getByText("US prompt")).toBeInTheDocument();
    expect(screen.getByText("UK prompt")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^Filters$/i }));
    // Open the Market selector dropdown. The selector's UX is opt-OUT:
    // empty selection means "all markets" and every checkbox is checked
    // by default. Unchecking the UK row therefore leaves the selection
    // = ["United States"], which is what we want.
    await userEvent.click(screen.getByRole("button", { name: /Market selector/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: "United Kingdom" }));

    expect(screen.getByText("US prompt")).toBeInTheDocument();
    expect(screen.queryByText("UK prompt")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------
  // Inline edit + remove on each row
  // -------------------------------------------------------------------

  it("clicking the prompt text + editing + blurring fires update with the row's trackerId", async () => {
    promptsState = {
      data: payload([row({ promptId: "p1", trackerId: "t1", text: "Best resume builder?" })]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    await userEvent.click(screen.getByRole("button", { name: /^Best resume builder\?$/ }));
    const input = screen.getByDisplayValue("Best resume builder?") as HTMLTextAreaElement;
    await userEvent.clear(input);
    await userEvent.type(input, "Top resume builder of 2026?");
    input.blur();
    expect(updatePromptMutate).toHaveBeenCalledOnce();
    expect(updatePromptMutate.mock.calls[0][0]).toEqual({
      trackerId: "t1",
      promptId: "p1",
      text: "Top resume builder of 2026?",
    });
  });

  // -------------------------------------------------------------------
  // Row-click answer-history drawer
  // -------------------------------------------------------------------

  it("clicking a non-interactive cell on a row opens the answer-history drawer", async () => {
    promptsState = {
      data: payload([row({ promptId: "p1", text: "Best resume builder?" })]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    // Drawer is not open initially — its title isn't rendered yet.
    expect(screen.queryByText("Answer history")).not.toBeInTheDocument();
    // Click on the Tracker cell (a static, non-interactive cell on the row).
    await userEvent.click(screen.getByText("Acme · US"));
    // Drawer mounted (the hook returns no data, so the loading skeleton or
    // the no-data state shows — either way the drawer Title is in the DOM).
    expect(screen.getByText("Answer history")).toBeInTheDocument();
  });

  it("clicking the X removes the row without also opening the drawer", async () => {
    promptsState = {
      data: payload([row({ promptId: "p1", trackerId: "t1", text: "Best resume builder?" })]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    await userEvent.click(
      screen.getByRole("button", { name: /Remove prompt Best resume builder/i }),
    );
    expect(removePromptMutate).toHaveBeenCalledWith({ trackerId: "t1", promptId: "p1" });
    // The remove cell stops propagation so the row's drawer-open handler
    // does not also fire — keep this assertion to guard the regression.
    expect(screen.queryByText("Answer history")).not.toBeInTheDocument();
  });
});
