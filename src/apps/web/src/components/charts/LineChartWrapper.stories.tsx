import type { Meta, StoryObj } from "@storybook/react";
import { LineChartWrapper, type LineChartPoint } from "./LineChartWrapper";

const points: LineChartPoint[] = [
  { x: "Apr 28", y: 0.25 },
  { x: "May 3", y: 0.28 },
  { x: "May 8", y: 0.3 },
  { x: "May 13", y: 0.32 },
  { x: "May 18", y: 0.35 },
  { x: "May 21", y: 0.38 },
];

const meta: Meta<typeof LineChartWrapper> = {
  title: "Charts/LineChartWrapper",
  component: LineChartWrapper,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof LineChartWrapper>;

export const Default: Story = {
  args: {
    data: points,
    formatValue: (v) => `${Math.round(v * 100)}%`,
    maxValue: 1,
    valueAxisLabel: "Mention rate",
  },
};

export const WithGaps: Story = {
  args: {
    data: [
      { x: "Apr 28", y: 0.25 },
      { x: "May 3", y: null }, // gap — denominator-zero from aggregator
      { x: "May 8", y: 0.3 },
      { x: "May 13", y: 0.32 },
    ],
    formatValue: (v) => `${Math.round(v * 100)}%`,
    maxValue: 1,
  },
};

export const Empty: Story = {
  args: { data: [] },
};
