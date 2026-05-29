import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AudienceSelector } from "./AudienceSelector";

const AUDIENCES = ["Hiring managers", "Job seekers", "Recruiters"];

function Harness({
  initial = [] as string[],
  spy,
  audiences = AUDIENCES,
}: {
  initial?: string[];
  spy?: (next: string[]) => void;
  audiences?: string[];
}) {
  const [v, setV] = useState<string[]>(initial);
  return (
    <AudienceSelector
      allAudienceNames={audiences}
      selectedNames={v}
      onChange={(next) => {
        setV(next);
        spy?.(next);
      }}
    />
  );
}

describe("AudienceSelector", () => {
  it("trigger reads 'N audiences' on the empty-sentinel default", () => {
    render(<Harness initial={[]} />);
    expect(screen.getByRole("button", { name: /audience selector/i })).toHaveTextContent(
      "3 audiences",
    );
  });

  it("trigger reads 'No audiences' and is disabled when the workspace has none", () => {
    render(<Harness audiences={[]} />);
    expect(screen.getByRole("button", { name: /audience selector/i })).toBeDisabled();
  });

  it("toggling an audience off the sentinel emits the remaining names", async () => {
    const spy = vi.fn();
    render(<Harness initial={[]} spy={spy} />);
    await userEvent.click(screen.getByRole("button", { name: /audience selector/i }));
    await userEvent.click(screen.getByLabelText("Job seekers"));
    const next = spy.mock.calls[0][0] as string[];
    expect(next).toHaveLength(2);
    expect(next).not.toContain("Job seekers");
  });
});
