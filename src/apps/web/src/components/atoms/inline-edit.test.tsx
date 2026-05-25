import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InlineEdit } from "./inline-edit";

describe("InlineEdit", () => {
  it("renders value as text in view mode", () => {
    render(<InlineEdit value="Hello" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Hello/ })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows placeholder when value is empty", () => {
    render(<InlineEdit value="" onChange={() => {}} placeholder="Click to edit" />);
    expect(screen.getByRole("button", { name: /Click to edit/ })).toBeInTheDocument();
  });

  it("enters edit mode on click", async () => {
    render(<InlineEdit value="Hello" onChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /Hello/ }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("Hello");
  });

  it("commits new value on Enter", async () => {
    const onChange = vi.fn();
    render(<InlineEdit value="Hello" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Hello/ }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "World{Enter}");
    expect(onChange).toHaveBeenCalledWith("World");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("reverts on Escape", async () => {
    const onChange = vi.fn();
    render(<InlineEdit value="Hello" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Hello/ }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "World{Escape}");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hello/ })).toBeInTheDocument();
  });

  it("commits value on blur", async () => {
    const onChange = vi.fn();
    render(<InlineEdit value="Hello" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Hello/ }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "World");
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith("World");
  });

  it("does not call onChange when value is unchanged", async () => {
    const onChange = vi.fn();
    render(<InlineEdit value="Hello" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Hello/ }));
    await userEvent.keyboard("{Enter}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders a textarea and commits on blur in multiline mode", async () => {
    const onChange = vi.fn();
    render(<InlineEdit value="Line one" onChange={onChange} multiline />);
    await userEvent.click(screen.getByRole("button", { name: /Line one/ }));
    const textarea = screen.getByRole("textbox");
    expect(textarea.tagName).toBe("TEXTAREA");
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "New text");
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith("New text");
  });

  it("treats Enter as a newline (no commit) in multiline mode", async () => {
    const onChange = vi.fn();
    render(<InlineEdit value="A" onChange={onChange} multiline />);
    await userEvent.click(screen.getByRole("button", { name: /A/ }));
    await userEvent.type(screen.getByRole("textbox"), "{Enter}B");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
