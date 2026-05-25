import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

import { apiClient } from "./apiClient";
import { scansApi } from "./scansApi";

const client = vi.mocked(apiClient);

describe("scansApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("run posts to the scans endpoint", () => {
    scansApi.run("t1");
    expect(client.post).toHaveBeenCalledWith("/api/trackers/t1/scans", {});
  });

  it("latest gets the latest scan", () => {
    scansApi.latest("t1");
    expect(client.get).toHaveBeenCalledWith("/api/trackers/t1/scans/latest");
  });
});
