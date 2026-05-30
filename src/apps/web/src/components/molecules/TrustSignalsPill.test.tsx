import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TrustSignalsPill } from "./TrustSignalsPill";
import type { BrandedDimensionGroupDto } from "@/types/api";

function group(brandId: string, brandName: string, items: string[]): BrandedDimensionGroupDto {
  return {
    brandId,
    brandName,
    items: items.map((name, i) => ({ id: `${brandId}-${i}`, name })),
  };
}

describe("TrustSignalsPill", () => {
  it("reads 'N trust signals' on the unique-name count", () => {
    render(
      <TrustSignalsPill
        trustSignalsByBrand={[
          group("nostri", "Nostri", ["BBB", "TRUSTe"]),
          group("gensler", "Gensler", ["ISO", "TRUSTe"]),
        ]}
      />,
    );
    // 3 unique: BBB, TRUSTe, ISO.
    expect(screen.getByRole("button", { name: /trust signals/i })).toHaveTextContent(
      "3 trust signals",
    );
  });

  it("uses the singular form when there is exactly one unique signal", () => {
    render(<TrustSignalsPill trustSignalsByBrand={[group("nostri", "Nostri", ["BBB"])]} />);
    expect(screen.getByRole("button", { name: /trust signals/i })).toHaveTextContent(
      "1 trust signal",
    );
  });

  it("is disabled when there are no trust signals", () => {
    render(<TrustSignalsPill trustSignalsByBrand={[]} />);
    expect(screen.getByRole("button", { name: /trust signals/i })).toBeDisabled();
  });

  it("opens a popover listing names grouped per brand when clicked", async () => {
    render(
      <TrustSignalsPill
        trustSignalsByBrand={[
          group("nostri", "Nostri", ["BBB Accredited"]),
          group("gensler", "Gensler", ["TRUSTe Certified"]),
        ]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /trust signals/i }));
    expect(screen.getByRole("group", { name: "Nostri" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Gensler" })).toBeInTheDocument();
    expect(screen.getByText("BBB Accredited")).toBeInTheDocument();
    expect(screen.getByText("TRUSTe Certified")).toBeInTheDocument();
  });
});
