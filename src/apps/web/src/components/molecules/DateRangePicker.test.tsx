import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DateRangePicker,
  defaultDateRangeSelection,
  resolveDateRange,
  serializeDateRangeSelection,
  triggerLabel,
  type DateRangeSelection,
} from "./DateRangePicker";

describe("DateRangePicker", () => {
  it("shows the preset label on the closed trigger", () => {
    render(<DateRangePicker value={{ kind: "preset", days: 30 }} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /date range/i })).toHaveTextContent("Last 30 days");
  });

  it("shows the All time label when the selection is all-time", () => {
    render(<DateRangePicker value={{ kind: "all" }} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /date range/i })).toHaveTextContent("All time");
  });

  it("formats a custom range as 'd MMM – d MMM yyyy' when both ends share a year", () => {
    render(
      <DateRangePicker
        value={{ kind: "custom", from: new Date(2026, 4, 1), to: new Date(2026, 4, 28) }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /date range/i })).toHaveTextContent(
      /1 May.*28 May 2026/,
    );
  });

  it("opens the popover when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<DateRangePicker value={{ kind: "preset", days: 30 }} onChange={vi.fn()} />);
    expect(screen.queryByRole("dialog", { name: /choose date range/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: /date range/i }));
    expect(screen.getByRole("dialog", { name: /choose date range/i })).toBeInTheDocument();
  });

  it("emits a preset selection and closes when a preset is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateRangePicker value={{ kind: "preset", days: 30 }} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /date range/i }));
    await user.click(screen.getByRole("option", { name: /Last 7 days/i }));
    expect(onChange).toHaveBeenCalledWith({ kind: "preset", days: 7 });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("emits an all-time selection from the All time entry", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateRangePicker value={{ kind: "preset", days: 30 }} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /date range/i }));
    await user.click(screen.getByRole("option", { name: /All time/i }));
    expect(onChange).toHaveBeenCalledWith({ kind: "all" });
  });
});

describe("resolveDateRange", () => {
  it("snaps preset windows to the freshest 'now' upper bound (left open)", () => {
    const before = Date.now();
    const range = resolveDateRange({ kind: "preset", days: 7 });
    const after = Date.now();
    expect(range.from).not.toBeNull();
    // From is start-of-day(now - 7 days); roughly within 7 days of "now".
    const delta = before - (range.from?.getTime() ?? 0);
    expect(delta).toBeGreaterThan(6 * 24 * 60 * 60 * 1000 - 1000);
    expect(after - before).toBeLessThan(1000);
    // Preset windows leave the upper bound open so the BE can resolve "now".
    expect(range.to).toBeNull();
  });

  it("returns the custom dates verbatim", () => {
    const from = new Date(2026, 4, 1);
    const to = new Date(2026, 4, 28);
    expect(resolveDateRange({ kind: "custom", from, to })).toEqual({ from, to });
  });

  it("returns nulls for all-time", () => {
    expect(resolveDateRange({ kind: "all" })).toEqual({ from: null, to: null });
  });
});

describe("serializeDateRangeSelection", () => {
  it("produces a stable key per selection kind", () => {
    const sel: DateRangeSelection = { kind: "preset", days: 30 };
    expect(serializeDateRangeSelection(sel)).toBe("preset:30");
    expect(serializeDateRangeSelection({ kind: "all" })).toBe("all");
    expect(
      serializeDateRangeSelection({
        kind: "custom",
        from: new Date(Date.UTC(2026, 4, 1)),
        to: new Date(Date.UTC(2026, 4, 28)),
      }),
    ).toContain("custom:2026-05-01");
  });
});

describe("triggerLabel + defaultDateRangeSelection", () => {
  it("defaults to Last 30 days", () => {
    expect(triggerLabel(defaultDateRangeSelection())).toBe("Last 30 days");
  });
});
