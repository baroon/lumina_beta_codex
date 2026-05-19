import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "Atoms/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: { className: "h-8 w-48" },
};

export const TextBlock: Story = {
  render: () => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-64" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-4 w-56" />
    </div>
  ),
};

export const Circle: Story = {
  args: { className: "h-12 w-12 rounded-full" },
};

export const CardPlaceholder: Story = {
  render: () => (
    <div className="w-80 space-y-3 rounded-lg border border-neutral-200 p-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-24 w-full rounded-md" />
    </div>
  ),
};
