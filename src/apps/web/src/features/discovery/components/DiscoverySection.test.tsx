import { describe, it, expect, vi } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscoverySection } from "./DiscoverySection";
import type { CandidateDto } from "@/types/api";

function makeCandidates(): CandidateDto[] {
  return [
    {
      id: "a",
      name: "Alpha",
      description: null,
      confidence: 0.9,
      source: "LLMSuggested",
      metadata: {},
    },
    {
      id: "b",
      name: "Beta",
      description: null,
      confidence: 0.5,
      source: "LLMSuggested",
      metadata: {},
    },
  ];
}

type Props = ComponentProps<typeof DiscoverySection>;

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    title: "Products",
    description: "Your products",
    emptyMessage: "Nothing here",
    candidates: makeCandidates(),
    selectedIds: new Set<string>(["a"]),
    onToggle: vi.fn(),
    onSelectAll: vi.fn(),
    onDeselectAll: vi.fn(),
    onAddCustom: vi.fn(),
    ...overrides,
  };
}

describe("DiscoverySection", () => {
  it("renders candidates and the selected count", () => {
    render(<DiscoverySection {...baseProps()} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("1/2 selected")).toBeInTheDocument();
  });

  it("shows the fallback prompt when there are no candidates", () => {
    render(<DiscoverySection {...baseProps({ candidates: [], selectedIds: new Set() })} />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("No items detected")).toBeInTheDocument();
  });

  it("collapses the section when the header is clicked", async () => {
    render(<DiscoverySection {...baseProps()} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("heading", { name: "Products" }));
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("calls onSelectAll when not all candidates are selected", async () => {
    const onSelectAll = vi.fn();
    render(<DiscoverySection {...baseProps({ onSelectAll })} />);
    await userEvent.click(screen.getByRole("button", { name: /select all/i }));
    expect(onSelectAll).toHaveBeenCalled();
  });

  it("calls onDeselectAll when all candidates are selected", async () => {
    const onDeselectAll = vi.fn();
    render(
      <DiscoverySection {...baseProps({ selectedIds: new Set(["a", "b"]), onDeselectAll })} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /deselect all/i }));
    expect(onDeselectAll).toHaveBeenCalled();
  });

  it("renders a refresh control and calls onRefresh", async () => {
    const onRefresh = vi.fn();
    render(<DiscoverySection {...baseProps({ onRefresh, refreshesRemaining: 2 })} />);
    await userEvent.click(screen.getByText("2 left"));
    expect(onRefresh).toHaveBeenCalled();
  });

  it("disables refresh when no refreshes remain", () => {
    render(<DiscoverySection {...baseProps({ onRefresh: vi.fn(), refreshesRemaining: 0 })} />);
    expect(screen.getByText("0 left").closest("button")).toBeDisabled();
  });
});
