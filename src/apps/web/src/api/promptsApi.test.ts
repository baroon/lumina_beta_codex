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
    promptsApi.generate("t1", { lensId: "c1", topicId: "tp1" });
    expect(client.post).toHaveBeenCalledWith(
      "/api/trackers/t1/prompts/generate?lensId=c1&topicId=tp1",
    );
  });

  it("confirm posts to the confirm endpoint", () => {
    promptsApi.confirm("t1");
    expect(client.post).toHaveBeenCalledWith("/api/trackers/t1/prompts/confirm");
  });

  it("addCustom posts the prompt body", () => {
    promptsApi.addCustom("t1", { text: "Q", lensId: "c1", primaryTopicId: null });
    expect(client.post).toHaveBeenCalledWith("/api/trackers/t1/prompts", {
      text: "Q",
      lensId: "c1",
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

  it("answerHistory hits the per-prompt endpoint with serialized window bounds", () => {
    promptsApi.answerHistory("p1", {
      from: new Date("2026-05-09T00:00:00Z"),
      to: new Date("2026-06-09T00:00:00Z"),
    });
    expect(client.get).toHaveBeenCalledWith(
      "/api/prompts/p1/answers?from=2026-05-09T00%3A00%3A00.000Z&to=2026-06-09T00%3A00%3A00.000Z",
    );
  });

  it("answerHistory omits the query string when the range is fully open", () => {
    promptsApi.answerHistory("p1", { from: null, to: null });
    expect(client.get).toHaveBeenCalledWith("/api/prompts/p1/answers");
  });
});
