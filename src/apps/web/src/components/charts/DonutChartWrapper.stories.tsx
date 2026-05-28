import type { Meta, StoryObj } from "@storybook/react";
import { DonutChartWrapper, type DonutChartDatum } from "./DonutChartWrapper";

const palette = ["#6366f1", "#f59e0b", "#10b981", "#ef4444"];

const data: DonutChartDatum[] = [
  { id: "nostri", label: "Nostri", value: 50, color: palette[0] },
  { id: "gensler", label: "Gensler", value: 30, color: palette[1] },
  { id: "hok", label: "HOK", value: 20, color: palette[2] },
];

const meta: Meta<typeof DonutChartWrapper> = {
  title: "Charts/DonutChartWrapper",
  component: DonutChartWrapper,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof DonutChartWrapper>;

export const Default: Story = {
  args: { data, formatValue: (v) => `${v}%` },
};

export const Empty: Story = {
  args: { data: [] },
};
