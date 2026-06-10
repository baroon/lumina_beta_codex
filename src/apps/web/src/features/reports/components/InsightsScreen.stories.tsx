import type { Meta, StoryObj } from "@storybook/react";
import { InsightsScreen } from "./InsightsScreen";

const meta: Meta<typeof InsightsScreen> = {
  title: "Features/Reports/InsightsScreen",
  component: InsightsScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof InsightsScreen>;

export const Default: Story = {};
