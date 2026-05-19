import type { Meta, StoryObj } from "@storybook/react";
import { DiscoveryProgressScreen } from "./DiscoveryProgressScreen";

const meta: Meta<typeof DiscoveryProgressScreen> = {
  title: "Features/Discovery/DiscoveryProgressScreen",
  component: DiscoveryProgressScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof DiscoveryProgressScreen>;

export const EarlyProgress: Story = {
  args: { step: 1, totalSteps: 5 },
};

export const MidProgress: Story = {
  args: { step: 3, totalSteps: 5 },
};
