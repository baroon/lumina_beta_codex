import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./apiClient", () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
}));

import { apiClient } from "./apiClient";
import { trackerScheduleApi } from "./trackerScheduleApi";

const client = vi.mocked(apiClient);

describe("trackerScheduleApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getSetup calls the schedule endpoint", () => {
    trackerScheduleApi.getSetup("t1");
    expect(client.get).toHaveBeenCalledWith("/api/trackers/t1/schedule");
  });

  it("configure puts the schedule payload", () => {
    const data = { platformIds: ["p1"], cadence: "Weekly", timezone: "UTC" };
    trackerScheduleApi.configure("t1", data);
    expect(client.put).toHaveBeenCalledWith("/api/trackers/t1/schedule", data);
  });
});
