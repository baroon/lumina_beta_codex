import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

import { apiClient } from "./apiClient";
import { promptsApi } from "./promptsApi";

const client = vi.mocked(apiClient);

describe("promptsApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("list calls the prompts endpoint", () => {
    promptsApi.list("t1");
    expect(client.get).toHaveBeenCalledWith("/api/trackers/t1/prompts");
  });

  it("generate posts to the generate endpoint", () => {
    promptsApi.generate("t1");
    expect(client.post).toHaveBeenCalledWith("/api/trackers/t1/prompts/generate");
  });

  it("confirm posts to the confirm endpoint", () => {
    promptsApi.confirm("t1");
    expect(client.post).toHaveBeenCalledWith("/api/trackers/t1/prompts/confirm");
  });

  it("remove deletes the prompt", () => {
    promptsApi.remove("t1", "p1");
    expect(client.delete).toHaveBeenCalledWith("/api/trackers/t1/prompts/p1");
  });
});
