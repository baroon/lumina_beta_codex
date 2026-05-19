import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "./label";

const meta: Meta<typeof Label> = {
  title: "Atoms/Label",
  component: Label,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  args: { children: "Email address" },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Label labelSize="sm">Small label</Label>
      <Label labelSize="default">Default label</Label>
      <Label labelSize="lg">Large label</Label>
    </div>
  ),
};
