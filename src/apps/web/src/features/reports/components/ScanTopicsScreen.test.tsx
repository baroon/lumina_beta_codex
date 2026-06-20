import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@/api/apiClient";
import type { ScanTopicsDto } from "@/types/api";

vi.mock("./ScanBreadcrumb", () => ({ ScanBreadcrumb: () => null }));

import { ScanTopicsScreen } from "./ScanTopicsScreen";

type HookReturn = {
  data?: ScanTopicsDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => Promise<void>;
};

let hookState: HookReturn;
const navigateMock = vi.fn();

vi.mock("../hooks/useScanTopics", () => ({
  useScanTopics: () => hookState,
}));
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
    useNavigate: () => navigateMock,
  };
});

const fixture: ScanTopicsDto = {
  scanRunId: "scan-1",
  topics: [
    {
      topicId: "t1",
      topicName: "Sustainability",
      brandMentionRate: 0.5,
      brandRecommendationRate: 0.25,
      brandShareOfVoice: 0.4,
      averageBrandRank: 2.5,
      citationCount: 8,
      ownedCitationShare: 0.25,
      dominantSentiment: "Positive",
      ownershipScore: 0.5,
      ownershipBand: "Contested",
    },
  ],
};

describe("ScanTopicsScreen", () => {
  it("renders loading state while fetching", () => {
    hookState = { isLoading: true, isError: false, refetch: vi.fn() };
    const { container } = render(<ScanTopicsScreen scanRunId="scan-1" />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders 404 placeholder when the scan does not exist", () => {
    hookState = {
      isLoading: false,
      isError: true,
      error: new ApiError(404, "not found"),
      refetch: vi.fn(),
    };
    render(<ScanTopicsScreen scanRunId="scan-1" />);
    expect(screen.getByText(/topic data not found/i)).toBeInTheDocument();
  });

  it("renders topics + back link on success", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<ScanTopicsScreen scanRunId="scan-1" />);
    expect(screen.getByText("Sustainability")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to scan results/i })).toBeInTheDocument();
  });

  it("queues topics for reporting and exports an evidence package", async () => {
    const objectUrlSpy = vi.fn(() => "blob:scan-topics");
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
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };

    try {
      render(<ScanTopicsScreen scanRunId="scan-1" />);

      await userEvent.click(screen.getByRole("button", { name: "Add to report" }));
      expect(screen.getByRole("button", { name: "Added to report" })).toBeDisabled();
      expect(screen.getByText("1 scan topics were added to the scan report.")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Export package" }));
      expect(objectUrlSpy).toHaveBeenCalledOnce();
      expect(clickSpy).toHaveBeenCalledOnce();
      expect(revokeUrlSpy).toHaveBeenCalledWith("blob:scan-topics");
      expect(
        screen.getByText("Topic evidence package exported with 1 scan topics."),
      ).toBeInTheDocument();
    } finally {
      clickSpy.mockRestore();
    }
  });
});
