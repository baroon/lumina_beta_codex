import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  BrandDto,
  SourceTypeReferenceDto,
  WorkspaceUrlRowDto,
  WorkspaceUrlsDto,
} from "@/types/api";

let scopeState: { scope: "all" | string[] };
let urlsState: {
  data?: WorkspaceUrlsDto;
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
vi.mock("@/features/reports/hooks/useWorkspaceUrls", () => ({
  useWorkspaceUrls: () => ({ ...urlsState, refetch: vi.fn() }),
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

import { SourceUrlsScreen, countByType, filterUrls } from "./SourceUrlsScreen";

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

function row(overrides: Partial<WorkspaceUrlRowDto>): WorkspaceUrlRowDto {
  return {
    sourceUrlId: "u1",
    url: "https://trustpilot.com/reviews/acme",
    normalizedUrl: "trustpilot.com/reviews/acme",
    title: "Acme reviews on Trustpilot",
    sourceId: "s1",
    sourceName: "Trustpilot",
    normalizedDomain: "trustpilot.com",
    sourceType: "Editorial",
    citationCount: 8,
    retrievedInScans: 3,
    lastSeenAt: "2026-06-09T08:00:00Z",
    ...overrides,
  };
}

function payload(rows: WorkspaceUrlRowDto[]): WorkspaceUrlsDto {
  return {
    workspaceId: "w1",
    from: "2026-05-09T00:00:00Z",
    to: "2026-06-09T00:00:00Z",
    urls: rows,
  };
}

beforeEach(() => {
  scopeState = { scope: "all" };
  urlsState = { data: payload([]), isLoading: false, isError: false };
  brandsState = { data: BRANDS, isLoading: false };
  sourceTypesState = { data: SOURCE_TYPES, isLoading: false };
  updateClassificationMutate = vi.fn();
  updateClassificationState = { isPending: false, isError: false };
});

describe("filterUrls (pure)", () => {
  const rows = [
    row({
      sourceUrlId: "a",
      url: "https://reddit.com/r/resumes/hot-post",
      title: "Resume tips thread",
      normalizedDomain: "reddit.com",
      sourceType: "UGC",
    }),
    row({
      sourceUrlId: "b",
      url: "https://techcrunch.com/2026/best-tools",
      title: "Best AI tools 2026",
      normalizedDomain: "techcrunch.com",
      sourceType: "Editorial",
    }),
  ];

  it("returns everything with empty query + no type filter", () => {
    expect(filterUrls(rows, "", null)).toHaveLength(2);
  });

  it("filters by URL substring (case-insensitive)", () => {
    expect(filterUrls(rows, "REDDIT", null).map((r) => r.sourceUrlId)).toEqual(["a"]);
  });

  it("filters by title", () => {
    expect(filterUrls(rows, "resume tips", null).map((r) => r.sourceUrlId)).toEqual(["a"]);
  });

  it("filters by domain", () => {
    expect(filterUrls(rows, "techcrunch.com", null).map((r) => r.sourceUrlId)).toEqual(["b"]);
  });

  it("filters by type", () => {
    expect(filterUrls(rows, "", "UGC").map((r) => r.sourceUrlId)).toEqual(["a"]);
  });

  it("combines query + type filter", () => {
    expect(filterUrls(rows, "tools", "Editorial").map((r) => r.sourceUrlId)).toEqual(["b"]);
    expect(filterUrls(rows, "tools", "UGC")).toHaveLength(0);
  });
});

describe("countByType (pure)", () => {
  it("groups by sourceType", () => {
    const counts = countByType([
      row({ sourceUrlId: "a", sourceType: "Editorial" }),
      row({ sourceUrlId: "b", sourceType: "UGC" }),
      row({ sourceUrlId: "c", sourceType: "Editorial" }),
    ]);
    expect(counts).toEqual({ Editorial: 2, UGC: 1 });
  });
});

describe("SourceUrlsScreen", () => {
  it("renders the page header", () => {
    render(<SourceUrlsScreen />);
    expect(screen.getByRole("heading", { name: /Source URLs/i })).toBeInTheDocument();
  });

  it("renders the empty hint when there are no URLs in scope", () => {
    render(<SourceUrlsScreen />);
    expect(screen.getByText(/no cited urls in scope yet/i)).toBeInTheDocument();
  });

  it("renders one row per URL with title + normalized URL + type chip", () => {
    urlsState = {
      data: payload([
        row({
          sourceUrlId: "u1",
          url: "https://reddit.com/r/resumes",
          normalizedUrl: "reddit.com/r/resumes",
          title: "Resume tips megathread",
          normalizedDomain: "reddit.com",
          sourceType: "UGC",
          citationCount: 7,
          retrievedInScans: 2,
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<SourceUrlsScreen />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Resume tips megathread")).toBeInTheDocument();
    expect(within(table).getByText("reddit.com/r/resumes")).toBeInTheDocument();
    expect(within(table).getByText("reddit.com")).toBeInTheDocument();
    expect(within(table).getByText("UGC")).toBeInTheDocument();
    expect(within(table).getByText("7")).toBeInTheDocument();
    expect(within(table).getByText("2")).toBeInTheDocument();
  });

  it("the URL link opens in a new tab via target=_blank", () => {
    urlsState = {
      data: payload([row({ url: "https://example.com/page", normalizedUrl: "example.com/page" })]),
      isLoading: false,
      isError: false,
    };
    render(<SourceUrlsScreen />);
    const link = screen.getByRole("link", { name: /example.com\/page/i });
    expect(link).toHaveAttribute("href", "https://example.com/page");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("clicking a type pill filters the table and toggles off on second click", async () => {
    urlsState = {
      data: payload([
        row({
          sourceUrlId: "a",
          sourceName: "Reddit",
          url: "https://reddit.com/a",
          normalizedUrl: "reddit.com/a",
          sourceType: "UGC",
        }),
        row({
          sourceUrlId: "b",
          sourceName: "TechCrunch",
          url: "https://techcrunch.com/b",
          normalizedUrl: "techcrunch.com/b",
          sourceType: "Editorial",
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<SourceUrlsScreen />);
    const editorialPill = screen.getByRole("button", { name: /Editorial 1/i });
    await userEvent.click(editorialPill);
    const table1 = screen.getByRole("table");
    expect(within(table1).getByText("techcrunch.com/b")).toBeInTheDocument();
    expect(within(table1).queryByText("reddit.com/a")).not.toBeInTheDocument();

    await userEvent.click(editorialPill);
    const table2 = screen.getByRole("table");
    expect(within(table2).getByText("reddit.com/a")).toBeInTheDocument();
    expect(within(table2).getByText("techcrunch.com/b")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------
  // Per-row classification editor (Phase 4 v1 plan §D11/D20)
  // -------------------------------------------------------------------

  it("renders an editable source-type dropdown per URL when a brand is in scope", () => {
    urlsState = {
      data: payload([
        row({
          sourceUrlId: "u1",
          sourceName: "Trustpilot",
          sourceType: "Editorial",
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<SourceUrlsScreen />);
    expect(
      screen.getByRole("combobox", { name: /source type for Trustpilot/i }),
    ).toBeInTheDocument();
  });

  it("hides the 'Classifying for' picker when the workspace has a single brand", () => {
    render(<SourceUrlsScreen />);
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
    render(<SourceUrlsScreen />);
    expect(screen.getByLabelText(/classifying for brand/i)).toBeInTheDocument();
  });

  it("falls back to a read-only badge when the workspace has no brands yet", () => {
    brandsState = { data: [], isLoading: false };
    urlsState = {
      data: payload([
        row({
          sourceUrlId: "u1",
          sourceName: "Trustpilot",
          sourceType: "Editorial",
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<SourceUrlsScreen />);
    expect(
      screen.queryByRole("combobox", { name: /source type for Trustpilot/i }),
    ).not.toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Editorial")).toBeInTheDocument();
  });

  it("surfaces a per-row server-error message scoped to the failing sourceId", () => {
    updateClassificationState = {
      isPending: false,
      isError: true,
      error: new Error("Source not found."),
      variables: { sourceId: "s-fail", sourceType: "UGC" },
    };
    urlsState = {
      data: payload([
        row({
          sourceUrlId: "u1",
          sourceId: "s-fail",
          sourceName: "Trustpilot",
          url: "https://trustpilot.com/a",
          normalizedUrl: "trustpilot.com/a",
        }),
        row({
          sourceUrlId: "u2",
          sourceId: "s-fail",
          sourceName: "Trustpilot",
          url: "https://trustpilot.com/b",
          normalizedUrl: "trustpilot.com/b",
        }),
        row({
          sourceUrlId: "u3",
          sourceId: "s-other",
          sourceName: "Indeed",
          url: "https://indeed.com/a",
          normalizedUrl: "indeed.com/a",
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<SourceUrlsScreen />);
    // Both URL rows backed by the failing source show the error;
    // the unrelated source's row does not.
    expect(screen.getAllByText(/Source not found/i)).toHaveLength(2);
  });
});
