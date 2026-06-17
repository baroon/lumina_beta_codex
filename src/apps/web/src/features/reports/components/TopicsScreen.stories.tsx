import type { Meta, StoryObj } from "@storybook/react";
import { TopicsScreen } from "./TopicsScreen";

const meta: Meta<typeof TopicsScreen> = {
  title: "Features/Reports/TopicsScreen",
  component: TopicsScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TopicsScreen>;

export const Default: Story = {};
