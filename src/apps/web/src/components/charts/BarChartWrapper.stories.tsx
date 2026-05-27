import type { Meta, StoryObj } from "@storybook/react";
import { BarChartWrapper } from "./BarChartWrapper";

const meta: Meta<typeof BarChartWrapper> = {
  title: "Charts/BarChartWrapper",
  component: BarChartWrapper,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: 640 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BarChartWrapper>;

export const HorizontalCounts: Story = {
  args: {
    data: [
      { label: "Gensler", value: 12 },
      { label: "HOK", value: 8 },
      { label: "Studio 804", value: 4 },
      { label: "Design Workshop", value: 2 },
    ],
    valueAxisLabel: "Mentions",
  },
};

export const HorizontalRates: Story = {
  args: {
    data: [
      { label: "Competitor Comparison", value: 1.0 },
      { label: "Sentiment & Trust", value: 1.0 },
      { label: "Discovery", value: 0.33 },
      { label: "Content Gaps", value: 0 },
    ],
    maxValue: 1,
    formatValue: (v) => `${Math.round(v * 100)}%`,
    valueAxisLabel: "Brand mention rate",
  },
};

export const Vertical: Story = {
  args: {
    data: [
      { label: "ChatGPT", value: 0.33 },
      { label: "Gemini", value: 0.18 },
      { label: "Perplexity", value: 0.42 },
    ],
    layout: "vertical",
    maxValue: 1,
    formatValue: (v) => `${Math.round(v * 100)}%`,
    valueAxisLabel: "Brand mention rate",
  },
};

export const Empty: Story = {
  args: { data: [] },
};
