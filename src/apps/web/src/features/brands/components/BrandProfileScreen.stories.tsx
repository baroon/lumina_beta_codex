import type { Meta, StoryObj } from "@storybook/react";
import { BrandProfileScreen } from "./BrandProfileScreen";

const meta: Meta<typeof BrandProfileScreen> = {
  title: "Features/Brands/BrandProfileScreen",
  component: BrandProfileScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof BrandProfileScreen>;

export const Default: Story = {
  args: { brandId: "b1" },
};
