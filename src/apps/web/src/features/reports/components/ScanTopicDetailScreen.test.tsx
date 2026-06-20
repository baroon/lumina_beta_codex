import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@/api/apiClient";
import type { ScanTopicDetailDto } from "@/types/api";

vi.mock("./ScanBreadcrumb", () => ({ ScanBreadcrumb: () => null }));

import { ScanTopicDetailScreen } from "./ScanTopicDetailScreen";

type HookReturn = {
  data?: ScanTopicDetailDto;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => Promise<void>;
};

let hookState: HookReturn;

vi.mock("../hooks/useScanTopic", () => ({
  useScanTopic: () => hookState,
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
  };
});

const fixture: ScanTopicDetailDto = {
  scanRunId: "scan-1",
  topicId: "t1",
  topicName: "Sustainable Design",
  metrics: {
    brandMentionRate: 0.45,
    brandRecommendationRate: 0.2,
    brandShareOfVoice: 0.55,
    averageBrandRank: 2.3,
    citationCount: 12,
    ownedCitationCount: 3,
    competitorCitationCount: 4,
    thirdPartyCitationCount: 4,
    unknownCitationCount: 1,
    brandSentimentDistribution: { Positive: 6, Neutral: 5 },
  },
  byPlatform: [
    {
      platformId: "p1",
      platformCode: "openai",
      platformName: "ChatGPT",
      answerCount: 8,
      brandMentionRate: 0.5,
      brandRecommendationRate: 0.25,
      brandShareOfVoice: 0.6,
      citationCount: 7,
    },
  ],
  topCitedSources: [{ sourceId: "s1", sourceName: "ASLA", citationCount: 4 }],
};

describe("ScanTopicDetailScreen", () => {
  it("renders loading state", () => {
    hookState = { isLoading: true, isError: false, refetch: vi.fn() };
    const { container } = render(<ScanTopicDetailScreen scanRunId="scan-1" topicId="t1" />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders 404 placeholder when topic not found", () => {
    hookState = {
      isLoading: false,
      isError: true,
      error: new ApiError(404, "not found"),
      refetch: vi.fn(),
    };
    render(<ScanTopicDetailScreen scanRunId="scan-1" topicId="missing" />);
    expect(screen.getByText(/topic data not found/i)).toBeInTheDocument();
  });

  it("renders topic name + metrics + by-platform breakdown + top cited", () => {
    hookState = { isLoading: false, isError: false, data: fixture, refetch: vi.fn() };
    render(<ScanTopicDetailScreen scanRunId="scan-1" topicId="t1" />);

    expect(screen.getByRole("heading", { name: "Sustainable Design" })).toBeInTheDocument();
    expect(screen.getByText("45.0%")).toBeInTheDocument(); // brand mention rate
    expect(screen.getByText("ChatGPT")).toBeInTheDocument();
    expect(screen.getByText("ASLA")).toBeInTheDocument();
  });

  it("queues the topic detail for reporting and exports an evidence package", async () => {
    const objectUrlSpy = vi.fn(() => "blob:scan-topic-detail");
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
      render(<ScanTopicDetailScreen scanRunId="scan-1" topicId="t1" />);

      await userEvent.click(screen.getByRole("button", { name: "Add to report" }));
      expect(screen.getByRole("button", { name: "Added to report" })).toBeDisabled();
      expect(
        screen.getByText("Sustainable Design was added to the scan topic report."),
      ).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Export package" }));
      expect(objectUrlSpy).toHaveBeenCalledOnce();
      expect(clickSpy).toHaveBeenCalledOnce();
      expect(revokeUrlSpy).toHaveBeenCalledWith("blob:scan-topic-detail");
      expect(
        screen.getByText("Sustainable Design topic detail package exported."),
      ).toBeInTheDocument();
    } finally {
      clickSpy.mockRestore();
    }
  });

  it("renders the section empty-states when by-platform and top-cited are empty", () => {
    hookState = {
      isLoading: false,
      isError: false,
      data: { ...fixture, byPlatform: [], topCitedSources: [] },
      refetch: vi.fn(),
    };
    render(<ScanTopicDetailScreen scanRunId="scan-1" topicId="t1" />);
    expect(screen.getByText(/no per-platform answers landed in this topic/i)).toBeInTheDocument();
    expect(screen.getByText(/no sources were cited within this topic/i)).toBeInTheDocument();
  });
});
