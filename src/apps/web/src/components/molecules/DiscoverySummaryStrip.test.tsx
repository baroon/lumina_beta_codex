import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DiscoverySummaryStrip } from "./DiscoverySummaryStrip";

const dim = (names: string[]) => names.map((n, i) => ({ id: `${n}-${i}`, name: n }));

describe("DiscoverySummaryStrip", () => {
  it("renders nothing when every dimension is empty", () => {
    const { container } = render(
      <DiscoverySummaryStrip
        products={[]}
        markets={[]}
        audiences={[]}
        topics={[]}
        trustSignals={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders one chip per dimension with the singular form when count is 1", () => {
    render(
      <DiscoverySummaryStrip
        products={dim(["A"])}
        markets={dim(["US"])}
        audiences={dim(["X"])}
        topics={dim(["T"])}
        trustSignals={dim(["S"])}
      />,
    );
    expect(screen.getByRole("button", { name: "1 product" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 market" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 audience" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 topic" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 trust signal" })).toBeInTheDocument();
  });

  it("uses the plural form when count > 1", () => {
    render(
      <DiscoverySummaryStrip
        products={dim(["A", "B", "C"])}
        markets={[]}
        audiences={[]}
        topics={[]}
        trustSignals={[]}
      />,
    );
    expect(screen.getByRole("button", { name: "3 products" })).toBeInTheDocument();
  });

  it("opens the popover with the names when the user clicks a non-empty chip", async () => {
    render(
      <DiscoverySummaryStrip
        products={dim(["Indeed Premium", "Resume Builder"])}
        markets={[]}
        audiences={[]}
        topics={[]}
        trustSignals={[]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "2 products" }));
    expect(screen.getByText("Indeed Premium")).toBeInTheDocument();
    expect(screen.getByText("Resume Builder")).toBeInTheDocument();
  });

  it("disables chips for empty dimensions (no popover)", () => {
    render(
      <DiscoverySummaryStrip
        products={dim(["A"])}
        markets={[]}
        audiences={[]}
        topics={[]}
        trustSignals={[]}
      />,
    );
    const emptyChip = screen.getByRole("button", { name: "0 markets" });
    expect(emptyChip).toBeDisabled();
  });
});
