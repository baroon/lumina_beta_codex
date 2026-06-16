import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { InlineChipFilter, platformLabel, PLATFORM_LABELS, SENTIMENT_ORDER } from "./FilterChips";

describe("platformLabel", () => {
  it("returns the friendly label for known codes", () => {
    // PLATFORM_LABELS keys mirror the BE AIPlatform.Code values
    // (PascalCase). See AIPlatformConfiguration on the BE side.
    expect(platformLabel("ChatGpt")).toBe(PLATFORM_LABELS.ChatGpt);
    expect(platformLabel("Claude")).toBe(PLATFORM_LABELS.Claude);
    expect(platformLabel("ChatGptSearch")).toBe(PLATFORM_LABELS.ChatGptSearch);
  });

  it("falls back to the raw code for unknown platforms", () => {
    expect(platformLabel("future-platform")).toBe("future-platform");
  });
});

describe("SENTIMENT_ORDER", () => {
  it("matches the BE Sentiment enum in canonical order", () => {
    expect(SENTIMENT_ORDER).toEqual(["Positive", "Neutral", "Mixed", "Negative", "Unknown"]);
  });
});

describe("InlineChipFilter", () => {
  it("renders the empty-state label when no values are available", () => {
    render(
      <InlineChipFilter
        available={[]}
        selected={[]}
        onChange={vi.fn()}
        emptyLabel="No models in scope."
      />,
    );
    expect(screen.getByText("No models in scope.")).toBeInTheDocument();
  });

  it("renders every available value pressed when nothing is explicitly selected", () => {
    render(
      <InlineChipFilter
        available={["ChatGpt", "Claude"]}
        selected={[]}
        onChange={vi.fn()}
        labelFor={platformLabel}
        emptyLabel="empty"
      />,
    );
    expect(screen.getByRole("button", { name: /Filter by ChatGPT/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /Filter by Claude/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("narrows from 'all' to a single value on first click", async () => {
    const onChange = vi.fn();
    render(
      <InlineChipFilter
        available={["ChatGpt", "Claude"]}
        selected={[]}
        onChange={onChange}
        labelFor={platformLabel}
        emptyLabel="empty"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Filter by ChatGPT/i }));
    expect(onChange).toHaveBeenCalledWith(["ChatGpt"]);
  });

  it("adds to the selection on subsequent clicks (multi-select)", async () => {
    const onChange = vi.fn();
    render(
      <InlineChipFilter
        available={["ChatGpt", "Claude", "Gemini"]}
        selected={["ChatGpt"]}
        onChange={onChange}
        labelFor={platformLabel}
        emptyLabel="empty"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Filter by Claude/i }));
    expect(onChange).toHaveBeenCalledWith(["ChatGpt", "Claude"]);
  });

  it("toggles a chip out of the selection on a second click", async () => {
    const onChange = vi.fn();
    render(
      <InlineChipFilter
        available={["ChatGpt", "Claude"]}
        selected={["ChatGpt"]}
        onChange={onChange}
        labelFor={platformLabel}
        emptyLabel="empty"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^Filter by ChatGPT$/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("renders per-chip count badges when countsByValue is supplied", () => {
    render(
      <InlineChipFilter
        available={["ChatGpt", "Claude", "Gemini"]}
        selected={[]}
        onChange={vi.fn()}
        labelFor={platformLabel}
        emptyLabel="empty"
        countsByValue={{ ChatGpt: 12, Claude: 3, Gemini: 0 }}
      />,
    );
    const chatgpt = screen.getByRole("button", { name: /Filter by ChatGPT/i });
    expect(chatgpt).toHaveTextContent("ChatGPT");
    expect(chatgpt).toHaveTextContent("12");
    expect(screen.getByRole("button", { name: /Filter by Claude/i })).toHaveTextContent("3");
    // Zero count still renders the badge (muted) — caller decides
    // whether to filter the value out of `available` upstream.
    expect(screen.getByRole("button", { name: /Filter by Gemini/i })).toHaveTextContent("0");
  });

  it("omits the badge for values absent from countsByValue (callers pre-filter available)", () => {
    render(
      <InlineChipFilter
        available={["Positive", "Neutral"]}
        selected={[]}
        onChange={vi.fn()}
        emptyLabel="empty"
        countsByValue={{ Positive: 5 }}
      />,
    );
    expect(screen.getByRole("button", { name: /Filter by Positive/i })).toHaveTextContent("5");
    // Neutral isn't in the counts map — callers are expected to omit it
    // from `available` entirely if it has no data. When it does appear
    // in `available` without a count, the chip renders with just the
    // label (no badge).
    expect(screen.getByRole("button", { name: /Filter by Neutral/i })).toHaveTextContent(
      /^Neutral$/,
    );
  });

  it("omits count badges when countsByValue is not supplied", () => {
    render(
      <InlineChipFilter
        available={["ChatGpt"]}
        selected={[]}
        onChange={vi.fn()}
        labelFor={platformLabel}
        emptyLabel="empty"
      />,
    );
    // Chip contains only the label, no trailing digit.
    expect(screen.getByRole("button", { name: /Filter by ChatGPT/i })).toHaveTextContent(
      /^ChatGPT$/,
    );
  });

  it("renders the Clear link only when non-empty, and resets on click", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <InlineChipFilter
        available={["ChatGpt", "Claude"]}
        selected={[]}
        onChange={onChange}
        emptyLabel="empty"
      />,
    );
    expect(screen.queryByRole("button", { name: /^Clear$/i })).not.toBeInTheDocument();

    rerender(
      <InlineChipFilter
        available={["ChatGpt", "Claude"]}
        selected={["ChatGpt"]}
        onChange={onChange}
        emptyLabel="empty"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^Clear$/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
