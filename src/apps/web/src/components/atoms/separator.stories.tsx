import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "./separator";

const meta: Meta<typeof Separator> = {
  title: "Atoms/Separator",
  component: Separator,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
  args: { orientation: "horizontal" },
};

export const Vertical: Story = {
  decorators: [
    (Story) => (
      <div className="h-16 flex items-stretch">
        <Story />
      </div>
    ),
  ],
  args: { orientation: "vertical" },
};
