import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TrackerScheduleScreen } from "./TrackerScheduleScreen";
import type { TrackerScheduleSetup } from "@/types/api";

const configureMutate = vi.fn();
const runScanMutate = vi.fn();
let setupState: { data?: TrackerScheduleSetup; isLoading: boolean };

vi.mock("../hooks/useTrackerSchedule", () => ({
  useTrackerScheduleSetup: () => setupState,
  useConfigureTrackerSchedule: () => ({ mutate: configureMutate, isPending: false }),
}));

vi.mock("../hooks/useScans", () => ({
  useRunScan: () => ({ mutate: runScanMutate, isPending: false }),
}));

vi.mock("./ScanProgressScreen", () => ({
  ScanProgressScreen: () => <div data-testid="scan-progress" />,
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
    runScanMutate.mockReset();
    setupState = { data: sampleSetup, isLoading: false };
  });

  it("renders platforms and the scan-check estimate", () => {
    render(<TrackerScheduleScreen trackerId="tr1" />);
    expect(screen.getByText("ChatGPT")).toBeInTheDocument();
    expect(screen.getByText("Gemini")).toBeInTheDocument();
    expect(screen.getByText(/20 scan checks/)).toBeInTheDocument();
  });

  it("activates, runs the first scan, and shows scan progress", async () => {
    configureMutate.mockImplementation((_vars, opts) => opts.onSuccess());
    runScanMutate.mockImplementation((_vars, opts) =>
      opts.onSuccess({ scanRunId: "s1", scanCheckCount: 20 }),
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
    expect(runScanMutate).toHaveBeenCalled();
    expect(screen.getByTestId("scan-progress")).toBeInTheDocument();
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
