import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScanProgressScreen } from "./ScanProgressScreen";
import type { ScanStatus } from "@/types/api";

let scanState: { data?: ScanStatus };

vi.mock("../hooks/useScans", () => ({
  useLatestScan: () => scanState,
}));

// The success-state CTA renders a tanstack-router <Link/>; mock it to a
// plain anchor so the tests don't need a real RouterProvider.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: { to: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

function status(overrides: Partial<ScanStatus>): ScanStatus {
  return {
    scanRunId: "s1",
    status: "Running",
    triggerType: "Manual",
    scanCheckCount: 4,
    completedCount: 0,
    failedCount: 0,
    startedAt: "2026-05-25T00:00:00Z",
    completedAt: null,
    ...overrides,
  };
}

describe("ScanProgressScreen", () => {
  beforeEach(() => {
    scanState = { data: status({ status: "Running", completedCount: 1 }) };
  });

  it("shows running progress", () => {
    render(<ScanProgressScreen trackerId="t1" />);
    expect(screen.getByText(/running your prompts/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 4 scan checks complete/i)).toBeInTheDocument();
  });

  it("shows the completed state with the answer count + Open overview CTA", () => {
    scanState = { data: status({ status: "Completed", completedCount: 4 }) };
    render(<ScanProgressScreen trackerId="t1" />);
    expect(screen.getByText("First scan complete")).toBeInTheDocument();
    expect(screen.getByText(/4 answers collected/i)).toBeInTheDocument();
    const overviewLink = screen.getByRole("link", { name: /open overview/i });
    expect(overviewLink).toHaveAttribute("href", "/overview");
  });

  it("notes failures when some checks could not be reached", () => {
    scanState = { data: status({ status: "Completed", completedCount: 2, failedCount: 2 }) };
    render(<ScanProgressScreen trackerId="t1" />);
    expect(screen.getByText(/2 answers collected/i)).toBeInTheDocument();
    expect(screen.getByText(/couldn’t be reached/i)).toBeInTheDocument();
  });
});
