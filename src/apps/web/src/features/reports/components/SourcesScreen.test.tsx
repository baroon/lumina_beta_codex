import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type {
  EntityTrendSeriesDto,
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
let overviewSeries: EntityTrendSeriesDto[];
let brandsForClassification: { id: string; name: string }[];

vi.mock("@/hooks/useTrackerScope", () => ({
  useTrackerScope: () => scopeState,
}));
vi.mock("@/features/reports/hooks/useWorkspaceDomains", () => ({
  useWorkspaceDomains: () => ({ ...domainsState, refetch: vi.fn() }),
}));
vi.mock("@/features/reports/hooks/useWorkspaceUrls", () => ({
  useWorkspaceUrls: () => ({ ...urlsState, refetch: vi.fn() }),
}));
vi.mock("@/features/reports/hooks/useWorkspaceOverview", () => ({
  useWorkspaceOverview: () => ({
    data: { series: overviewSeries },
    isLoading: false,
    isError: false,
  }),
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
  useWorkspaceBrandsForClassification: () => ({
    data: brandsForClassification,
    isLoading: false,
    isError: false,
  }),
  useUpdateWorkspaceSourceClassification: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
  }),
}));

// Stub chart wrappers so the SVG machinery stays out of jsdom — same
// pattern the /competitors + /overview tests use.
vi.mock("@/components/charts/DonutChartWrapper", () => ({
  DonutChartWrapper: ({ data }: { data: ReadonlyArray<{ label: string; value: number }> }) => (
    <div data-testid="domain-types-donut">
      {data.map((d) => (
        <span key={d.label}>{d.label}</span>
      ))}
    </div>
  ),
}));
vi.mock("@/components/charts/BarChartWrapper", () => ({
  // Bar wrapper is reused for Authority + Freshness in the same render.
  // Tag each instance with its valueAxisLabel so assertions can target
  // a specific bar chart by `data-testid="bar-Citations"` or
  // `bar-Sources`.
  BarChartWrapper: ({
    data,
    valueAxisLabel,
  }: {
    data: ReadonlyArray<{ label: string; value: number }>;
    valueAxisLabel?: string;
  }) => (
    <div data-testid={`bar-${valueAxisLabel ?? "default"}`}>
      {data.map((d) => (
        <span key={d.label}>
          {d.label}:{d.value}
        </span>
      ))}
    </div>
  ),
}));
vi.mock("@/components/charts/LineChartWrapper", () => ({
  LineChartWrapper: ({ series }: { series?: ReadonlyArray<{ id: string; name: string }> }) => (
    <div data-testid="owned-share-line">
      {(series ?? []).map((s) => (
        <span key={s.id}>{s.name}</span>
      ))}
    </div>
  ),
}));

import {
  SourcesScreen,
  classifySourceRelationship,
  countByRelationship,
  countByType,
  deriveAuthorityBuckets,
  deriveFreshnessBuckets,
  deriveHero,
  deriveRelationshipShares,
  deriveScatterPoints,
  deriveSourceMovers,
  deriveTypeShares,
  filterActive,
} from "./SourcesScreen";

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
  overviewSeries = [];
  brandsForClassification = [{ id: "brand-1", name: "Acme" }];
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

  it("classifies and filters rows by inferred source relationship", () => {
    expect(
      classifySourceRelationship(
        domain({ sourceName: "Acme Blog", normalizedDomain: "acme.com" }),
        "Acme",
      ),
    ).toBe("Owned");
    expect(
      classifySourceRelationship(
        domain({ sourceName: "Reddit", normalizedDomain: "reddit.com" }),
        "Acme",
      ),
    ).toBe("Third-party");
    expect(
      classifySourceRelationship(
        domain({ sourceName: "Acme Blog", normalizedDomain: "acme.com" }),
        null,
      ),
    ).toBe("Unknown");

    expect(countByRelationship({ kind: "domain", allRows: domainRows }, "Acme")).toEqual({
      Owned: 1,
      "Third-party": 1,
      Unknown: 0,
    });
    expect(
      filterActive({ kind: "domain", allRows: domainRows }, "", null, "Owned", "Acme").map(
        (r) => r.sourceId,
      ),
    ).toEqual(["a"]);
  });
});

describe("deriveTypeShares (pure)", () => {
  it("returns [] when there are no rows", () => {
    expect(deriveTypeShares([])).toEqual([]);
  });

  it("aggregates citations per source type + sorts by count desc", () => {
    const shares = deriveTypeShares([
      domain({ sourceId: "a", sourceType: "Editorial", citationCount: 10 }),
      domain({ sourceId: "b", sourceType: "Editorial", citationCount: 6 }),
      domain({ sourceId: "c", sourceType: "UGC", citationCount: 4 }),
    ]);
    expect(shares.map((s) => s.sourceType)).toEqual(["Editorial", "UGC"]);
    expect(shares[0].citationCount).toBe(16);
    expect(shares[0].share).toBeCloseTo(16 / 20, 5);
    expect(shares[1].citationCount).toBe(4);
  });

  it("returns [] when all rows have zero citations", () => {
    expect(deriveTypeShares([domain({ sourceId: "a", citationCount: 0 })])).toEqual([]);
  });
});

describe("deriveRelationshipShares (pure)", () => {
  it("aggregates citations by inferred relationship + sorts by count desc", () => {
    const shares = deriveRelationshipShares(
      [
        domain({
          sourceId: "a",
          sourceName: "Acme Blog",
          normalizedDomain: "acme.com",
          citationCount: 10,
        }),
        domain({
          sourceId: "b",
          sourceName: "Reddit",
          normalizedDomain: "reddit.com",
          citationCount: 6,
        }),
      ],
      "Acme",
    );
    expect(shares.map((s) => s.relationship)).toEqual(["Owned", "Third-party"]);
    expect(shares[0].citationCount).toBe(10);
    expect(shares[0].share).toBeCloseTo(10 / 16, 5);
  });

  it("returns [] when all rows have zero relationship citations", () => {
    expect(deriveRelationshipShares([domain({ sourceId: "a", citationCount: 0 })], "Acme")).toEqual(
      [],
    );
  });
});

describe("deriveAuthorityBuckets (pure)", () => {
  it("bucketed counts sum across the five bands; null-authority drops", () => {
    const buckets = deriveAuthorityBuckets([
      domain({ sourceId: "a", authorityScore: 10, citationCount: 4 }), // 0–20
      domain({ sourceId: "b", authorityScore: 30, citationCount: 2 }), // 20–40
      domain({ sourceId: "c", authorityScore: 85, citationCount: 6 }), // 80–100
      domain({ sourceId: "d", authorityScore: 100, citationCount: 1 }), // 80–100 inclusive
      domain({ sourceId: "e", authorityScore: null, citationCount: 7 }), // dropped
    ]);
    expect(buckets.find((b) => b.label === "0–20")?.citations).toBe(4);
    expect(buckets.find((b) => b.label === "20–40")?.citations).toBe(2);
    expect(buckets.find((b) => b.label === "40–60")?.citations).toBe(0);
    expect(buckets.find((b) => b.label === "60–80")?.citations).toBe(0);
    expect(buckets.find((b) => b.label === "80–100")?.citations).toBe(7);
  });
});

describe("deriveScatterPoints (pure)", () => {
  it("drops null-authority rows + projects (authority, citations)", () => {
    const points = deriveScatterPoints([
      domain({ sourceId: "a", sourceName: "Acme", authorityScore: 75, citationCount: 12 }),
      domain({ sourceId: "b", sourceName: "Beta", authorityScore: null, citationCount: 8 }),
    ]);
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual({ sourceId: "a", name: "Acme", authority: 75, citations: 12 });
  });
});

describe("deriveFreshnessBuckets (pure)", () => {
  const NOW = new Date("2026-06-16T00:00:00Z");

  it("bins sources by last-seen recency and counts never separately", () => {
    const buckets = deriveFreshnessBuckets(
      [
        domain({ sourceId: "today", lastSeenAt: "2026-06-15T20:00:00Z" }), // <1d ago
        domain({ sourceId: "week", lastSeenAt: "2026-06-12T00:00:00Z" }), // 4d
        domain({ sourceId: "month", lastSeenAt: "2026-05-25T00:00:00Z" }), // 22d
        domain({ sourceId: "older", lastSeenAt: "2026-04-01T00:00:00Z" }), // 76d
        domain({ sourceId: "never", lastSeenAt: null }),
      ],
      NOW,
    );
    expect(buckets.find((b) => b.label === "Today")?.sourceCount).toBe(1);
    expect(buckets.find((b) => b.label === "This week")?.sourceCount).toBe(1);
    expect(buckets.find((b) => b.label === "This month")?.sourceCount).toBe(1);
    expect(buckets.find((b) => b.label === "Older")?.sourceCount).toBe(1);
    expect(buckets.find((b) => b.label === "Never")?.sourceCount).toBe(1);
  });
});

describe("deriveSourceMovers (pure)", () => {
  it("returns no movers when current = previous", () => {
    const rows = [domain({ sourceId: "a", sourceName: "Acme", citationCount: 5 })];
    const { gainers, losers } = deriveSourceMovers(rows, rows);
    expect(gainers).toEqual([]);
    expect(losers).toEqual([]);
  });

  it("ranks gainers descending and losers ascending by signed delta", () => {
    const current = [
      domain({ sourceId: "a", sourceName: "Up A", citationCount: 12 }),
      domain({ sourceId: "b", sourceName: "Down B", citationCount: 2 }),
    ];
    const previous = [
      domain({ sourceId: "a", sourceName: "Up A", citationCount: 5 }),
      domain({ sourceId: "b", sourceName: "Down B", citationCount: 5 }),
    ];
    const { gainers, losers } = deriveSourceMovers(current, previous);
    expect(gainers).toHaveLength(1);
    expect(gainers[0]).toMatchObject({ name: "Up A", delta: 7 });
    expect(losers).toHaveLength(1);
    expect(losers[0]).toMatchObject({ name: "Down B", delta: -3 });
  });

  it("flags fully-new sources with null pctChange", () => {
    const { gainers } = deriveSourceMovers(
      [domain({ sourceId: "new", sourceName: "New", citationCount: 4 })],
      [],
    );
    expect(gainers).toHaveLength(1);
    expect(gainers[0].pctChange).toBeNull();
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
    expect(within(table).getByText("Actions")).toBeInTheDocument();
    expect(within(table).getAllByRole("button", { name: "View cited answers" })[0]).toBeEnabled();
    expect(within(table).getAllByRole("button", { name: "Add to report" })[0]).toBeEnabled();
    expect(within(table).getAllByRole("button", { name: "Ignore" })[0]).toBeEnabled();
  });

  it("opens a cited source drawer from the Domains table", async () => {
    domainsState = {
      data: domainsPayload([
        domain({
          sourceId: "a",
          sourceName: "Trustpilot",
          normalizedDomain: "trustpilot.com",
          citationCount: 5,
          retrievedInScans: 2,
          authorityScore: 78,
          lastSeenAt: "2026-06-10T00:00:00Z",
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<SourcesScreen />);

    const table = screen.getByRole("table");
    await userEvent.click(within(table).getByRole("button", { name: "View cited answers" }));

    const drawer = screen.getByRole("dialog", { name: "Trustpilot" });
    expect(within(drawer).getByText("trustpilot.com")).toBeInTheDocument();
    expect(within(drawer).getByText("Third-party")).toBeInTheDocument();
    expect(within(drawer).getByText("5")).toBeInTheDocument();
    expect(within(drawer).getByText("2")).toBeInTheDocument();
    expect(within(drawer).getByText("78")).toBeInTheDocument();
    expect(within(drawer).getByText(/cited answer excerpts will appear here/i)).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Add to report" })).toBeEnabled();
    expect(within(drawer).getByRole("button", { name: "Ignore" })).toBeEnabled();
  });

  it("adds a source row to the local report queue", async () => {
    domainsState = {
      data: domainsPayload([domain({ sourceId: "a", sourceName: "Trustpilot", citationCount: 5 })]),
      isLoading: false,
      isError: false,
    };
    render(<SourcesScreen />);

    const table = screen.getByRole("table");
    await userEvent.click(within(table).getByRole("button", { name: "Add to report" }));

    expect(within(table).getByRole("button", { name: "Added to report" })).toBeDisabled();
    expect(screen.getByText("Trustpilot was added to the source report.")).toBeInTheDocument();
  });

  it("ignores a source row in the active view", async () => {
    domainsState = {
      data: domainsPayload([
        domain({ sourceId: "a", sourceName: "Trustpilot", citationCount: 5 }),
        domain({ sourceId: "b", sourceName: "Reddit", sourceType: "UGC", citationCount: 3 }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<SourcesScreen />);

    const table = screen.getByRole("table");
    await userEvent.click(within(table).getAllByRole("button", { name: "Ignore" })[0]);

    expect(within(table).queryByText("Trustpilot")).not.toBeInTheDocument();
    expect(within(table).getByText("Reddit")).toBeInTheDocument();
    expect(screen.getByText("Trustpilot was ignored in this view.")).toBeInTheDocument();
  });

  it("shows inferred relationship columns and filters the active table by relationship", async () => {
    domainsState = {
      data: domainsPayload([
        domain({
          sourceId: "a",
          sourceName: "Acme Blog",
          normalizedDomain: "acme.com",
          citationCount: 5,
        }),
        domain({
          sourceId: "b",
          sourceName: "Reddit",
          normalizedDomain: "reddit.com",
          sourceType: "UGC",
          citationCount: 3,
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<SourcesScreen />);

    const table = screen.getByRole("table");
    expect(within(table).getByText("Relationship")).toBeInTheDocument();
    expect(within(table).getByText("Owned")).toBeInTheDocument();
    expect(within(table).getByText("Third-party")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Owned\s+1/i }));

    expect(within(table).getByText("Acme Blog")).toBeInTheDocument();
    expect(within(table).queryByText("Reddit")).not.toBeInTheDocument();
  });

  it("flips to the URLs table when the view toggle is clicked", async () => {
    domainsState = {
      data: domainsPayload([domain({ sourceId: "a", sourceName: "Trustpilot" })]),
      isLoading: false,
      isError: false,
    };
    urlsState = {
      data: urlsPayload([
        url({
          sourceUrlId: "u1",
          title: "Trustpilot article",
          sourceName: "Trustpilot",
          normalizedDomain: "trustpilot.com",
          normalizedUrl: "trustpilot.com/x",
          url: "https://trustpilot.com/x",
          citationCount: 4,
          retrievedInScans: 1,
        }),
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
    const table = screen.getByRole("table");
    expect(within(table).getByText("Actions")).toBeInTheDocument();
    const viewButton = within(table).getByRole("button", { name: "View cited answers" });
    expect(viewButton).toBeEnabled();

    await userEvent.click(viewButton);

    const drawer = screen.getByRole("dialog", { name: "Trustpilot" });
    expect(within(drawer).getByText("trustpilot.com/x")).toBeInTheDocument();
    expect(within(drawer).getByText("4")).toBeInTheDocument();
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

  it("renders the source-type donut + Authority section + Owned-share trend when data is present", () => {
    domainsState = {
      data: domainsPayload([
        domain({
          sourceId: "a",
          sourceName: "Trustpilot",
          sourceType: "Editorial",
          authorityScore: 78,
          citationCount: 12,
        }),
        domain({
          sourceId: "b",
          sourceName: "Reddit",
          sourceType: "UGC",
          authorityScore: 35,
          citationCount: 5,
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    overviewSeries = [
      {
        entityType: "Brand",
        entityId: "brand-1",
        entityName: "India Today",
        metricName: "BrandOwnedCitationShare",
        seriesKind: "Numeric",
        points: [
          { scanRunId: "s1", capturedAt: "2026-06-01T00:00:00Z", value: 0.25, category: null },
        ],
      },
    ];
    render(<SourcesScreen />);

    // Source-type donut renders one slice per type.
    const donut = screen.getByTestId("domain-types-donut");
    expect(within(donut).getByText("Editorial")).toBeInTheDocument();
    expect(within(donut).getByText("UGC")).toBeInTheDocument();

    // Authority section is present + the Citations bar bucket for
    // "60–80" (78 authority for Trustpilot) carries the citation count.
    // The h2 heading is now just "Authority" — the distribution +
    // scatter sit side-by-side under that one heading.
    expect(screen.getByRole("heading", { name: /^Authority$/, level: 2 })).toBeInTheDocument();
    const authorityBar = screen.getByTestId("bar-Citations");
    expect(within(authorityBar).getByText("60–80:12")).toBeInTheDocument();
    expect(within(authorityBar).getByText("20–40:5")).toBeInTheDocument();

    // Owned-share trend surfaces the brand series we passed in.
    const line = screen.getByTestId("owned-share-line");
    expect(within(line).getByText("India Today")).toBeInTheDocument();
  });

  it("renders the Authority scatter + Freshness + Movers sections under MetricCategoryLayout", () => {
    domainsState = {
      data: domainsPayload([
        domain({
          sourceId: "a",
          sourceName: "Acme",
          authorityScore: 70,
          citationCount: 12,
          lastSeenAt: "2026-06-15T00:00:00Z",
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<SourcesScreen />);
    // The Authority + Activity sections each render a single h2; the
    // individual card titles (Authority × citations, Citation
    // freshness, Movers) live inside the CollapsibleCard headers, which
    // surface as their own headings.
    expect(screen.getByRole("heading", { name: /^Authority$/, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Activity$/, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Authority × citations/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Citation freshness/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Movers$/i })).toBeInTheDocument();

    // Freshness uses a separate bar wrapper (testid `bar-Sources`) — at
    // least one of the 5 buckets gets the 1 source we seeded.
    const freshnessBar = screen.getByTestId("bar-Sources");
    expect(within(freshnessBar).getByText(/(Today|This week):1/)).toBeInTheDocument();

    // Movers has identical current + previous mocks → no-movement
    // empty state surfaces.
    expect(screen.getByText(/no notable movement this window/i)).toBeInTheDocument();
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
