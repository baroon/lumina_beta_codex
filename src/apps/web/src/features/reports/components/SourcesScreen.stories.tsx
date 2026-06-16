import type { Meta, StoryObj } from "@storybook/react";
import { SourcesScreen } from "./SourcesScreen";

const meta: Meta<typeof SourcesScreen> = {
  title: "Features/Reports/SourcesScreen",
  component: SourcesScreen,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof SourcesScreen>;

export const Default: Story = {};
