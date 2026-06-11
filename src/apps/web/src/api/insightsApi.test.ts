import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./apiClient", () => ({
  apiClient: { post: vi.fn() },
}));

import { apiClient } from "./apiClient";
import { insightsApi } from "./insightsApi";

const client = vi.mocked(apiClient);

describe("insightsApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generateNarrative POSTs the filter payload to /api/insights/narrative", () => {
    insightsApi.generateNarrative({
      from: "2026-05-10T00:00:00Z",
      to: "2026-06-09T00:00:00Z",
      trackerIds: ["t1", "t2"],
    });
    expect(client.post).toHaveBeenCalledWith("/api/insights/narrative", {
      from: "2026-05-10T00:00:00Z",
      to: "2026-06-09T00:00:00Z",
      trackerIds: ["t1", "t2"],
    });
  });
});
