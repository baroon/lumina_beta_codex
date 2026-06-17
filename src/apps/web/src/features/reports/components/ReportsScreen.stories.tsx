import type { Meta, StoryObj } from "@storybook/react";
import { ReportsScreen } from "./ReportsScreen";

const meta: Meta<typeof ReportsScreen> = {
  title: "Features/Reports/ReportsScreen",
  component: ReportsScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ReportsScreen>;

export const Default: Story = {};
