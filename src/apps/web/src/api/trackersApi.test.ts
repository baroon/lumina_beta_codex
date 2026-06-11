import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from "./apiClient";
import { trackersApi } from "./trackersApi";

const client = vi.mocked(apiClient);

describe("trackersApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getSetupPreview calls the preview endpoint", () => {
    trackersApi.getSetupPreview("b1");
    expect(client.get).toHaveBeenCalledWith("/api/brands/b1/trackers/setup-preview");
  });

  it("create posts to the trackers endpoint", () => {
    trackersApi.create("b1", { name: "My Tracker" });
    expect(client.post).toHaveBeenCalledWith("/api/brands/b1/trackers", { name: "My Tracker" });
  });

  it("delete DELETEs /api/trackers/:id", () => {
    trackersApi.delete("t1");
    expect(client.delete).toHaveBeenCalledWith("/api/trackers/t1");
  });

  it("rename PUTs the name payload to /api/trackers/:id/name", () => {
    trackersApi.rename("t1", { name: "Acme · UK" });
    expect(client.put).toHaveBeenCalledWith("/api/trackers/t1/name", { name: "Acme · UK" });
  });
});
