import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HeatmapWrapper } from "./HeatmapWrapper";

describe("HeatmapWrapper", () => {
  it("renders null when rows or cols are empty", () => {
    const { container } = render(<HeatmapWrapper data={{ rows: [], cols: ["a"], cells: [] }} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders headers + rows + cells with values", () => {
    render(
      <HeatmapWrapper
        data={{
          rows: ["OpenAI", "Gemini"],
          cols: ["May 1", "May 2"],
          cells: [
            { row: "OpenAI", col: "May 1", value: 4 },
            { row: "Gemini", col: "May 2", value: 1 },
          ],
        }}
      />,
    );

    // Headers + row labels visible.
    expect(screen.getByText("OpenAI")).toBeInTheDocument();
    expect(screen.getByText("Gemini")).toBeInTheDocument();
    expect(screen.getByText("May 1")).toBeInTheDocument();
    expect(screen.getByText("May 2")).toBeInTheDocument();

    // 2x2 cells, 4 total. Cell with value 4 carries data-value=4.
    const heatmap = screen.getByTestId("heatmap");
    const cellOpenAIMay1 = heatmap.querySelector('[data-row="OpenAI"][data-col="May 1"]');
    expect(cellOpenAIMay1).toHaveAttribute("data-value", "4");
    expect(within(cellOpenAIMay1 as HTMLElement).getByText("4")).toBeInTheDocument();

    // Missing cell (OpenAI × May 2) renders as 0 by default.
    const cellOpenAIMay2 = heatmap.querySelector('[data-row="OpenAI"][data-col="May 2"]');
    expect(cellOpenAIMay2).toHaveAttribute("data-value", "0");
    expect(within(cellOpenAIMay2 as HTMLElement).getByText("0")).toBeInTheDocument();
  });

  it("formats cell values via formatValue", () => {
    render(
      <HeatmapWrapper
        data={{
          rows: ["A"],
          cols: ["X"],
          cells: [{ row: "A", col: "X", value: 12 }],
        }}
        formatValue={(v) => `${v}x`}
      />,
    );
    expect(screen.getByText("12x")).toBeInTheDocument();
  });
});
