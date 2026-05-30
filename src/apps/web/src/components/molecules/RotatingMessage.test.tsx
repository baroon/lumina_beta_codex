import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RotatingMessage } from "./RotatingMessage";

describe("RotatingMessage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the first message immediately", () => {
    render(<RotatingMessage messages={["one", "two", "three"]} intervalMs={1000} />);
    expect(screen.getByText("one")).toBeInTheDocument();
  });

  it("advances to the next message after one interval", () => {
    render(<RotatingMessage messages={["one", "two", "three"]} intervalMs={1000} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("two")).toBeInTheDocument();
    expect(screen.queryByText("one")).not.toBeInTheDocument();
  });

  it("wraps back to the first message after reaching the end", () => {
    render(<RotatingMessage messages={["one", "two"]} intervalMs={1000} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("two")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText("one")).toBeInTheDocument();
  });

  it("does not start a timer for a single-message list", () => {
    render(<RotatingMessage messages={["only one"]} intervalMs={1000} />);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("only one")).toBeInTheDocument();
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(<RotatingMessage messages={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
