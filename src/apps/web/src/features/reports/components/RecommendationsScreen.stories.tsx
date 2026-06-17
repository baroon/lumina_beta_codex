import type { Meta, StoryObj } from "@storybook/react";
import { RecommendationsScreen } from "./RecommendationsScreen";

const meta: Meta<typeof RecommendationsScreen> = {
  title: "Features/Reports/RecommendationsScreen",
  component: RecommendationsScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RecommendationsScreen>;

export const Default: Story = {};
