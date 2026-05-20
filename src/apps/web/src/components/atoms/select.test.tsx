import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./select";

// Radix UI Select uses DOM APIs that jsdom doesn't implement.
beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

function renderSelect({
  placeholder = "Pick one",
  defaultValue,
}: { placeholder?: string; defaultValue?: string } = {}) {
  return render(
    <Select defaultValue={defaultValue}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
      </SelectContent>
    </Select>,
  );
}

describe("Select", () => {
  it("renders trigger with placeholder", () => {
    renderSelect();
    expect(screen.getByRole("combobox")).toHaveTextContent("Pick one");
  });

  it("renders trigger with default value", () => {
    renderSelect({ defaultValue: "apple" });
    expect(screen.getByRole("combobox")).toHaveTextContent("Apple");
  });

  it("opens dropdown on click and shows options", async () => {
    renderSelect();
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("option", { name: "Apple" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Banana" })).toBeInTheDocument();
  });

  it("selects an option and updates trigger text", async () => {
    renderSelect();
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "Banana" }));
    expect(screen.getByRole("combobox")).toHaveTextContent("Banana");
  });

  it("renders with icon on item", () => {
    render(
      <Select defaultValue="a">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a" icon={<span data-testid="icon">*</span>}>
            Alpha
          </SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Alpha");
  });
});
