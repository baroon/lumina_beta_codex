import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MarketSelector } from "./MarketSelector";

const MARKETS = ["India", "United Kingdom", "United States"];

function Harness({
  initial = [] as string[],
  spy,
  markets = MARKETS,
}: {
  initial?: string[];
  spy?: (next: string[]) => void;
  markets?: string[];
}) {
  const [v, setV] = useState<string[]>(initial);
  return (
    <MarketSelector
      allMarketNames={markets}
      selectedNames={v}
      onChange={(next) => {
        setV(next);
        spy?.(next);
      }}
    />
  );
}

describe("MarketSelector", () => {
  it("trigger reads 'All markets' on the empty-sentinel default", () => {
    render(<Harness initial={[]} />);
    expect(screen.getByRole("button", { name: /market selector/i })).toHaveTextContent(
      "All markets",
    );
  });

  it("trigger reads 'No markets' when the workspace has no markets", () => {
    render(<Harness markets={[]} />);
    expect(screen.getByRole("button", { name: /market selector/i })).toBeDisabled();
  });

  it("toggling a market off the sentinel emits the remaining names", async () => {
    const spy = vi.fn();
    render(<Harness initial={[]} spy={spy} />);
    await userEvent.click(screen.getByRole("button", { name: /market selector/i }));
    await userEvent.click(screen.getByLabelText("United States"));
    const next = spy.mock.calls[0][0] as string[];
    expect(next).toHaveLength(2);
    expect(next).not.toContain("United States");
  });

  it("substring search filters options", async () => {
    render(<Harness initial={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /market selector/i }));
    await userEvent.type(screen.getByPlaceholderText(/search markets/i), "kingdom");
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    expect(screen.queryByText("India")).not.toBeInTheDocument();
  });
});
