import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { WorkspaceCoMentionDto } from "@/types/api";

vi.mock("@/components/charts/BarChartWrapper", () => ({
  BarChartWrapper: ({ data }: { data: ReadonlyArray<{ label: string; value: number }> }) => (
    <div data-testid="bar-chart">
      {data.map((d) => (
        <span key={d.label} data-bar={d.label}>
          {d.label}:{d.value}
        </span>
      ))}
    </div>
  ),
}));

import { CoMentionLandscapeCard } from "./CoMentionLandscapeCard";

function row(overrides: Partial<WorkspaceCoMentionDto>): WorkspaceCoMentionDto {
  return {
    competitorId: "x",
    competitorName: "X",
    coMentionCount: 0,
    competitorMentionCount: 0,
    ...overrides,
  };
}

describe("CoMentionLandscapeCard", () => {
  it("renders the no-data message when nothing is in scope", () => {
    render(<CoMentionLandscapeCard rows={[]} />);
    expect(screen.getByText(/no tracked competitors mentioned alongside/i)).toBeInTheDocument();
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
  });

  it("renders one bar per competitor plus the per-row share caption", () => {
    render(
      <CoMentionLandscapeCard
        rows={[
          row({
            competitorId: "a",
            competitorName: "Canva",
            coMentionCount: 18,
            competitorMentionCount: 30,
          }),
          row({
            competitorId: "b",
            competitorName: "Figma",
            coMentionCount: 7,
            competitorMentionCount: 12,
          }),
        ]}
      />,
    );
    const chart = screen.getByTestId("bar-chart");
    expect(within(chart).getByText("Canva:18")).toBeInTheDocument();
    expect(within(chart).getByText("Figma:7")).toBeInTheDocument();
    // 18 / 30 = 60% and 7 / 12 ≈ 58% rounded.
    expect(screen.getByText(/60% of competitor's mentions/i)).toBeInTheDocument();
    expect(screen.getByText(/58% of competitor's mentions/i)).toBeInTheDocument();
  });

  it("hides the share caption when the competitor's total mentions is zero", () => {
    render(
      <CoMentionLandscapeCard
        rows={[
          row({
            competitorId: "a",
            competitorName: "Acme",
            coMentionCount: 3,
            competitorMentionCount: 0,
          }),
        ]}
      />,
    );
    // The 3 / 0 fraction is still surfaced, but no "X% of …" caption.
    expect(screen.getByText(/3 \/ 0/)).toBeInTheDocument();
    expect(screen.queryByText(/of competitor's mentions/i)).not.toBeInTheDocument();
  });

  it("narrows the rows to selectedKeys when provided", () => {
    render(
      <CoMentionLandscapeCard
        rows={[
          row({
            competitorId: "a",
            competitorName: "Canva",
            coMentionCount: 18,
            competitorMentionCount: 30,
          }),
          row({
            competitorId: "b",
            competitorName: "Figma",
            coMentionCount: 7,
            competitorMentionCount: 12,
          }),
        ]}
        selectedKeys={["Competitor:a"]}
      />,
    );
    expect(screen.getByText("Canva")).toBeInTheDocument();
    expect(screen.queryByText("Figma")).not.toBeInTheDocument();
  });
});
