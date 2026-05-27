import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ScanResultsDto } from "@/types/api";

vi.mock("@/api/scansApi", () => ({
  scansApi: { run: vi.fn(), latest: vi.fn(), results: vi.fn() },
}));

import { scansApi } from "@/api/scansApi";
import { useScanResults } from "./useScanResults";

const api = vi.mocked(scansApi);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

const EMPTY_RESULTS: ScanResultsDto = {
  scanRunId: "s1",
  summary: {
    trackerId: "t1",
    trackerName: "Tracker",
    brandId: "b1",
    brandName: "Brand",
    startedAt: "2026-05-27T10:00:00Z",
    completedAt: null,
    scanStatus: "Completed",
    analysisStatus: "Completed",
    analysisError: null,
    scanCheckCount: 30,
    completedCount: 30,
    failedCount: 0,
    platforms: [],
  },
  coreMetrics: {
    brandMentionRate: null,
    brandRecommendationRate: null,
    brandShareOfVoice: null,
    averageBrandRank: null,
    competitorMentionCount: 0,
    productMentionCount: 0,
    citationCount: 0,
    ownedCitationCount: 0,
    competitorCitationCount: 0,
    thirdPartyCitationCount: 0,
    unknownCitationCount: 0,
    brandSentimentDistribution: {},
    topCitedSources: [],
  },
  breakdowns: {
    byPlatform: [],
    byLens: [],
    byTopic: [],
    byCompetitor: [],
  },
};

describe("useScanResults", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches scan results when scanRunId is provided", async () => {
    api.results.mockResolvedValue(EMPTY_RESULTS);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useScanResults("s1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.results).toHaveBeenCalledWith("s1");
    expect(result.current.data?.scanRunId).toBe("s1");
  });

  it("does not fire when scanRunId is empty", () => {
    const { wrapper } = createWrapper();
    renderHook(() => useScanResults(""), { wrapper });
    expect(api.results).not.toHaveBeenCalled();
  });
});
