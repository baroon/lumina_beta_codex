import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  BrandDto,
  SourceTypeReferenceDto,
  WorkspaceDomainRowDto,
  WorkspaceDomainsDto,
} from "@/types/api";

let scopeState: { scope: "all" | string[] };
let domainsState: {
  data?: WorkspaceDomainsDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};
let brandsState: { data?: BrandDto[]; isLoading: boolean };
let sourceTypesState: { data?: SourceTypeReferenceDto[]; isLoading: boolean };
let updateClassificationMutate: ReturnType<typeof vi.fn>;
let updateClassificationState: {
  isPending: boolean;
  isError: boolean;
  error?: Error;
  variables?: { sourceId: string; sourceType: string };
} = { isPending: false, isError: false };

vi.mock("@/hooks/useTrackerScope", () => ({
  useTrackerScope: () => scopeState,
}));
vi.mock("@/features/reports/hooks/useWorkspaceDomains", () => ({
  useWorkspaceDomains: () => ({ ...domainsState, refetch: vi.fn() }),
}));
vi.mock("@/features/reports/hooks/useSourceTypes", () => ({
  useSourceTypes: () => sourceTypesState,
}));
vi.mock("@/features/reports/hooks/useUpdateWorkspaceSourceClassification", () => ({
  useUpdateWorkspaceSourceClassification: () => ({
    mutate: updateClassificationMutate,
    ...updateClassificationState,
  }),
  useWorkspaceBrandsForClassification: () => brandsState,
}));

import { DomainsScreen, countByType, filterDomains } from "./DomainsScreen";

const BRANDS: BrandDto[] = [
  {
    id: "b1",
    name: "Acme Corp",
    websiteUrl: "https://acme.example.com",
    createdAt: "2026-06-01T00:00:00Z",
    latestDiscovery: null,
  },
];

const SOURCE_TYPES: SourceTypeReferenceDto[] = [
  { id: "1", code: "Owned", name: "Owned", description: "", displayOrder: 1 },
  { id: "2", code: "Competitor", name: "Competitor", description: "", displayOrder: 2 },
  { id: "3", code: "Editorial", name: "Editorial", description: "", displayOrder: 3 },
  { id: "4", code: "UGC", name: "UGC", description: "", displayOrder: 4 },
];

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
  brandsState = { data: BRANDS, isLoading: false };
  sourceTypesState = { data: SOURCE_TYPES, isLoading: false };
  updateClassificationMutate = vi.fn();
  updateClassificationState = { isPending: false, isError: false };
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

  // -------------------------------------------------------------------
  // Per-row classification editor (Phase 4 v1 plan §D11/D20)
  // -------------------------------------------------------------------

  it("renders an editable source-type dropdown per row when a brand is in scope", () => {
    domainsState = {
      data: payload([
        row({ sourceId: "trust", sourceName: "Trustpilot", sourceType: "Editorial" }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<DomainsScreen />);
    expect(
      screen.getByRole("combobox", { name: /source type for Trustpilot/i }),
    ).toBeInTheDocument();
  });

  it("hides the 'Classifying for' picker when the workspace has a single brand", () => {
    render(<DomainsScreen />);
    expect(screen.queryByLabelText(/classifying for brand/i)).not.toBeInTheDocument();
  });

  it("shows the 'Classifying for' picker when the workspace has multiple brands", () => {
    brandsState = {
      data: [
        ...BRANDS,
        {
          id: "b2",
          name: "Other Co",
          websiteUrl: "https://other.example.com",
          createdAt: "2026-06-01T00:00:00Z",
          latestDiscovery: null,
        },
      ],
      isLoading: false,
    };
    render(<DomainsScreen />);
    expect(screen.getByLabelText(/classifying for brand/i)).toBeInTheDocument();
  });

  it("falls back to a read-only badge when the workspace has no brands yet", () => {
    brandsState = { data: [], isLoading: false };
    domainsState = {
      data: payload([
        row({ sourceId: "trust", sourceName: "Trustpilot", sourceType: "Editorial" }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<DomainsScreen />);
    expect(
      screen.queryByRole("combobox", { name: /source type for Trustpilot/i }),
    ).not.toBeInTheDocument();
    // Badge still surfaces the current dominant type inside the row.
    const table = screen.getByRole("table");
    expect(within(table).getByText("Editorial")).toBeInTheDocument();
  });

  it("renders a server-error message inline on the row that failed", () => {
    updateClassificationState = {
      isPending: false,
      isError: true,
      error: new Error("Source not found."),
      variables: { sourceId: "trust", sourceType: "UGC" },
    };
    domainsState = {
      data: payload([
        row({ sourceId: "trust", sourceName: "Trustpilot", sourceType: "Editorial" }),
        row({ sourceId: "indeed", sourceName: "Indeed", sourceType: "Editorial" }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<DomainsScreen />);
    // Error renders only on the failing row, not on every row.
    expect(screen.getAllByText(/Source not found/i)).toHaveLength(1);
  });
});
