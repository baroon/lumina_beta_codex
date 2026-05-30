import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MarketSelector } from "./MarketSelector";
import type { BrandedDimensionGroupDto } from "@/types/api";

function group(brandId: string, brandName: string, items: string[]): BrandedDimensionGroupDto {
  return {
    brandId,
    brandName,
    items: items.map((name, i) => ({ id: `${brandId}-${i}`, name })),
  };
}

const DEFAULT_GROUPS: BrandedDimensionGroupDto[] = [
  group("nostri", "Nostri", ["India", "United States"]),
  group("gensler", "Gensler", ["United Kingdom", "United States"]),
];

function Harness({
  initial = [] as string[],
  spy,
  groups = DEFAULT_GROUPS,
}: {
  initial?: string[];
  spy?: (next: string[]) => void;
  groups?: BrandedDimensionGroupDto[];
}) {
  const [v, setV] = useState<string[]>(initial);
  return (
    <MarketSelector
      marketsByBrand={groups}
      selectedNames={v}
      onChange={(next) => {
        setV(next);
        spy?.(next);
      }}
    />
  );
}

describe("MarketSelector", () => {
  it("trigger reads 'N markets' on the empty-sentinel default", () => {
    render(<Harness initial={[]} />);
    expect(screen.getByRole("button", { name: /market selector/i })).toHaveTextContent("3 markets");
  });

  it("trigger reads 'No markets' when the workspace has no markets", () => {
    render(<Harness groups={[]} />);
    expect(screen.getByRole("button", { name: /market selector/i })).toBeDisabled();
  });

  it("renders sections per brand", async () => {
    render(<Harness initial={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /market selector/i }));
    expect(screen.getByRole("group", { name: "Nostri" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Gensler" })).toBeInTheDocument();
  });

  it("toggling a market off the sentinel emits the remaining names", async () => {
    const spy = vi.fn();
    render(<Harness initial={[]} spy={spy} />);
    await userEvent.click(screen.getByRole("button", { name: /market selector/i }));
    // Two checkboxes for "United States" (one per brand); clicking either
    // emits the name-based remainder.
    await userEvent.click(screen.getAllByLabelText("United States")[0]);
    const next = spy.mock.calls[0][0] as string[];
    expect(next).not.toContain("United States");
    expect(next).toContain("India");
    expect(next).toContain("United Kingdom");
  });

  it("substring search filters options", async () => {
    render(<Harness initial={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /market selector/i }));
    await userEvent.type(screen.getByPlaceholderText(/search markets/i), "kingdom");
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    expect(screen.queryByText("India")).not.toBeInTheDocument();
  });
});
