import type { Meta, StoryObj } from "@storybook/react";
import { DiscoveryCompleteScreen } from "./DiscoveryCompleteScreen";

const meta: Meta<typeof DiscoveryCompleteScreen> = {
  title: "Features/Discovery/DiscoveryCompleteScreen",
  component: DiscoveryCompleteScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof DiscoveryCompleteScreen>;

export const Default: Story = {
  args: { brandName: "Acme Inc.", brandId: "brand-123" },
};
