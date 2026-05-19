import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Atoms/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Checkbox checkboxSize="sm" />
      <Checkbox checkboxSize="default" />
      <Checkbox checkboxSize="lg" />
    </div>
  ),
};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};
