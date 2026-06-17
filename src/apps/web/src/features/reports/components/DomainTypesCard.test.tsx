import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { DomainTypeShareDto } from "@/types/api";

vi.mock("@/components/charts/DonutChartWrapper", () => ({
  DonutChartWrapper: ({
    data,
    formatValue,
  }: {
    data: ReadonlyArray<{ label: string; value: number }>;
    formatValue: (v: number) => string;
  }) => (
    <div data-testid="donut">
      {data.map((d) => (
        <span key={d.label}>
          {d.label}:{formatValue(d.value)}
        </span>
      ))}
    </div>
  ),
}));

import { DomainTypesCard } from "./DomainTypesCard";

describe("DomainTypesCard", () => {
  it("renders the no-data hint when no rows are passed", () => {
    render(<DomainTypesCard rows={[]} />);
    expect(screen.getByText(/no citation data in this window/i)).toBeInTheDocument();
    expect(screen.queryByTestId("donut")).not.toBeInTheDocument();
  });

  it("renders one slice per source-type with citation share %", () => {
    const rows: DomainTypeShareDto[] = [
      { sourceType: "Editorial", citationCount: 60, share: 0.6 },
      { sourceType: "UGC", citationCount: 40, share: 0.4 },
    ];
    render(<DomainTypesCard rows={rows} />);
    const donut = screen.getByTestId("donut");
    expect(within(donut).getByText("Editorial:60 (60%)")).toBeInTheDocument();
    expect(within(donut).getByText("UGC:40 (40%)")).toBeInTheDocument();
  });
});
