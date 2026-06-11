import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  PromptList,
  TrackerLensesSetupDto,
  TrackerListItemDto,
  TrackerScheduleSetup,
} from "@/types/api";

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
}));

let summaryState: {
  tracker?: TrackerListItemDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};
let scheduleSetupState: { data?: TrackerScheduleSetup; isLoading: boolean };
let promptsState: { data?: PromptList };
let configureMutate: ReturnType<typeof vi.fn>;
let configureState = { isPending: false, isError: false, isSuccess: false };
let lensesSetupState: {
  data?: TrackerLensesSetupDto;
  isLoading: boolean;
  isError: boolean;
};
let updateLensesMutate: ReturnType<typeof vi.fn>;
let updateLensesState = { isPending: false, isError: false, isSuccess: false };

vi.mock("@/features/trackers/hooks/useAllTrackers", () => ({
  useAllTrackers: () => ({ data: [] }),
  useTrackerSummary: () => summaryState,
}));
vi.mock("@/features/trackers/hooks/useTrackerSchedule", () => ({
  useTrackerScheduleSetup: () => scheduleSetupState,
  useConfigureTrackerSchedule: () => ({ mutate: configureMutate, ...configureState }),
}));
vi.mock("@/features/trackers/hooks/usePrompts", () => ({
  usePrompts: () => promptsState,
}));
vi.mock("@/features/trackers/hooks/useTrackerLenses", () => ({
  useTrackerLensesSetup: () => lensesSetupState,
  useUpdateTrackerLenses: () => ({ mutate: updateLensesMutate, ...updateLensesState }),
}));

import { TrackerEditScreen } from "./TrackerEditScreen";

const trackerFixture: TrackerListItemDto = {
  trackerId: "t1",
  name: "Acme · US Tracker",
  brandId: "b1",
  brandName: "Acme",
  status: "Active",
  createdAt: "2026-06-01T00:00:00Z",
  scanCount: 0,
  latestScanCompletedAt: null,
};

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
  selectedPlatformIds: ["p1"],
};

const promptsFixture: PromptList = {
  promptAllocation: 50,
  count: 12,
  brandName: "Acme",
  trackerName: "Acme · US Tracker",
  prompts: [],
  checks: [],
  topics: [],
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

beforeEach(() => {
  summaryState = { tracker: trackerFixture, isLoading: false, isError: false };
  scheduleSetupState = { data: scheduleFixture, isLoading: false };
  promptsState = { data: promptsFixture };
  configureMutate = vi.fn();
  configureState = { isPending: false, isError: false, isSuccess: false };
  lensesSetupState = { data: lensesFixture, isLoading: false, isError: false };
  updateLensesMutate = vi.fn();
  updateLensesState = { isPending: false, isError: false, isSuccess: false };
});

describe("TrackerEditScreen", () => {
  it("renders the page header with the tracker name", () => {
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByRole("heading", { name: /Edit Acme · US Tracker/i })).toBeInTheDocument();
  });

  it("renders a breadcrumb with Brands › Brand › Tracker › Edit", () => {
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(within(nav).getByText("Brands")).toBeInTheDocument();
    expect(within(nav).getByText("Acme")).toBeInTheDocument();
    expect(within(nav).getByText("Acme · US Tracker")).toBeInTheDocument();
    expect(within(nav).getByText("Edit")).toBeInTheDocument();
  });

  it("renders one checkbox per platform with the configured ones checked", () => {
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByRole("checkbox", { name: "ChatGPT" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Perplexity" })).not.toBeChecked();
  });

  it("save bar appears only after the form is dirty", async () => {
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    // No save bar before edits.
    expect(screen.queryByRole("region", { name: /unsaved changes/i })).not.toBeInTheDocument();
    // Toggle Perplexity → dirty.
    await userEvent.click(screen.getByRole("checkbox", { name: "Perplexity" }));
    expect(screen.getByRole("region", { name: /unsaved changes/i })).toBeInTheDocument();
  });

  it("clicking Save calls configure with the edited platform set", async () => {
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Perplexity" }));
    await userEvent.click(screen.getByRole("button", { name: /Save changes/i }));
    expect(configureMutate).toHaveBeenCalledOnce();
    const [args] = configureMutate.mock.calls[0];
    expect(new Set(args.platformIds)).toEqual(new Set(["p1", "p2"]));
    expect(args.cadence).toBe("Daily");
    expect(args.timezone).toBe("UTC");
  });

  it("clicking Discard reverts edits and hides the save bar", async () => {
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Perplexity" }));
    expect(screen.getByRole("region", { name: /unsaved changes/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Discard/i }));
    expect(screen.queryByRole("region", { name: /unsaved changes/i })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Perplexity" })).not.toBeChecked();
  });

  it("Prompts section renders the count from the prompts hook", () => {
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByText(/12 active prompt/i)).toBeInTheDocument();
  });

  it("renders 'Tracker not found.' when the summary returns no tracker", () => {
    summaryState = { tracker: undefined, isLoading: false, isError: false };
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByText(/tracker not found/i)).toBeInTheDocument();
  });

  it("save bar shows 'Saving…' while configure is pending", async () => {
    configureState = { isPending: true, isError: false, isSuccess: false };
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Perplexity" }));
    expect(screen.getByRole("button", { name: /Saving…/i })).toBeDisabled();
  });

  // ---------------------------------------------------------------------
  // Lenses section — picker backed by useTrackerLensesSetup + update
  // ---------------------------------------------------------------------

  it("renders one checkbox per lens with the tracker's current selection pre-checked", () => {
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByRole("checkbox", { name: "Category Discovery" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Comparison" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Problem Resolution" })).not.toBeChecked();
  });

  it("Save lenses button is disabled until the lens selection is dirty", () => {
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByRole("button", { name: /Save lenses/i })).toBeDisabled();
  });

  it("clicking Save lenses calls update with the new lens set", async () => {
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Problem Resolution" }));
    await userEvent.click(screen.getByRole("button", { name: /Save lenses/i }));
    expect(updateLensesMutate).toHaveBeenCalledOnce();
    const [args] = updateLensesMutate.mock.calls[0];
    expect(new Set(args.lensIds)).toEqual(new Set(["l1", "l2", "l3"]));
  });

  it("Save lenses stays disabled and shows an error hint when no lens is selected", async () => {
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    // Uncheck both pre-selected lenses.
    await userEvent.click(screen.getByRole("checkbox", { name: "Category Discovery" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Comparison" }));
    expect(screen.getByRole("button", { name: /Save lenses/i })).toBeDisabled();
    expect(screen.getByText(/select at least one lens/i)).toBeInTheDocument();
  });

  it("Discard reverts lens edits back to the server selection", async () => {
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Problem Resolution" }));
    expect(screen.getByRole("checkbox", { name: "Problem Resolution" })).toBeChecked();
    // Only the lens section is dirty, so a single Discard button is in
    // the document (the schedule sticky save bar isn't rendered).
    await userEvent.click(screen.getByRole("button", { name: /Discard/i }));
    expect(screen.getByRole("checkbox", { name: "Problem Resolution" })).not.toBeChecked();
  });

  it("shows a loading hint while lens setup is loading", () => {
    lensesSetupState = { data: undefined, isLoading: true, isError: false };
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByText(/Loading lenses/i)).toBeInTheDocument();
  });

  it("shows an error hint when lens setup errors", () => {
    lensesSetupState = { data: undefined, isLoading: false, isError: true };
    render(<TrackerEditScreen brandId="b1" trackerId="t1" />);
    expect(screen.getByText(/Could not load lens setup/i)).toBeInTheDocument();
  });
});
