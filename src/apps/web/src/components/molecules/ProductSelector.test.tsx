import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductSelector } from "./ProductSelector";
import type { BrandedDimensionGroupDto } from "@/types/api";

function group(brandId: string, brandName: string, items: string[]): BrandedDimensionGroupDto {
  return {
    brandId,
    brandName,
    items: items.map((name, i) => ({ id: `${brandId}-${i}`, name })),
  };
}

const DEFAULT_GROUPS: BrandedDimensionGroupDto[] = [
  group("nostri", "Nostri", ["Indeed Free", "Indeed Premium"]),
  group("gensler", "Gensler", ["Resume Builder"]),
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
    <ProductSelector
      productsByBrand={groups}
      selectedNames={v}
      onChange={(next) => {
        setV(next);
        spy?.(next);
      }}
    />
  );
}

describe("ProductSelector", () => {
  it("trigger reads 'N products' on the empty-sentinel default", () => {
    render(<Harness initial={[]} />);
    expect(screen.getByRole("button", { name: /product selector/i })).toHaveTextContent(
      "3 products",
    );
  });

  it("trigger reads 'No products' when the workspace has no products", () => {
    render(<Harness groups={[]} />);
    expect(screen.getByRole("button", { name: /product selector/i })).toBeDisabled();
  });

  it("renders sections per brand", async () => {
    render(<Harness initial={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /product selector/i }));
    expect(screen.getByRole("group", { name: "Nostri" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Gensler" })).toBeInTheDocument();
  });

  it("toggling a product off the sentinel emits the remaining names", async () => {
    const spy = vi.fn();
    render(<Harness initial={[]} spy={spy} />);
    await userEvent.click(screen.getByRole("button", { name: /product selector/i }));
    await userEvent.click(screen.getByLabelText("Indeed Premium"));
    const next = spy.mock.calls[0][0] as string[];
    expect(next).toHaveLength(2);
    expect(next).not.toContain("Indeed Premium");
  });

  it("substring search filters options and hides empty sections", async () => {
    render(<Harness initial={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /product selector/i }));
    await userEvent.type(screen.getByPlaceholderText(/search products/i), "premium");
    expect(screen.getByText("Indeed Premium")).toBeInTheDocument();
    expect(screen.queryByText("Resume Builder")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Gensler" })).not.toBeInTheDocument();
  });
});
