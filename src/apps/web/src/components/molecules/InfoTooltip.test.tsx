import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { InfoTooltip } from "./InfoTooltip";

describe("InfoTooltip", () => {
  it("renders a focusable trigger with the right aria-label", () => {
    render(<InfoTooltip label="Mention rate" />);
    const trigger = screen.getByRole("button", { name: "About Mention rate" });
    expect(trigger).toBeInTheDocument();
    expect(trigger.tagName).toBe("SPAN");
    expect(trigger).toHaveAttribute("tabindex", "0");
  });

  it("does not bubble click events to a parent button (avoids double-firing)", async () => {
    const parentClick = vi.fn();
    const userEvent = (await import("@testing-library/user-event")).default;
    render(
      <button type="button" onClick={parentClick}>
        Parent
        <InfoTooltip label="Stuff" />
      </button>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "About Stuff" }));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
