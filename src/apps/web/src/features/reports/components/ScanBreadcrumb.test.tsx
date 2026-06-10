import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ScanResultsDto } from "@/types/api";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => {
    let resolved = to;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        resolved = resolved.replace(`$${key}`, value);
      }
    }
    return <a href={resolved}>{children}</a>;
  },
}));

let resultsState: { data?: ScanResultsDto; isLoading: boolean };

vi.mock("../hooks/useScanResults", () => ({
  useScanResults: () => resultsState,
}));

import { ScanBreadcrumb } from "./ScanBreadcrumb";

function makeResults(): ScanResultsDto {
  return {
    scanRunId: "s1",
    summary: {
      trackerId: "t1",
      trackerName: "Acme · US Tracker",
      brandId: "b1",
      brandName: "Acme",
      startedAt: "2026-06-09T08:00:00Z",
      completedAt: "2026-06-09T08:05:00Z",
      scanStatus: "Completed",
      analysisStatus: "Completed",
      analysisError: null,
      scanCheckCount: 24,
      completedCount: 24,
      failedCount: 0,
      platforms: [{ platformId: "p1", code: "openai", name: "ChatGPT" }],
    },
    coreMetrics: {} as ScanResultsDto["coreMetrics"],
    breakdowns: {} as ScanResultsDto["breakdowns"],
  };
}

beforeEach(() => {
  resultsState = { data: makeResults(), isLoading: false };
});

describe("ScanBreadcrumb", () => {
  it("renders Brands › Brand › Tracker › currentLabel", () => {
    render(<ScanBreadcrumb scanRunId="s1" currentLabel="Scan Results" />);
    const nav = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(within(nav).getByText("Brands")).toBeInTheDocument();
    expect(within(nav).getByText("Acme")).toBeInTheDocument();
    expect(within(nav).getByText("Acme · US Tracker")).toBeInTheDocument();
    expect(within(nav).getByText("Scan Results")).toBeInTheDocument();
  });

  it("wires the brand link to /brands/<id>/profile", () => {
    render(<ScanBreadcrumb scanRunId="s1" currentLabel="Sources" />);
    const brandLink = screen.getByRole("link", { name: "Acme" });
    expect(brandLink).toHaveAttribute("href", "/brands/b1/profile");
  });

  it("wires the tracker link to /brands/<id>/trackers/<id>", () => {
    render(<ScanBreadcrumb scanRunId="s1" currentLabel="Topics" />);
    const trackerLink = screen.getByRole("link", { name: "Acme · US Tracker" });
    expect(trackerLink).toHaveAttribute("href", "/brands/b1/trackers/t1");
  });

  it("renders skeleton segments while the summary is loading", () => {
    resultsState = { data: undefined, isLoading: true };
    const { container } = render(<ScanBreadcrumb scanRunId="s1" currentLabel="Scan Results" />);
    // Brand and tracker labels are skeleton — 2 animate-pulse spans.
    expect(container.querySelectorAll(".animate-pulse").length).toBe(2);
    // currentLabel is always present.
    expect(screen.getByText("Scan Results")).toBeInTheDocument();
  });

  it("marks the current label as aria-current=page", () => {
    render(<ScanBreadcrumb scanRunId="s1" currentLabel="Claims" />);
    expect(screen.getByText("Claims")).toHaveAttribute("aria-current", "page");
  });
});
