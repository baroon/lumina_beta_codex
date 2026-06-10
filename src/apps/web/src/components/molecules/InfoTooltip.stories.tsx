import type { Meta, StoryObj } from "@storybook/react";
import { InfoTooltip } from "./InfoTooltip";

const meta: Meta<typeof InfoTooltip> = {
  title: "Molecules/InfoTooltip",
  component: InfoTooltip,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof InfoTooltip>;

export const Default: Story = {
  args: { label: "Brand mention rate" },
  render: (args) => (
    <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
      Brand mention rate
      <InfoTooltip {...args} />
    </div>
  ),
};

export const NextToCardTitle: Story = {
  args: { label: "Share of voice", iconSize: 13 },
  render: (args) => (
    <div className="flex items-center gap-1.5">
      <h3 className="text-base font-semibold text-neutral-900">Share of Voice</h3>
      <InfoTooltip {...args} />
    </div>
  ),
};

export const CustomBody: Story = {
  args: {
    label: "Citations",
    body: "Total cited sources across all platforms in this scan.",
  },
  render: (args) => (
    <div className="flex items-center gap-1.5 text-sm text-neutral-700">
      Citations
      <InfoTooltip {...args} />
    </div>
  ),
};
