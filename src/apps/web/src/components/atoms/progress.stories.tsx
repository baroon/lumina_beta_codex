import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "./progress";

const meta: Meta<typeof Progress> = {
  title: "Atoms/Progress",
  component: Progress,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="w-64"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  args: { value: 60 },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-64">
      <Progress progressSize="sm" value={60} />
      <Progress progressSize="default" value={60} />
      <Progress progressSize="lg" value={60} />
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-64">
      <Progress variant="default" value={60} />
      <Progress variant="success" value={80} />
      <Progress variant="warning" value={40} />
      <Progress variant="error" value={20} />
    </div>
  ),
};

export const Empty: Story = {
  args: { value: 0 },
};

export const Full: Story = {
  args: { value: 100 },
};
