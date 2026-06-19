import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ScanStatus } from "@/types/api";
import { ScanProgressPanel } from "./ScanProgressPanel";

describe("ScanProgressPanel", () => {
  it("renders progress, counters, and platform status", () => {
    render(<ScanProgressPanel scan={scanStatus()} isStarting={false} isError={false} />);

    expect(screen.getByText("12 of 24 checks finished")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("Mentions")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();

    const platform = screen.getByText("Perplexity").closest("li");
    expect(platform).not.toBeNull();
    expect(within(platform as HTMLElement).getByText("Failed")).toBeInTheDocument();
    expect(
      within(platform as HTMLElement).getByText("4 of 12 checks finished, 2 failed"),
    ).toBeInTheDocument();
  });

  it("renders a preparation state before scan status arrives", () => {
    render(<ScanProgressPanel scan={undefined} isStarting isError={false} />);

    expect(screen.getByText("Preparing checks")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders an error alert", () => {
    render(<ScanProgressPanel scan={undefined} isStarting={false} isError />);

    expect(screen.getByRole("alert")).toHaveTextContent(/Could not start or refresh/i);
    expect(screen.getByText("Waiting for scan status")).toBeInTheDocument();
  });
});

function scanStatus(): ScanStatus {
  return {
    scanRunId: "s2",
    status: "Running",
    triggerType: "Manual",
    scanCheckCount: 24,
    completedCount: 10,
    failedCount: 2,
    startedAt: "2026-06-09T09:00:00Z",
    completedAt: null,
    brandName: "Acme",
    platforms: [
      {
        platformId: "p1",
        code: "openai",
        name: "ChatGPT",
        completed: 8,
        failed: 0,
        total: 12,
        status: "Running",
      },
      {
        platformId: "p2",
        code: "perplexity",
        name: "Perplexity",
        completed: 2,
        failed: 2,
        total: 12,
        status: "Failed",
      },
    ],
    liveCounters: {
      mentions: 6,
      citations: 4,
      recommended: 3,
      sentiment: {
        positive: 2,
        neutral: 3,
        negative: 1,
        mixed: 0,
        unknown: 0,
      },
    },
  };
}
