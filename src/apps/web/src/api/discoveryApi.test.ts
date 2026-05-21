import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ConfirmDiscoveryRequest, RegenerateLensRequest, ResuggestRequest } from "@/types/api";

vi.mock("./apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "./apiClient";
import { discoveryApi } from "./discoveryApi";

const client = vi.mocked(apiClient);

describe("discoveryApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getResults GETs the discovery endpoint for the brand", () => {
    discoveryApi.getResults("b1");
    expect(client.get).toHaveBeenCalledWith("/api/brands/b1/discovery");
  });

  it("confirm POSTs to the confirm endpoint with the payload", () => {
    const payload = {} as ConfirmDiscoveryRequest;
    discoveryApi.confirm("b1", payload);
    expect(client.post).toHaveBeenCalledWith("/api/brands/b1/discovery/confirm", payload);
  });

  it("resuggest POSTs to the resuggest endpoint with the payload", () => {
    const payload = {} as ResuggestRequest;
    discoveryApi.resuggest("b1", payload);
    expect(client.post).toHaveBeenCalledWith("/api/brands/b1/discovery/resuggest", payload);
  });

  it("regenerateLens POSTs to the regenerate-lens endpoint with the payload", () => {
    const payload = {} as RegenerateLensRequest;
    discoveryApi.regenerateLens("b1", payload);
    expect(client.post).toHaveBeenCalledWith("/api/brands/b1/discovery/regenerate-lens", payload);
  });
});
