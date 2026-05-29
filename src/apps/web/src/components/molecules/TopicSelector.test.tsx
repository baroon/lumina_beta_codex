import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TopicSelector } from "./TopicSelector";

const TOPICS = ["Career growth", "Remote work", "Salary trends"];

function Harness({
  initial = [] as string[],
  spy,
  topics = TOPICS,
}: {
  initial?: string[];
  spy?: (next: string[]) => void;
  topics?: string[];
}) {
  const [v, setV] = useState<string[]>(initial);
  return (
    <TopicSelector
      allTopicNames={topics}
      selectedNames={v}
      onChange={(next) => {
        setV(next);
        spy?.(next);
      }}
    />
  );
}

describe("TopicSelector", () => {
  it("trigger reads 'All topics' on the empty-sentinel default", () => {
    render(<Harness initial={[]} />);
    expect(screen.getByRole("button", { name: /topic selector/i })).toHaveTextContent("All topics");
  });

  it("trigger reads 'No topics' when the workspace has no topics yet", () => {
    render(<Harness topics={[]} />);
    expect(screen.getByRole("button", { name: /topic selector/i })).toHaveTextContent("No topics");
    expect(screen.getByRole("button", { name: /topic selector/i })).toBeDisabled();
  });

  it("trigger reads 'N of M topics' when partially selected", () => {
    render(<Harness initial={["Salary trends", "Remote work"]} />);
    expect(screen.getByRole("button", { name: /topic selector/i })).toHaveTextContent(
      "2 of 3 topics",
    );
  });

  it("toggling a topic off the sentinel emits the remaining names", async () => {
    const spy = vi.fn();
    render(<Harness initial={[]} spy={spy} />);
    await userEvent.click(screen.getByRole("button", { name: /topic selector/i }));
    await userEvent.click(screen.getByLabelText("Salary trends"));
    const next = spy.mock.calls[0][0] as string[];
    expect(next).toHaveLength(2);
    expect(next).not.toContain("Salary trends");
  });

  it("substring search filters the rendered options", async () => {
    render(<Harness initial={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /topic selector/i }));
    await userEvent.type(screen.getByPlaceholderText(/search topics/i), "remote");
    expect(screen.getByText("Remote work")).toBeInTheDocument();
    expect(screen.queryByText("Salary trends")).not.toBeInTheDocument();
  });

  it("closes when clicking outside the popover", async () => {
    render(
      <div>
        <Harness initial={[]} />
        <button data-testid="outside">outside</button>
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: /topic selector/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
