import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorkspacePromptRowDto, WorkspacePromptsDto } from "@/types/api";

let scopeState: { scope: "all" | string[] };
let promptsState: {
  data?: WorkspacePromptsDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};

vi.mock("@/hooks/useTrackerScope", () => ({
  useTrackerScope: () => scopeState,
}));
vi.mock("@/features/reports/hooks/useWorkspacePrompts", () => ({
  useWorkspacePrompts: () => ({ ...promptsState, refetch: vi.fn() }),
}));

import { PromptsScreen, filterRows } from "./PromptsScreen";

function row(overrides: Partial<WorkspacePromptRowDto>): WorkspacePromptRowDto {
  return {
    promptId: "p1",
    text: "Best resume builder?",
    lensId: "l1",
    lensName: "Discovery",
    topics: ["Resume builders"],
    trackerId: "t1",
    trackerName: "Acme · US",
    brandId: "b1",
    brandName: "Acme",
    scanCount: 3,
    lastScanAt: "2026-06-09T08:00:00Z",
    platformCodes: ["openai"],
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

describe("PromptsScreen", () => {
  it("renders the page header", () => {
    render(<PromptsScreen />);
    expect(screen.getByRole("heading", { name: /Prompts/i })).toBeInTheDocument();
  });

  it("renders the empty hint when there are no prompts in scope", () => {
    render(<PromptsScreen />);
    expect(screen.getByText(/no active prompts in scope yet/i)).toBeInTheDocument();
  });

  it("renders one row per prompt with lens, topics, tracker, and last-scan", () => {
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
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptsScreen />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Best resume builder?")).toBeInTheDocument();
    expect(within(table).getByText("Discovery")).toBeInTheDocument();
    expect(within(table).getByText("Resume builders")).toBeInTheDocument();
    expect(within(table).getByText("Acme")).toBeInTheDocument();
    expect(within(table).getByText("Acme · US")).toBeInTheDocument();
    expect(within(table).getByText("3")).toBeInTheDocument();
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

    await userEvent.type(screen.getByPlaceholderText(/filter by prompt/i), "CV");
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
});
