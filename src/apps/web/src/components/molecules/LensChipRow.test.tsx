import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LensChipRow } from "./LensChipRow";

const ALL_CODES = [
  "Discovery",
  "BuyingIntent",
  "CompetitorComparison",
  "SentimentAndTrust",
  "CitationVisibility",
  "ContentGaps",
];

const COUNTS = {
  Discovery: 2,
  BuyingIntent: 0,
  CompetitorComparison: 10,
  SentimentAndTrust: 5,
  CitationVisibility: 0,
  ContentGaps: 0,
};

describe("LensChipRow", () => {
  it("renders one chip per lens", () => {
    render(<LensChipRow selectedCodes={ALL_CODES} onChange={vi.fn()} countsByCode={COUNTS} />);
    expect(screen.getAllByRole("button")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Discovery" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Content Gaps" })).toBeInTheDocument();
  });

  it("presses every chip when all six are selected", () => {
    render(<LensChipRow selectedCodes={ALL_CODES} onChange={vi.fn()} />);
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("presses only the selected chip when a single lens is in the selection", () => {
    render(<LensChipRow selectedCodes={["SentimentAndTrust"]} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Sentiment & Trust" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Discovery" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("narrows the selection to a single lens when clicked from the all-selected state", async () => {
    const onChange = vi.fn();
    render(<LensChipRow selectedCodes={ALL_CODES} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Citation Visibility" }));
    expect(onChange).toHaveBeenCalledWith(["CitationVisibility"]);
  });

  it("toggles back to all-selected when the only selected chip is clicked again", async () => {
    const onChange = vi.fn();
    render(<LensChipRow selectedCodes={["BuyingIntent"]} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Buying Intent" }));
    expect(onChange).toHaveBeenCalledWith(ALL_CODES);
  });

  it("calls onActivate with the clicked lens code in addition to onChange", async () => {
    const onChange = vi.fn();
    const onActivate = vi.fn();
    render(<LensChipRow selectedCodes={ALL_CODES} onChange={onChange} onActivate={onActivate} />);
    await userEvent.click(screen.getByRole("button", { name: "Discovery" }));
    expect(onActivate).toHaveBeenCalledWith("Discovery");
  });

  it("shows the per-lens mention count badge", () => {
    render(<LensChipRow selectedCodes={ALL_CODES} onChange={vi.fn()} countsByCode={COUNTS} />);
    expect(screen.getByRole("button", { name: "Discovery" })).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: "Competitor Comparison" })).toHaveTextContent("10");
  });
});
