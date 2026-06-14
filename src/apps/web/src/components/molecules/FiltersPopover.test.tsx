import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FiltersPopover, FiltersPopoverRow } from "./FiltersPopover";

describe("FiltersPopover", () => {
  it("renders a plain Filters trigger when nothing is applied", () => {
    render(
      <FiltersPopover activeCount={0}>
        <FiltersPopoverRow label="Topics">child</FiltersPopoverRow>
      </FiltersPopover>,
    );
    const trigger = screen.getByRole("button", { name: /^Filters$/i });
    expect(trigger).toBeInTheDocument();
    // No count badge — the aria-label-free badge span shouldn't be present.
    expect(screen.queryByLabelText(/filters? applied/i)).toBeNull();
  });

  it("shows the active count badge on the trigger when filters are applied", () => {
    render(
      <FiltersPopover activeCount={3}>
        <FiltersPopoverRow label="Topics">child</FiltersPopoverRow>
      </FiltersPopover>,
    );
    expect(screen.getByLabelText("3 filters applied")).toHaveTextContent("3");
  });

  it("opens the panel on click and reveals labeled rows", async () => {
    const user = userEvent.setup();
    render(
      <FiltersPopover activeCount={0}>
        <FiltersPopoverRow label="Topics">topic body</FiltersPopoverRow>
        <FiltersPopoverRow label="Markets">market body</FiltersPopoverRow>
      </FiltersPopover>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Filters$/i }));
    expect(screen.getByRole("dialog", { name: /coverage filters/i })).toBeInTheDocument();
    expect(screen.getByText("Topics")).toBeInTheDocument();
    expect(screen.getByText("Markets")).toBeInTheDocument();
  });

  it("closes when the X button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <FiltersPopover activeCount={0}>
        <FiltersPopoverRow label="Topics">body</FiltersPopoverRow>
      </FiltersPopover>,
    );
    await user.click(screen.getByRole("button", { name: /^Filters$/i }));
    await user.click(screen.getByRole("button", { name: /close filters/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders Clear all only when there is at least one active filter and a handler is wired", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    render(
      <FiltersPopover activeCount={2} onClearAll={onClearAll}>
        <FiltersPopoverRow label="Topics">body</FiltersPopoverRow>
      </FiltersPopover>,
    );
    await user.click(screen.getByRole("button", { name: /^Filters$/i }));
    await user.click(screen.getByRole("button", { name: /clear all/i }));
    expect(onClearAll).toHaveBeenCalledOnce();
  });

  it("hides Clear all when no filters are applied", async () => {
    const user = userEvent.setup();
    render(
      <FiltersPopover activeCount={0} onClearAll={vi.fn()}>
        <FiltersPopoverRow label="Topics">body</FiltersPopoverRow>
      </FiltersPopover>,
    );
    await user.click(screen.getByRole("button", { name: /^Filters$/i }));
    expect(screen.queryByRole("button", { name: /clear all/i })).toBeNull();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(
      <FiltersPopover activeCount={0}>
        <FiltersPopoverRow label="Topics">body</FiltersPopoverRow>
      </FiltersPopover>,
    );
    await user.click(screen.getByRole("button", { name: /^Filters$/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
