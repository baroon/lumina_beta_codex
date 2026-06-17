import type { Meta, StoryObj } from "@storybook/react";
import { BrandDiscoveryScreen } from "./BrandDiscoveryScreen";

const meta: Meta<typeof BrandDiscoveryScreen> = {
  title: "Features/Brands/BrandDiscoveryScreen",
  component: BrandDiscoveryScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof BrandDiscoveryScreen>;

export const Default: Story = {};
