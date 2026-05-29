import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LensSelector } from "./LensSelector";

function Harness({
  initial = [] as string[],
  onChangeSpy,
}: {
  initial?: string[];
  onChangeSpy?: (next: string[]) => void;
}) {
  const [v, setV] = useState<string[]>(initial);
  return (
    <LensSelector
      selectedCodes={v}
      onChange={(next) => {
        setV(next);
        onChangeSpy?.(next);
      }}
    />
  );
}

describe("LensSelector", () => {
  it("trigger reads 'All lenses' when the selection is empty (default sentinel)", () => {
    render(<Harness initial={[]} />);
    expect(screen.getByRole("button", { name: /visibility lens selector/i })).toHaveTextContent(
      "All lenses",
    );
  });

  it("trigger reads 'N of 6 lenses' when partially selected", () => {
    render(<Harness initial={["Discovery", "BuyingIntent"]} />);
    expect(screen.getByRole("button", { name: /visibility lens selector/i })).toHaveTextContent(
      "2 of 6 lenses",
    );
  });

  it("toggling a lens off the default 'all' sentinel emits the remaining five", async () => {
    const spy = vi.fn();
    render(<Harness initial={[]} onChangeSpy={spy} />);
    await userEvent.click(screen.getByRole("button", { name: /visibility lens selector/i }));
    await userEvent.click(screen.getByLabelText("Discovery"));
    const next = spy.mock.calls[0][0] as string[];
    expect(next).toHaveLength(5);
    expect(next).not.toContain("Discovery");
  });

  it("toggling the final lens off collapses back to the empty 'all' sentinel", async () => {
    const spy = vi.fn();
    render(<Harness initial={["Discovery"]} onChangeSpy={spy} />);
    await userEvent.click(screen.getByRole("button", { name: /visibility lens selector/i }));
    await userEvent.click(screen.getByLabelText("Discovery"));
    expect(spy).toHaveBeenCalledWith([]);
  });
});
