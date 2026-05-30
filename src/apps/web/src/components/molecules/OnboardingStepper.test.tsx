import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OnboardingStepper } from "./OnboardingStepper";

describe("OnboardingStepper", () => {
  it("renders one dot per step and marks the current one", () => {
    render(<OnboardingStepper currentStep={3} totalSteps={5} />);
    const list = screen.getByRole("list", { name: /step 3 of 5/i });
    expect(list).toBeInTheDocument();
    const items = list.querySelectorAll("li");
    expect(items).toHaveLength(5);
    expect(items[2]).toHaveAttribute("aria-current", "step");
  });

  it("uses a custom aria-label when provided", () => {
    render(<OnboardingStepper currentStep={1} totalSteps={3} ariaLabel="Setup progress" />);
    expect(screen.getByRole("list", { name: "Setup progress" })).toBeInTheDocument();
  });
});
