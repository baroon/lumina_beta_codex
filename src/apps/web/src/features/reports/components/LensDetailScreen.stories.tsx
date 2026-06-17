import type { Meta, StoryObj } from "@storybook/react";
import { LensDetailScreen } from "./LensDetailScreen";

const meta: Meta<typeof LensDetailScreen> = {
  title: "Features/Reports/LensDetailScreen",
  component: LensDetailScreen,
  tags: ["autodocs"],
  args: {
    lensId: "discovery",
  },
};

export default meta;
type Story = StoryObj<typeof LensDetailScreen>;

export const Discovery: Story = {};

export const BuyingIntent: Story = {
  args: {
    lensId: "buying-intent",
  },
};
