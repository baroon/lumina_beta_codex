import type { Meta, StoryObj } from "@storybook/react";
import { LensesScreen } from "./LensesScreen";

const meta: Meta<typeof LensesScreen> = {
  title: "Features/Reports/LensesScreen",
  component: LensesScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof LensesScreen>;

export const Default: Story = {};
