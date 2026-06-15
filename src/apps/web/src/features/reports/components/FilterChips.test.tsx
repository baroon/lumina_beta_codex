import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { InlineChipFilter, platformLabel, PLATFORM_LABELS, SENTIMENT_ORDER } from "./FilterChips";

describe("platformLabel", () => {
  it("returns the friendly label for known codes", () => {
    expect(platformLabel("openai")).toBe(PLATFORM_LABELS.openai);
    expect(platformLabel("claude")).toBe(PLATFORM_LABELS.claude);
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
        available={["openai", "claude"]}
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
        available={["openai", "claude"]}
        selected={[]}
        onChange={onChange}
        labelFor={platformLabel}
        emptyLabel="empty"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Filter by ChatGPT/i }));
    expect(onChange).toHaveBeenCalledWith(["openai"]);
  });

  it("adds to the selection on subsequent clicks (multi-select)", async () => {
    const onChange = vi.fn();
    render(
      <InlineChipFilter
        available={["openai", "claude", "gemini"]}
        selected={["openai"]}
        onChange={onChange}
        labelFor={platformLabel}
        emptyLabel="empty"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Filter by Claude/i }));
    expect(onChange).toHaveBeenCalledWith(["openai", "claude"]);
  });

  it("does NOT unselect on a second click of an already-selected chip", async () => {
    const onChange = vi.fn();
    render(
      <InlineChipFilter
        available={["openai", "claude"]}
        selected={["openai"]}
        onChange={onChange}
        labelFor={platformLabel}
        emptyLabel="empty"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Filter by ChatGPT/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders per-chip count badges when countsByValue is supplied", () => {
    render(
      <InlineChipFilter
        available={["openai", "claude", "gemini"]}
        selected={[]}
        onChange={vi.fn()}
        labelFor={platformLabel}
        emptyLabel="empty"
        countsByValue={{ openai: 12, claude: 3, gemini: 0 }}
      />,
    );
    const chatgpt = screen.getByRole("button", { name: /Filter by ChatGPT/i });
    expect(chatgpt).toHaveTextContent("ChatGPT");
    expect(chatgpt).toHaveTextContent("12");
    expect(screen.getByRole("button", { name: /Filter by Claude/i })).toHaveTextContent("3");
    // Zero count still renders the badge (muted) — empty entries are
    // honest signal, not hidden.
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
        available={["openai"]}
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
        available={["openai", "claude"]}
        selected={[]}
        onChange={onChange}
        emptyLabel="empty"
      />,
    );
    expect(screen.queryByRole("button", { name: /^Clear$/i })).not.toBeInTheDocument();

    rerender(
      <InlineChipFilter
        available={["openai", "claude"]}
        selected={["openai"]}
        onChange={onChange}
        emptyLabel="empty"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /^Clear$/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
