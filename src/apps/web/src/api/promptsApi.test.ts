import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
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

  it("generate includes filters in the query string", () => {
    promptsApi.generate("t1", { visibilityLensId: "c1", topicId: "tp1" });
    expect(client.post).toHaveBeenCalledWith(
      "/api/trackers/t1/prompts/generate?visibilityLensId=c1&topicId=tp1",
    );
  });

  it("confirm posts to the confirm endpoint", () => {
    promptsApi.confirm("t1");
    expect(client.post).toHaveBeenCalledWith("/api/trackers/t1/prompts/confirm");
  });

  it("addCustom posts the prompt body", () => {
    promptsApi.addCustom("t1", { text: "Q", visibilityLensId: "c1", primaryTopicId: null });
    expect(client.post).toHaveBeenCalledWith("/api/trackers/t1/prompts", {
      text: "Q",
      visibilityLensId: "c1",
      primaryTopicId: null,
    });
  });

  it("update puts the prompt text", () => {
    promptsApi.update("t1", "p1", { text: "Edited" });
    expect(client.put).toHaveBeenCalledWith("/api/trackers/t1/prompts/p1", { text: "Edited" });
  });

  it("remove deletes the prompt", () => {
    promptsApi.remove("t1", "p1");
    expect(client.delete).toHaveBeenCalledWith("/api/trackers/t1/prompts/p1");
  });
});
