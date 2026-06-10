import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { AliasEditor } from "./AliasEditor";

function Controlled({ initial = [] as string[] }) {
  const [aliases, setAliases] = useState<string[]>(initial);
  return (
    <AliasEditor
      aliases={aliases}
      onChange={setAliases}
      label="Also known as"
      placeholder="Add an alias..."
    />
  );
}

describe("AliasEditor", () => {
  it("renders the label and existing aliases as chips", () => {
    render(<Controlled initial={["Photoshop", "PS"]} />);
    expect(screen.getByText("Also known as")).toBeInTheDocument();
    expect(screen.getByText("Photoshop")).toBeInTheDocument();
    expect(screen.getByText("PS")).toBeInTheDocument();
  });

  it("adds an alias on Enter", async () => {
    render(<Controlled />);
    const input = screen.getByPlaceholderText("Add an alias...");
    await userEvent.type(input, "Wikipedia{enter}");
    expect(screen.getByText("Wikipedia")).toBeInTheDocument();
  });

  it("dedups case-insensitively", async () => {
    render(<Controlled initial={["Photoshop"]} />);
    const input = screen.getByPlaceholderText("Add an alias...");
    await userEvent.type(input, "photoshop{enter}");
    // Only one chip
    expect(screen.getAllByText(/photoshop/i)).toHaveLength(1);
  });

  it("removes an alias when the chip's X is clicked", async () => {
    render(<Controlled initial={["Photoshop"]} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Photoshop" }));
    expect(screen.queryByText("Photoshop")).not.toBeInTheDocument();
  });

  it("trims whitespace before adding", async () => {
    render(<Controlled />);
    const input = screen.getByPlaceholderText("Add an alias...");
    await userEvent.type(input, "   PS   {enter}");
    expect(screen.getByText("PS")).toBeInTheDocument();
  });

  it("flushes the draft on blur", async () => {
    render(<Controlled />);
    const input = screen.getByPlaceholderText("Add an alias...");
    await userEvent.type(input, "TOI");
    await userEvent.tab(); // blur
    expect(screen.getByText("TOI")).toBeInTheDocument();
  });
});
