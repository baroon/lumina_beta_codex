import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "Atoms/Input",
  component: Input,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: "Enter text..." },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-2 w-64">
      <Input inputSize="sm" placeholder="Small" />
      <Input inputSize="default" placeholder="Default" />
      <Input inputSize="lg" placeholder="Large" />
    </div>
  ),
};

export const ErrorVariant: Story = {
  args: { placeholder: "Error state", variant: "error" },
};

export const Disabled: Story = {
  args: { placeholder: "Disabled", disabled: true },
};
