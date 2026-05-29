import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TrustSignalsPill } from "./TrustSignalsPill";

describe("TrustSignalsPill", () => {
  it("reads 'N trust signals' when populated", () => {
    render(<TrustSignalsPill allNames={["BBB", "TRUSTe", "ISO"]} />);
    expect(screen.getByRole("button", { name: /trust signals/i })).toHaveTextContent(
      "3 trust signals",
    );
  });

  it("uses the singular form when there is exactly one", () => {
    render(<TrustSignalsPill allNames={["BBB"]} />);
    expect(screen.getByRole("button", { name: /trust signals/i })).toHaveTextContent(
      "1 trust signal",
    );
  });

  it("is disabled when there are no trust signals", () => {
    render(<TrustSignalsPill allNames={[]} />);
    expect(screen.getByRole("button", { name: /trust signals/i })).toBeDisabled();
  });

  it("opens a popover listing the names when clicked", async () => {
    render(<TrustSignalsPill allNames={["BBB Accredited", "TRUSTe Certified"]} />);
    await userEvent.click(screen.getByRole("button", { name: /trust signals/i }));
    expect(screen.getByText("BBB Accredited")).toBeInTheDocument();
    expect(screen.getByText("TRUSTe Certified")).toBeInTheDocument();
  });
});
