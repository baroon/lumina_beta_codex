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

async function openEditor() {
  await userEvent.click(screen.getByRole("button", { name: /add also known as/i }));
}

describe("AliasEditor", () => {
  it("renders the label and existing aliases as chips", () => {
    render(<Controlled initial={["Photoshop", "PS"]} />);
    expect(screen.getByText("Also known as")).toBeInTheDocument();
    expect(screen.getByText("Photoshop")).toBeInTheDocument();
    expect(screen.getByText("PS")).toBeInTheDocument();
  });

  it("hides the input behind a + button by default", () => {
    render(<Controlled />);
    expect(screen.getByRole("button", { name: /add also known as/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Add an alias...")).not.toBeInTheDocument();
  });

  it("clicking + reveals the input", async () => {
    render(<Controlled />);
    await openEditor();
    expect(screen.getByPlaceholderText("Add an alias...")).toBeInTheDocument();
  });

  it("adds an alias on Enter and keeps the input open for more", async () => {
    render(<Controlled />);
    await openEditor();
    const input = screen.getByPlaceholderText("Add an alias...");
    await userEvent.type(input, "Wikipedia{enter}");
    expect(screen.getByText("Wikipedia")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Add an alias...")).toBeInTheDocument();
  });

  it("dedups case-insensitively", async () => {
    render(<Controlled initial={["Photoshop"]} />);
    await openEditor();
    const input = screen.getByPlaceholderText("Add an alias...");
    await userEvent.type(input, "photoshop{enter}");
    expect(screen.getAllByText(/photoshop/i)).toHaveLength(1);
  });

  it("removes an alias when the chip's X is clicked", async () => {
    render(<Controlled initial={["Photoshop"]} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Photoshop" }));
    expect(screen.queryByText("Photoshop")).not.toBeInTheDocument();
  });

  it("trims whitespace before adding", async () => {
    render(<Controlled />);
    await openEditor();
    const input = screen.getByPlaceholderText("Add an alias...");
    await userEvent.type(input, "   PS   {enter}");
    expect(screen.getByText("PS")).toBeInTheDocument();
  });

  it("blurring with empty draft collapses back to the + button", async () => {
    render(<Controlled />);
    await openEditor();
    expect(screen.getByPlaceholderText("Add an alias...")).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.queryByPlaceholderText("Add an alias...")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add also known as/i })).toBeInTheDocument();
  });

  it("Escape clears the draft and collapses back to the + button", async () => {
    render(<Controlled />);
    await openEditor();
    const input = screen.getByPlaceholderText("Add an alias...");
    await userEvent.type(input, "draft text{escape}");
    expect(screen.queryByPlaceholderText("Add an alias...")).not.toBeInTheDocument();
    expect(screen.queryByText("draft text")).not.toBeInTheDocument();
  });
});
