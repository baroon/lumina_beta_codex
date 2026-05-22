import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReadyToCreateTrackerScreen } from "./ReadyToCreateTrackerScreen";
import type { TrackerSetupPreview } from "@/types/api";

const preview: TrackerSetupPreview = {
  brandId: "b1",
  brandName: "Acme",
  suggestedName: "United States SaaS Visibility Tracker",
  marketName: "United States",
  category: "SaaS",
  topicCount: 3,
  competitorCount: 2,
  productCount: 4,
  audienceCount: 1,
  marketCount: 1,
  visibilityCheckCount: 6,
  promptAllocation: 30,
};

const mutate = vi.fn();
let previewState: { data?: TrackerSetupPreview; isLoading: boolean };
let createState: { mutate: typeof mutate; isPending: boolean };

vi.mock("../hooks/useTrackers", () => ({
  useTrackerSetupPreview: () => previewState,
  useCreateTracker: () => createState,
}));

describe("ReadyToCreateTrackerScreen", () => {
  beforeEach(() => {
    mutate.mockReset();
    previewState = { data: preview, isLoading: false };
    createState = { mutate, isPending: false };
  });

  it("shows the suggested name and coverage summary", () => {
    render(<ReadyToCreateTrackerScreen brandId="b1" />);
    expect(screen.getByDisplayValue("United States SaaS Visibility Tracker")).toBeInTheDocument();
    expect(screen.getByText("Topics")).toBeInTheDocument();
    expect(screen.getByText("Visibility Checks")).toBeInTheDocument();
  });

  it("creates the tracker with the edited name", async () => {
    render(<ReadyToCreateTrackerScreen brandId="b1" />);

    const input = screen.getByDisplayValue("United States SaaS Visibility Tracker");
    await userEvent.clear(input);
    await userEvent.type(input, "My Tracker");
    await userEvent.click(screen.getByRole("button", { name: /create visibility tracker/i }));

    expect(mutate).toHaveBeenCalledWith({ name: "My Tracker" }, expect.anything());
  });
});
