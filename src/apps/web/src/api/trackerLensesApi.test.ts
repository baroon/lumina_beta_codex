import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./apiClient", () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
}));

import { apiClient } from "./apiClient";
import { trackerLensesApi } from "./trackerLensesApi";

const client = vi.mocked(apiClient);

describe("trackerLensesApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getSetup calls the lenses endpoint", () => {
    trackerLensesApi.getSetup("t1");
    expect(client.get).toHaveBeenCalledWith("/api/trackers/t1/lenses");
  });

  it("update puts the lensIds payload", () => {
    const data = { lensIds: ["l1", "l2"] };
    trackerLensesApi.update("t1", data);
    expect(client.put).toHaveBeenCalledWith("/api/trackers/t1/lenses", data);
  });
});
