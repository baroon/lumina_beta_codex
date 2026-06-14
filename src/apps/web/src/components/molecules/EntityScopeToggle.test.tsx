import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EntityScopeToggle, type EntityScope } from "./EntityScopeToggle";

describe("EntityScopeToggle", () => {
  it("renders all three options", () => {
    render(<EntityScopeToggle value="all" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /all tracked brands/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tracked brands only/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /top 5 by mention count/i })).toBeInTheDocument();
  });

  it("marks the active option with aria-pressed=true", () => {
    render(<EntityScopeToggle value="tracked" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /tracked brands only/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /top 5 by mention count/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("emits the next scope when a button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(s: EntityScope) => void>();
    render(<EntityScopeToggle value="all" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /top 5 by mention count/i }));
    expect(onChange).toHaveBeenCalledWith("top5");
  });
});
