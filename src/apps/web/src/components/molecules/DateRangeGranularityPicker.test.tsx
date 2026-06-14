import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DateRangeGranularityPicker } from "./DateRangeGranularityPicker";

describe("DateRangeGranularityPicker", () => {
  it("shows the date label and granularity on the closed trigger", () => {
    render(
      <DateRangeGranularityPicker
        range={{ kind: "preset", days: 30 }}
        onRangeChange={vi.fn()}
        granularity="week"
        onGranularityChange={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button", { name: /date range and granularity/i });
    expect(trigger).toHaveTextContent("Last 30 days");
    expect(trigger).toHaveTextContent("Weekly");
  });

  it("opens the popover when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DateRangeGranularityPicker
        range={{ kind: "preset", days: 30 }}
        onRangeChange={vi.fn()}
        granularity="week"
        onGranularityChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: /date range and granularity/i }));
    expect(
      screen.getByRole("dialog", { name: /choose date range and granularity/i }),
    ).toBeInTheDocument();
  });

  it("emits a preset selection and closes when a preset is clicked", async () => {
    const user = userEvent.setup();
    const onRangeChange = vi.fn();
    render(
      <DateRangeGranularityPicker
        range={{ kind: "preset", days: 30 }}
        onRangeChange={onRangeChange}
        granularity="week"
        onGranularityChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /date range and granularity/i }));
    await user.click(screen.getByRole("option", { name: /Last 7 days/i }));
    expect(onRangeChange).toHaveBeenCalledWith({ kind: "preset", days: 7 });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("emits a granularity change without closing", async () => {
    const user = userEvent.setup();
    const onGranularityChange = vi.fn();
    render(
      <DateRangeGranularityPicker
        range={{ kind: "preset", days: 30 }}
        onRangeChange={vi.fn()}
        granularity="week"
        onGranularityChange={onGranularityChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /date range and granularity/i }));
    await user.click(screen.getByRole("button", { name: /^Daily$/i }));
    expect(onGranularityChange).toHaveBeenCalledWith("day");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders the All time label on the trigger when the selection is all-time", () => {
    render(
      <DateRangeGranularityPicker
        range={{ kind: "all" }}
        onRangeChange={vi.fn()}
        granularity="month"
        onGranularityChange={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button", { name: /date range and granularity/i });
    expect(trigger).toHaveTextContent("All time");
    expect(trigger).toHaveTextContent("Monthly");
  });
});
