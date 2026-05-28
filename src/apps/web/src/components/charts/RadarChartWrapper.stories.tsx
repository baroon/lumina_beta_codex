import type { Meta, StoryObj } from "@storybook/react";
import { RadarChartWrapper, type RadarChartDatum } from "./RadarChartWrapper";

const data: RadarChartDatum[] = [
  { axis: "Nostri", value: 96 },
  { axis: "Gensler", value: 42 },
  { axis: "HOK", value: 34 },
  { axis: "Studio 804", value: 12 },
  { axis: "Design Workshop", value: 7 },
];

const meta: Meta<typeof RadarChartWrapper> = {
  title: "Charts/RadarChartWrapper",
  component: RadarChartWrapper,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof RadarChartWrapper>;

export const Default: Story = {
  args: { data, formatValue: (v) => String(Math.round(v)) },
};

export const TooFewAxes: Story = {
  // Radar needs >= 3 axes to draw a polygon. Renders nothing.
  args: { data: data.slice(0, 2) },
};
