import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { EntityMentionDto } from "@/types/api";

// Stub the donut so tests don't pull Recharts SVG into jsdom — just
// surface the slice labels and computed shares so assertions stay clear.
vi.mock("@/components/charts/DonutChartWrapper", () => ({
  DonutChartWrapper: ({
    data,
    formatValue,
  }: {
    data: ReadonlyArray<{ id: string; label: string; value: number }>;
    formatValue: (v: number) => string;
  }) => (
    <div data-testid="donut">
      {data.map((slice) => (
        <span key={slice.id} data-slice={slice.id}>
          {slice.label}:{formatValue(slice.value)}
        </span>
      ))}
    </div>
  ),
}));

import { ShareOfVoiceCard } from "./ShareOfVoiceCard";

function mention(overrides: Partial<EntityMentionDto>): EntityMentionDto {
  return {
    entityType: "Brand",
    entityId: "x",
    name: "X",
    isTrackedBrand: false,
    mentionCount: 0,
    share: 0,
    ...overrides,
  };
}

describe("ShareOfVoiceCard", () => {
  it("renders the no-data message when every entity has zero mentions", () => {
    render(
      <ShareOfVoiceCard mentions={[mention({ entityId: "a", name: "A", mentionCount: 0 })]} />,
    );
    expect(screen.getByText(/no brand or competitor mentions/i)).toBeInTheDocument();
    expect(screen.queryByTestId("donut")).not.toBeInTheDocument();
  });

  it("renders one donut slice per non-zero entity with its share", () => {
    render(
      <ShareOfVoiceCard
        mentions={[
          mention({ entityId: "a", name: "Acme", isTrackedBrand: true, mentionCount: 6 }),
          mention({ entityId: "b", name: "Beta", mentionCount: 4 }),
          mention({ entityId: "c", name: "Drop", mentionCount: 0 }),
        ]}
      />,
    );
    const donut = screen.getByTestId("donut");
    expect(within(donut).getByText("Acme:6 (60%)")).toBeInTheDocument();
    expect(within(donut).getByText("Beta:4 (40%)")).toBeInTheDocument();
    // Zero-mention entity is dropped from the slice list.
    expect(within(donut).queryByText(/Drop/)).not.toBeInTheDocument();
  });

  it("narrows the slices to selectedKeys when provided", () => {
    render(
      <ShareOfVoiceCard
        mentions={[
          mention({ entityId: "a", name: "Acme", isTrackedBrand: true, mentionCount: 6 }),
          mention({ entityId: "b", name: "Beta", mentionCount: 4 }),
        ]}
        selectedKeys={["Brand:a"]}
      />,
    );
    const donut = screen.getByTestId("donut");
    expect(within(donut).getByText(/Acme/)).toBeInTheDocument();
    expect(within(donut).queryByText(/Beta/)).not.toBeInTheDocument();
  });

  it("treats an undefined selectedKeys as 'no filter — show everything'", () => {
    render(
      <ShareOfVoiceCard
        mentions={[
          mention({ entityId: "a", name: "Acme", isTrackedBrand: true, mentionCount: 6 }),
          mention({ entityId: "b", name: "Beta", mentionCount: 4 }),
        ]}
      />,
    );
    const donut = screen.getByTestId("donut");
    expect(within(donut).getByText(/Acme/)).toBeInTheDocument();
    expect(within(donut).getByText(/Beta/)).toBeInTheDocument();
  });
});
