import type { Meta, StoryObj } from "@storybook/react";
import { CompetitorsScreen } from "./CompetitorsScreen";

const meta: Meta<typeof CompetitorsScreen> = {
  title: "Features/Reports/CompetitorsScreen",
  component: CompetitorsScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CompetitorsScreen>;

export const Default: Story = {};
