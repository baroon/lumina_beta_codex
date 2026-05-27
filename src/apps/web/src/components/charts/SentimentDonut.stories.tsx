import type { Meta, StoryObj } from "@storybook/react";
import { SentimentDonut } from "./SentimentDonut";

const meta: Meta<typeof SentimentDonut> = {
  title: "Charts/SentimentDonut",
  component: SentimentDonut,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SentimentDonut>;

export const FullDistribution: Story = {
  args: { data: { Positive: 12, Neutral: 6, Negative: 3, Mixed: 2, Unknown: 8 } },
};

export const PartialDistribution: Story = {
  args: { data: { Positive: 6, Unknown: 20 } },
};

export const Empty: Story = {
  args: { data: {} },
};
