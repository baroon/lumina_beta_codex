import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("renders as a checkbox input", () => {
    render(<Checkbox aria-label="Accept terms" />);
    expect(screen.getByRole("checkbox", { name: "Accept terms" })).toBeInTheDocument();
  });

  it("renders sm size variant", () => {
    render(<Checkbox checkboxSize="sm" aria-label="Small" />);
    expect(screen.getByRole("checkbox", { name: "Small" })).toHaveClass("h-3.5", "w-3.5");
  });

  it("renders default size variant", () => {
    render(<Checkbox checkboxSize="default" aria-label="Default" />);
    expect(screen.getByRole("checkbox", { name: "Default" })).toHaveClass("h-4", "w-4");
  });

  it("renders lg size variant", () => {
    render(<Checkbox checkboxSize="lg" aria-label="Large" />);
    expect(screen.getByRole("checkbox", { name: "Large" })).toHaveClass("h-5", "w-5");
  });

  it("fires onChange handler", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox aria-label="Toggle" onChange={onChange} />);
    await user.click(screen.getByRole("checkbox", { name: "Toggle" }));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("fires onCheckedChange with boolean", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Toggle" onCheckedChange={onCheckedChange} />);
    await user.click(screen.getByRole("checkbox", { name: "Toggle" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("toggles checked state", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Toggle" />);
    const cb = screen.getByRole("checkbox", { name: "Toggle" });
    expect(cb).not.toBeChecked();
    await user.click(cb);
    expect(cb).toBeChecked();
    await user.click(cb);
    expect(cb).not.toBeChecked();
  });
});
