import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiscoveryStepProgress } from "./DiscoveryStepProgress";

describe("DiscoveryStepProgress", () => {
  it("lists all discovery steps", () => {
    render(<DiscoveryStepProgress step={1} totalSteps={5} />);
    expect(screen.getByText("Crawling website")).toBeInTheDocument();
    expect(screen.getByText("Finding competitors")).toBeInTheDocument();
  });

  it("shows the encouragement message for the active step", () => {
    render(<DiscoveryStepProgress step={2} totalSteps={5} />);
    expect(screen.getByText(/studying your brand identity/i)).toBeInTheDocument();
  });

  it("computes percent from completed steps (step 3 of 5 → 40%)", () => {
    render(<DiscoveryStepProgress step={3} totalSteps={5} />);
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("marks earlier steps as done", () => {
    render(<DiscoveryStepProgress step={3} totalSteps={5} />);
    expect(screen.getAllByText("Done").length).toBeGreaterThanOrEqual(2);
  });

  it("falls back to the default encouragement for an out-of-range step", () => {
    render(<DiscoveryStepProgress step={99} totalSteps={5} />);
    expect(screen.getByText("Working on it...")).toBeInTheDocument();
  });
});
