import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorkspaceDomainRowDto, WorkspaceDomainsDto } from "@/types/api";

let scopeState: { scope: "all" | string[] };
let domainsState: {
  data?: WorkspaceDomainsDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};

vi.mock("@/hooks/useTrackerScope", () => ({
  useTrackerScope: () => scopeState,
}));
vi.mock("@/features/reports/hooks/useWorkspaceDomains", () => ({
  useWorkspaceDomains: () => ({ ...domainsState, refetch: vi.fn() }),
}));

import { DomainsScreen, countByType, filterDomains } from "./DomainsScreen";

function row(overrides: Partial<WorkspaceDomainRowDto>): WorkspaceDomainRowDto {
  return {
    sourceId: "s1",
    sourceName: "Trustpilot",
    normalizedDomain: "trustpilot.com",
    sourceType: "Editorial",
    authorityScore: 70,
    citationCount: 12,
    retrievedInScans: 4,
    lastSeenAt: "2026-06-09T08:00:00Z",
    ...overrides,
  };
}

function payload(rows: WorkspaceDomainRowDto[]): WorkspaceDomainsDto {
  return {
    workspaceId: "w1",
    from: "2026-05-09T00:00:00Z",
    to: "2026-06-09T00:00:00Z",
    domains: rows,
  };
}

beforeEach(() => {
  scopeState = { scope: "all" };
  domainsState = { data: payload([]), isLoading: false, isError: false };
});

describe("filterDomains (pure)", () => {
  const rows = [
    row({ sourceId: "a", sourceName: "Reddit", normalizedDomain: "reddit.com", sourceType: "UGC" }),
    row({
      sourceId: "b",
      sourceName: "TechCrunch",
      normalizedDomain: "techcrunch.com",
      sourceType: "Editorial",
    }),
    row({
      sourceId: "c",
      sourceName: "Competitor One",
      normalizedDomain: "rival.example",
      sourceType: "Competitor",
    }),
  ];

  it("returns everything with empty query + no type filter", () => {
    expect(filterDomains(rows, "", null)).toHaveLength(3);
  });

  it("filters by source name (case-insensitive)", () => {
    expect(filterDomains(rows, "REDDIT", null).map((r) => r.sourceId)).toEqual(["a"]);
  });

  it("filters by normalized domain", () => {
    expect(filterDomains(rows, "techcrunch", null).map((r) => r.sourceId)).toEqual(["b"]);
  });

  it("filters by type", () => {
    expect(filterDomains(rows, "", "Editorial").map((r) => r.sourceId)).toEqual(["b"]);
  });

  it("combines query + type filter", () => {
    expect(filterDomains(rows, "rival", "Competitor").map((r) => r.sourceId)).toEqual(["c"]);
    expect(filterDomains(rows, "rival", "Editorial")).toHaveLength(0);
  });
});

describe("countByType (pure)", () => {
  it("counts rows by sourceType", () => {
    const counts = countByType([
      row({ sourceId: "a", sourceType: "Editorial" }),
      row({ sourceId: "b", sourceType: "Editorial" }),
      row({ sourceId: "c", sourceType: "UGC" }),
    ]);
    expect(counts).toEqual({ Editorial: 2, UGC: 1 });
  });
});

describe("DomainsScreen", () => {
  it("renders the page header", () => {
    render(<DomainsScreen />);
    expect(screen.getByRole("heading", { name: /Source domains/i })).toBeInTheDocument();
  });

  it("renders the empty hint when there are no sources in scope", () => {
    render(<DomainsScreen />);
    expect(screen.getByText(/no cited sources in scope yet/i)).toBeInTheDocument();
  });

  it("renders one row per source with type badge + citation/scan/authority counts", () => {
    domainsState = {
      data: payload([
        row({
          sourceId: "trust",
          sourceName: "Trustpilot",
          normalizedDomain: "trustpilot.com",
          sourceType: "Editorial",
          authorityScore: 78,
          citationCount: 9,
          retrievedInScans: 3,
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<DomainsScreen />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Trustpilot")).toBeInTheDocument();
    expect(within(table).getByText("trustpilot.com")).toBeInTheDocument();
    expect(within(table).getByText("Editorial")).toBeInTheDocument();
    expect(within(table).getByText("9")).toBeInTheDocument();
    expect(within(table).getByText("3")).toBeInTheDocument();
    expect(within(table).getByText("78")).toBeInTheDocument();
  });

  it("filters the table when the user types in the search input", async () => {
    domainsState = {
      data: payload([
        row({ sourceId: "reddit", sourceName: "Reddit", normalizedDomain: "reddit.com" }),
        row({ sourceId: "indeed", sourceName: "Indeed", normalizedDomain: "indeed.com" }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<DomainsScreen />);
    expect(screen.getByText("Reddit")).toBeInTheDocument();
    expect(screen.getByText("Indeed")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/filter by source name/i), "reddit");
    expect(screen.getByText("Reddit")).toBeInTheDocument();
    expect(screen.queryByText("Indeed")).not.toBeInTheDocument();
  });

  it("clicking a type pill filters the table and toggles off on second click", async () => {
    domainsState = {
      data: payload([
        row({ sourceId: "a", sourceName: "Reddit", sourceType: "UGC" }),
        row({ sourceId: "b", sourceName: "TechCrunch", sourceType: "Editorial" }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<DomainsScreen />);
    // Pill chip carries both label + count, so we look up the toggle button by accessible name.
    const editorialPill = screen.getByRole("button", { name: /Editorial 1/i });
    await userEvent.click(editorialPill);
    expect(screen.getByText("TechCrunch")).toBeInTheDocument();
    expect(screen.queryByText("Reddit")).not.toBeInTheDocument();

    // Click again → filter clears.
    await userEvent.click(editorialPill);
    expect(screen.getByText("Reddit")).toBeInTheDocument();
    expect(screen.getByText("TechCrunch")).toBeInTheDocument();
  });
});
