import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateGranularityToggle } from "./DateGranularityToggle";

describe("DateGranularityToggle", () => {
  it("renders three single-letter options (D / W / M)", () => {
    render(<DateGranularityToggle value="day" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "D" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "W" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "M" })).toBeInTheDocument();
  });

  it("marks the active option pressed", () => {
    render(<DateGranularityToggle value="week" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "W" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "D" })).toHaveAttribute("aria-pressed", "false");
  });

  it("emits the new value when the user clicks a different option", async () => {
    const onChange = vi.fn();
    render(<DateGranularityToggle value="day" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "M" }));
    expect(onChange).toHaveBeenCalledWith("month");
  });
});
