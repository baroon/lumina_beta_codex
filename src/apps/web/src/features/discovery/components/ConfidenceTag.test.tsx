import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ConfidenceTag } from "./ConfidenceTag";
import { CONFIDENCE_THRESHOLDS } from "../confidence";

describe("ConfidenceTag", () => {
  it('renders "High" at exactly the high threshold', () => {
    render(<ConfidenceTag confidence={CONFIDENCE_THRESHOLDS.high} />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it('renders "High" above the high threshold', () => {
    render(<ConfidenceTag confidence={0.9} />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it('renders "Medium" just below the high threshold', () => {
    render(<ConfidenceTag confidence={0.69} />);
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it('renders "Medium" at exactly the medium threshold', () => {
    render(<ConfidenceTag confidence={CONFIDENCE_THRESHOLDS.medium} />);
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it('renders "Low" below the medium threshold', () => {
    render(<ConfidenceTag confidence={0.2} />);
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("uses the same threshold for display as preselection", () => {
    // At exactly the high threshold, the tag should show "High"
    // which means the item would also be preselected
    const { rerender } = render(<ConfidenceTag confidence={CONFIDENCE_THRESHOLDS.high} />);
    expect(screen.getByText("High")).toBeInTheDocument();

    // Just below the threshold, the tag should NOT show "High"
    // which means the item would NOT be preselected
    rerender(<ConfidenceTag confidence={CONFIDENCE_THRESHOLDS.high - 0.01} />);
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("renders a confidence icon alongside the label", () => {
    const { container } = render(<ConfidenceTag confidence={0.9} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
