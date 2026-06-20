import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@/api/apiClient";
import type { ScanSourcesDto, SourceTypeReferenceDto } from "@/types/api";

// Stub ScanBreadcrumb — it calls useScanResults (React Query) which
// would otherwise need a QueryClientProvider in these screen tests.
vi.mock("./ScanBreadcrumb", () => ({ ScanBreadcrumb: () => null }));

import { ScanSourcesScreen } from "./ScanSourcesScreen";

type SourcesHookReturn = {
  data?: ScanSourcesDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => Promise<void>;
};

type TypesHookReturn = {
  data?: SourceTypeReferenceDto[];
  isLoading: boolean;
};

type MutationReturn = {
  mutate: (input: { sourceId: string; brandId: string; sourceType: string }) => void;
  isPending: boolean;
};

let sourcesState: SourcesHookReturn;
let typesState: TypesHookReturn;
let mutationState: MutationReturn;

vi.mock("../hooks/useScanSources", () => ({
  useScanSources: () => sourcesState,
}));
vi.mock("../hooks/useSourceTypes", () => ({
  useSourceTypes: () => typesState,
}));
vi.mock("../hooks/useUpdateSourceClassification", () => ({
  useUpdateSourceClassification: () => mutationState,
}));
// Stub TanStack Link as a plain anchor — matches the pattern in BrandList.test.tsx
// (avoids needing a full router context for this unit test).
vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...rest
    }: { to: string; children: React.ReactNode } & Record<string, unknown>) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});
// Drawer pulls in its own hook + Radix portals; stub for these screen tests.
vi.mock("./SourceCitationsDrawer", () => ({
  SourceCitationsDrawer: ({ sourceId }: { sourceId: string | null }) => (
    <div data-testid="drawer-stub">{sourceId ? `open:${sourceId}` : "closed"}</div>
  ),
}));

const sourcesFixture: ScanSourcesDto = {
  scanRunId: "scan-1",
  brandId: "brand-1",
  sources: [
    {
      sourceId: "s1",
      sourceName: "ASLA",
      domain: "asla.org",
      normalizedDomain: "asla.org",
      sourceType: "Institutional",
      status: "Active",
      provenanceSource: "LLMClassified",
      confidenceScore: 0.9,
      citationCount: 5,
      platforms: [{ platformId: "p1", code: "openai", name: "ChatGPT" }],
    },
  ],
};

const typesFixture: SourceTypeReferenceDto[] = [
  { id: "1", code: "Editorial", name: "Editorial", description: "News.", displayOrder: 5 },
  {
    id: "2",
    code: "Institutional",
    name: "Institutional",
    description: "Govt + NGO.",
    displayOrder: 8,
  },
];

describe("ScanSourcesScreen", () => {
  it("renders loading state while sources are fetching", () => {
    sourcesState = { isLoading: true, isError: false, refetch: vi.fn() };
    typesState = { isLoading: false, data: typesFixture };
    mutationState = { mutate: vi.fn(), isPending: false };

    const { container } = render(<ScanSourcesScreen scanRunId="scan-1" />);
    // LoadingPage renders Skeleton elements with .animate-pulse — same shape
    // as the ScanResultsScreen loading test.
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders 404 friendly state when the scan does not exist", () => {
    sourcesState = {
      isLoading: false,
      isError: true,
      error: new ApiError(404, "not found"),
      refetch: vi.fn(),
    };
    typesState = { isLoading: false, data: typesFixture };
    mutationState = { mutate: vi.fn(), isPending: false };

    render(<ScanSourcesScreen scanRunId="scan-1" />);
    expect(screen.getByText(/scan not found/i)).toBeInTheDocument();
  });

  it("renders the table when data is loaded", () => {
    sourcesState = { isLoading: false, isError: false, data: sourcesFixture, refetch: vi.fn() };
    typesState = { isLoading: false, data: typesFixture };
    mutationState = { mutate: vi.fn(), isPending: false };

    render(<ScanSourcesScreen scanRunId="scan-1" />);
    expect(screen.getByText("ASLA")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to scan results/i })).toBeInTheDocument();
  });

  it("queues cited sources for reporting and exports an evidence package", async () => {
    const objectUrlSpy = vi.fn(() => "blob:scan-sources");
    const revokeUrlSpy = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: objectUrlSpy,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeUrlSpy,
    });
    sourcesState = { isLoading: false, isError: false, data: sourcesFixture, refetch: vi.fn() };
    typesState = { isLoading: false, data: typesFixture };
    mutationState = { mutate: vi.fn(), isPending: false };

    try {
      render(<ScanSourcesScreen scanRunId="scan-1" />);

      await userEvent.click(screen.getByRole("button", { name: "Add to report" }));
      expect(screen.getByRole("button", { name: "Added to report" })).toBeDisabled();
      expect(
        screen.getByText("1 cited sources were added to the scan report."),
      ).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Export package" }));
      expect(objectUrlSpy).toHaveBeenCalledOnce();
      expect(clickSpy).toHaveBeenCalledOnce();
      expect(revokeUrlSpy).toHaveBeenCalledWith("blob:scan-sources");
      expect(
        screen.getByText("Source evidence package exported with 1 cited sources."),
      ).toBeInTheDocument();
    } finally {
      clickSpy.mockRestore();
    }
  });
});
