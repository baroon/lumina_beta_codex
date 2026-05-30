import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TopicSelector } from "./TopicSelector";
import type { BrandedDimensionGroupDto } from "@/types/api";

function group(brandId: string, brandName: string, items: string[]): BrandedDimensionGroupDto {
  return {
    brandId,
    brandName,
    items: items.map((name, i) => ({ id: `${brandId}-${i}`, name })),
  };
}

const DEFAULT_GROUPS: BrandedDimensionGroupDto[] = [
  group("nostri", "Nostri", ["Career growth", "Salary trends"]),
  group("gensler", "Gensler", ["Remote work", "Salary trends"]), // shared name across brands
];

function Harness({
  initial = [] as string[],
  spy,
  groups = DEFAULT_GROUPS,
}: {
  initial?: string[];
  spy?: (next: string[]) => void;
  groups?: BrandedDimensionGroupDto[];
}) {
  const [v, setV] = useState<string[]>(initial);
  return (
    <TopicSelector
      topicsByBrand={groups}
      selectedNames={v}
      onChange={(next) => {
        setV(next);
        spy?.(next);
      }}
    />
  );
}

describe("TopicSelector", () => {
  it("trigger reads 'N topics' on the empty-sentinel default", () => {
    render(<Harness initial={[]} />);
    // 3 unique names: Career growth, Remote work, Salary trends.
    expect(screen.getByRole("button", { name: /topic selector/i })).toHaveTextContent("3 topics");
  });

  it("trigger reads 'No topics' when the workspace has no topics yet", () => {
    render(<Harness groups={[]} />);
    expect(screen.getByRole("button", { name: /topic selector/i })).toHaveTextContent("No topics");
    expect(screen.getByRole("button", { name: /topic selector/i })).toBeDisabled();
  });

  it("trigger reads 'N of M topics' when partially selected", () => {
    render(<Harness initial={["Salary trends", "Remote work"]} />);
    expect(screen.getByRole("button", { name: /topic selector/i })).toHaveTextContent(
      "2 of 3 topics",
    );
  });

  it("renders one section per brand with the brand name as header", async () => {
    render(<Harness initial={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /topic selector/i }));
    expect(screen.getByRole("group", { name: "Nostri" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Gensler" })).toBeInTheDocument();
  });

  it("toggling a name unchecks every section that contains it (shared-name semantics)", async () => {
    const spy = vi.fn();
    render(<Harness initial={[]} spy={spy} />);
    await userEvent.click(screen.getByRole("button", { name: /topic selector/i }));
    // "Salary trends" appears under both brand sections; clicking either
    // emits the name-based remainder list.
    const checkboxes = screen.getAllByRole("checkbox", { name: "Salary trends" });
    expect(checkboxes).toHaveLength(2);
    await userEvent.click(checkboxes[0]);
    const next = spy.mock.calls[0][0] as string[];
    expect(next).not.toContain("Salary trends");
    expect(next).toContain("Career growth");
    expect(next).toContain("Remote work");
  });

  it("substring search filters within sections and hides empty sections", async () => {
    render(<Harness initial={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /topic selector/i }));
    await userEvent.type(screen.getByPlaceholderText(/search topics/i), "remote");
    expect(screen.getByText("Remote work")).toBeInTheDocument();
    expect(screen.queryByText("Career growth")).not.toBeInTheDocument();
    // Nostri section had no match -> entire section hides.
    expect(screen.queryByRole("group", { name: "Nostri" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Gensler" })).toBeInTheDocument();
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
