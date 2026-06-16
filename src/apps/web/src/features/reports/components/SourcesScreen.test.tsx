import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type {
  WorkspaceDomainRowDto,
  WorkspaceDomainsDto,
  WorkspaceUrlRowDto,
  WorkspaceUrlsDto,
} from "@/types/api";

// Radix Select polyfill — the classifying-brand picker uses Radix's
// Select, which calls hasPointerCapture during click handling. jsdom
// doesn't ship that method.
beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

let scopeState: { scope: "all" | string[] };
let domainsState: { data?: WorkspaceDomainsDto; isLoading: boolean; isError: boolean };
let urlsState: { data?: WorkspaceUrlsDto; isLoading: boolean; isError: boolean };

vi.mock("@/hooks/useTrackerScope", () => ({
  useTrackerScope: () => scopeState,
}));
vi.mock("@/features/reports/hooks/useWorkspaceDomains", () => ({
  useWorkspaceDomains: () => ({ ...domainsState, refetch: vi.fn() }),
}));
vi.mock("@/features/reports/hooks/useWorkspaceUrls", () => ({
  useWorkspaceUrls: () => ({ ...urlsState, refetch: vi.fn() }),
}));
vi.mock("@/features/reports/hooks/useDiscoverySummary", () => ({
  useDiscoverySummary: () => ({ data: undefined, isLoading: false, isError: false }),
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
vi.mock("@/features/reports/hooks/useSourceTypes", () => ({
  useSourceTypes: () => ({ data: [], isLoading: false, isError: false }),
}));
vi.mock("@/features/reports/hooks/useUpdateWorkspaceSourceClassification", () => ({
  useWorkspaceBrandsForClassification: () => ({ data: [], isLoading: false, isError: false }),
  useUpdateWorkspaceSourceClassification: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
  }),
}));

import { SourcesScreen, countByType, deriveHero, filterActive } from "./SourcesScreen";

function domain(overrides: Partial<WorkspaceDomainRowDto>): WorkspaceDomainRowDto {
  return {
    sourceId: "s1",
    sourceName: "Sample",
    normalizedDomain: "sample.com",
    sourceType: "Editorial",
    authorityScore: 50,
    citationCount: 0,
    retrievedInScans: 0,
    lastSeenAt: null,
    ...overrides,
  };
}

function url(overrides: Partial<WorkspaceUrlRowDto>): WorkspaceUrlRowDto {
  return {
    sourceUrlId: "u1",
    url: "https://sample.com/a",
    normalizedUrl: "sample.com/a",
    title: "Sample page",
    sourceId: "s1",
    sourceName: "Sample",
    normalizedDomain: "sample.com",
    sourceType: "Editorial",
    citationCount: 0,
    retrievedInScans: 0,
    lastSeenAt: null,
    ...overrides,
  };
}

function domainsPayload(rows: WorkspaceDomainRowDto[]): WorkspaceDomainsDto {
  return {
    workspaceId: "w1",
    from: "2026-05-09T00:00:00Z",
    to: "2026-06-09T00:00:00Z",
    domains: rows,
  };
}

function urlsPayload(rows: WorkspaceUrlRowDto[]): WorkspaceUrlsDto {
  return {
    workspaceId: "w1",
    from: "2026-05-09T00:00:00Z",
    to: "2026-06-09T00:00:00Z",
    urls: rows,
  };
}

beforeEach(() => {
  scopeState = { scope: "all" };
  domainsState = { data: domainsPayload([]), isLoading: false, isError: false };
  urlsState = { data: urlsPayload([]), isLoading: false, isError: false };
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

describe("deriveHero (pure)", () => {
  it("returns zero aggregates when no domains have any citations", () => {
    expect(deriveHero([], [])).toEqual({
      totalCitations: 0,
      uniqueDomains: 0,
      uniqueUrls: 0,
      topType: null,
    });
  });

  it("rolls up totals + picks the source type with the largest citation share", () => {
    const summary = deriveHero(
      [
        domain({ sourceId: "a", sourceType: "Editorial", citationCount: 10 }),
        domain({ sourceId: "b", sourceType: "Editorial", citationCount: 6 }),
        domain({ sourceId: "c", sourceType: "Forum", citationCount: 4 }),
      ],
      [url({ sourceUrlId: "u1" }), url({ sourceUrlId: "u2" })],
    );
    expect(summary.totalCitations).toBe(20);
    expect(summary.uniqueDomains).toBe(3);
    expect(summary.uniqueUrls).toBe(2);
    expect(summary.topType).toEqual({ type: "Editorial", share: 16 / 20 });
  });
});

describe("filterActive + countByType (pure)", () => {
  const domainRows: WorkspaceDomainRowDto[] = [
    domain({ sourceId: "a", sourceName: "Acme Editorial", sourceType: "Editorial" }),
    domain({ sourceId: "b", sourceName: "Reddit", sourceType: "UGC" }),
  ];
  const urlRows: WorkspaceUrlRowDto[] = [
    url({
      sourceUrlId: "u1",
      url: "https://example.com/a",
      title: "Page A",
      sourceType: "Editorial",
    }),
    url({ sourceUrlId: "u2", url: "https://reddit.com/r/x", title: "Thread", sourceType: "UGC" }),
  ];

  it("counts types across the active view", () => {
    expect(countByType({ kind: "domain", allRows: domainRows })).toEqual({
      Editorial: 1,
      UGC: 1,
    });
    expect(countByType({ kind: "url", allRows: urlRows })).toEqual({
      Editorial: 1,
      UGC: 1,
    });
  });

  it("filters domains by query OR domain text + type filter", () => {
    expect(
      filterActive({ kind: "domain", allRows: domainRows }, "acme", null).map((r) => r.sourceId),
    ).toEqual(["a"]);
    expect(
      filterActive({ kind: "domain", allRows: domainRows }, "", "UGC").map((r) => r.sourceId),
    ).toEqual(["b"]);
  });

  it("filters URLs by URL / title / domain text + type filter", () => {
    expect(
      filterActive({ kind: "url", allRows: urlRows }, "reddit", null).map(
        (r) => (r as WorkspaceUrlRowDto).sourceUrlId,
      ),
    ).toEqual(["u2"]);
    expect(
      filterActive({ kind: "url", allRows: urlRows }, "", "Editorial").map(
        (r) => (r as WorkspaceUrlRowDto).sourceUrlId,
      ),
    ).toEqual(["u1"]);
  });
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

describe("SourcesScreen", () => {
  it("renders the title-only PageHeader", () => {
    render(<SourcesScreen />);
    expect(screen.getByRole("heading", { name: /Sources/i })).toBeInTheDocument();
  });

  it("shows the no-data hint when both domains and urls are empty", () => {
    render(<SourcesScreen />);
    expect(screen.getByText(/no cited sources in scope yet/i)).toBeInTheDocument();
  });

  it("renders the Hero + Domains table by default", () => {
    domainsState = {
      data: domainsPayload([
        domain({ sourceId: "a", sourceName: "Trustpilot", citationCount: 5 }),
        domain({ sourceId: "b", sourceName: "Reddit", sourceType: "UGC", citationCount: 3 }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<SourcesScreen />);
    // Hero tile labels via tooltip buttons (the same affordance used on
    // /competitors).
    expect(screen.getByRole("button", { name: "About Citations" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About Domains" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About URLs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "About Top type" })).toBeInTheDocument();

    // Default view = Domains. Both rows surface in the active table.
    const table = screen.getByRole("table");
    expect(within(table).getByText("Trustpilot")).toBeInTheDocument();
    expect(within(table).getByText("Reddit")).toBeInTheDocument();
  });

  it("flips to the URLs table when the view toggle is clicked", async () => {
    domainsState = {
      data: domainsPayload([domain({ sourceId: "a", sourceName: "Trustpilot" })]),
      isLoading: false,
      isError: false,
    };
    urlsState = {
      data: urlsPayload([
        url({ sourceUrlId: "u1", title: "Trustpilot article", url: "https://trustpilot.com/x" }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<SourcesScreen />);
    expect(screen.getByText("Trustpilot")).toBeInTheDocument();
    expect(screen.queryByText("Trustpilot article")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^URLs$/i }));

    // After flip, the URLs table is the active body.
    expect(screen.getByText("Trustpilot article")).toBeInTheDocument();
  });

  it("renders the canonical controls strip (view toggle + calendar + Filters)", () => {
    domainsState = {
      data: domainsPayload([domain({ sourceId: "a", sourceName: "Acme" })]),
      isLoading: false,
      isError: false,
    };
    render(<SourcesScreen />);
    // View toggle is a 2-button segmented group.
    expect(screen.getByRole("button", { name: /^Domains$/i, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^URLs$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /date range picker/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Filters$/i })).toBeInTheDocument();
  });

  it("filters the Domains table by the search input", async () => {
    domainsState = {
      data: domainsPayload([
        domain({ sourceId: "a", sourceName: "Acme" }),
        domain({ sourceId: "b", sourceName: "Reddit" }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<SourcesScreen />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Reddit")).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(/filter by source name/i), "red");
    expect(screen.queryByText("Acme")).not.toBeInTheDocument();
    expect(screen.getByText("Reddit")).toBeInTheDocument();
  });
});
