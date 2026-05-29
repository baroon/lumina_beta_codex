import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LensChipRow } from "./LensChipRow";

function Harness({
  initial = [] as string[],
  spy,
}: {
  initial?: string[];
  spy?: (next: string[]) => void;
}) {
  const [v, setV] = useState<string[]>(initial);
  return (
    <LensChipRow
      selectedCodes={v}
      onChange={(next) => {
        setV(next);
        spy?.(next);
      }}
      countsByCode={{
        Discovery: 2,
        BuyingIntent: 0,
        CompetitorComparison: 10,
        SentimentAndTrust: 5,
        CitationVisibility: 0,
        ContentGaps: 0,
      }}
    />
  );
}

describe("LensChipRow", () => {
  it("renders one chip per lens", () => {
    render(<Harness initial={[]} />);
    expect(screen.getAllByRole("button")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Discovery" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Content Gaps" })).toBeInTheDocument();
  });

  it("treats the empty-array sentinel as all selected", () => {
    render(<Harness initial={[]} />);
    for (const btn of screen.getAllByRole("button")) {
      expect(btn).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("toggling a chip off the sentinel emits the remaining five", async () => {
    const spy = vi.fn();
    render(<Harness initial={[]} spy={spy} />);
    await userEvent.click(screen.getByRole("button", { name: "Discovery" }));
    const next = spy.mock.calls[0][0] as string[];
    expect(next).toHaveLength(5);
    expect(next).not.toContain("Discovery");
  });

  it("toggling the final missing lens back on collapses to the empty sentinel", async () => {
    const spy = vi.fn();
    render(
      <Harness
        initial={[
          "BuyingIntent",
          "CompetitorComparison",
          "SentimentAndTrust",
          "CitationVisibility",
          "ContentGaps",
        ]}
        spy={spy}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Discovery" }));
    expect(spy).toHaveBeenCalledWith([]);
  });

  it("shows the per-lens mention count", () => {
    render(<Harness initial={[]} />);
    expect(screen.getByRole("button", { name: "Discovery" })).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: "Competitor Comparison" })).toHaveTextContent("10");
  });
});
