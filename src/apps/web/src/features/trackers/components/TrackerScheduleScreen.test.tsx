import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrackerScheduleScreen } from "./TrackerScheduleScreen";
import type { TrackerScheduleSetup } from "@/types/api";

const configureMutate = vi.fn();
let setupState: { data?: TrackerScheduleSetup; isLoading: boolean };

vi.mock("../hooks/useTrackerSchedule", () => ({
  useTrackerScheduleSetup: () => setupState,
  useConfigureTrackerSchedule: () => ({ mutate: configureMutate, isPending: false }),
}));

const sampleSetup: TrackerScheduleSetup = {
  trackerId: "tr1",
  trackerName: "Acme",
  cadence: "Weekly",
  activePromptCount: 10,
  platforms: [
    { id: "p1", code: "ChatGpt", name: "ChatGPT" },
    { id: "p2", code: "Gemini", name: "Gemini" },
  ],
  selectedPlatformIds: ["p1", "p2"],
};

describe("TrackerScheduleScreen", () => {
  beforeEach(() => {
    configureMutate.mockReset();
    setupState = { data: sampleSetup, isLoading: false };
  });

  it("renders platforms and the scan-check estimate", () => {
    render(<TrackerScheduleScreen trackerId="tr1" />);
    expect(screen.getByText("ChatGPT")).toBeInTheDocument();
    expect(screen.getByText("Gemini")).toBeInTheDocument();
    expect(screen.getByText(/20 scan checks/)).toBeInTheDocument();
  });

  it("activates with the selected platforms and cadence, then shows the active state", async () => {
    configureMutate.mockImplementation((_vars, opts) =>
      opts.onSuccess({ scanCheckCount: 20, cadence: "Weekly" }),
    );
    render(<TrackerScheduleScreen trackerId="tr1" />);

    await userEvent.click(screen.getByRole("button", { name: /activate tracker/i }));

    expect(configureMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        platformIds: expect.arrayContaining(["p1", "p2"]),
        cadence: "Weekly",
      }),
      expect.anything(),
    );
    expect(screen.getByText("Tracker is active")).toBeInTheDocument();
  });

  it("disables activate when no platform is selected", async () => {
    render(<TrackerScheduleScreen trackerId="tr1" />);
    const checkboxes = screen.getAllByRole("checkbox");
    await userEvent.click(checkboxes[0]);
    await userEvent.click(checkboxes[1]);

    expect(screen.getByText(/select at least one platform/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /activate tracker/i })).toBeDisabled();
  });
});
