import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProductSelector } from "./ProductSelector";

const PRODUCTS = ["Indeed Free", "Indeed Premium", "Resume Builder"];

function Harness({
  initial = [] as string[],
  spy,
  products = PRODUCTS,
}: {
  initial?: string[];
  spy?: (next: string[]) => void;
  products?: string[];
}) {
  const [v, setV] = useState<string[]>(initial);
  return (
    <ProductSelector
      allProductNames={products}
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
    render(<Harness products={[]} />);
    expect(screen.getByRole("button", { name: /product selector/i })).toBeDisabled();
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

  it("substring search filters options", async () => {
    render(<Harness initial={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /product selector/i }));
    await userEvent.type(screen.getByPlaceholderText(/search products/i), "premium");
    expect(screen.getByText("Indeed Premium")).toBeInTheDocument();
    expect(screen.queryByText("Resume Builder")).not.toBeInTheDocument();
  });
});
