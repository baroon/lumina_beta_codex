import type { Meta, StoryObj } from "@storybook/react";
import { PromptsScreen } from "./PromptsScreen";

const meta: Meta<typeof PromptsScreen> = {
  title: "Features/Reports/PromptsScreen",
  component: PromptsScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PromptsScreen>;

export const Default: Story = {};
