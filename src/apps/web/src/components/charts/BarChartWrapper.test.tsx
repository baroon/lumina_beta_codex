import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@nivo/bar", () => ({
  // Stub renders the data + key props as data-* so we can assert without
  // needing jsdom to handle the actual SVG / ResizeObserver path.
  ResponsiveBar: (props: {
    data: Array<{ label: string; value: number }>;
    layout?: string;
    maxValue?: number;
    valueFormat?: (v: number) => string;
  }) => (
    <div
      data-testid="bar"
      data-layout={props.layout}
      data-max={props.maxValue ?? ""}
      data-labels={props.data.map((d) => d.label).join("|")}
      data-values={props.data.map((d) => d.value).join("|")}
      data-formatted={
        props.valueFormat ? props.data.map((d) => props.valueFormat!(d.value)).join("|") : ""
      }
    />
  ),
}));

import { BarChartWrapper } from "./BarChartWrapper";

const DATA = [
  { label: "A", value: 3 },
  { label: "B", value: 5 },
];

describe("BarChartWrapper", () => {
  it("renders nothing when data is empty", () => {
    const { container } = render(<BarChartWrapper data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("passes the data array through unchanged", () => {
    const { getByTestId } = render(<BarChartWrapper data={DATA} />);
    const bar = getByTestId("bar");
    expect(bar.getAttribute("data-labels")).toBe("A|B");
    expect(bar.getAttribute("data-values")).toBe("3|5");
  });

  it("defaults to horizontal layout", () => {
    const { getByTestId } = render(<BarChartWrapper data={DATA} />);
    expect(getByTestId("bar").getAttribute("data-layout")).toBe("horizontal");
  });

  it("honors layout=vertical", () => {
    const { getByTestId } = render(<BarChartWrapper data={DATA} layout="vertical" />);
    expect(getByTestId("bar").getAttribute("data-layout")).toBe("vertical");
  });

  it("threads maxValue through (used to pin rate charts to [0, 1])", () => {
    const { getByTestId } = render(<BarChartWrapper data={DATA} maxValue={1} />);
    expect(getByTestId("bar").getAttribute("data-max")).toBe("1");
  });

  it("threads formatValue through (used for percent rendering)", () => {
    const { getByTestId } = render(
      <BarChartWrapper data={DATA} formatValue={(v) => `${v * 100}%`} />,
    );
    expect(getByTestId("bar").getAttribute("data-formatted")).toBe("300%|500%");
  });
});
