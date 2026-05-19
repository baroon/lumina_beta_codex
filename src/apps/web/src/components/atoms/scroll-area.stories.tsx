import type { Meta, StoryObj } from "@storybook/react";
import { ScrollArea } from "./scroll-area";

const meta: Meta<typeof ScrollArea> = {
  title: "Atoms/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ScrollArea>;

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-48 w-64 rounded-md border border-neutral-200 p-4">
      {Array.from({ length: 20 }, (_, i) => (
        <p key={i} className="py-1 text-sm text-neutral-700">
          Item {i + 1}
        </p>
      ))}
    </ScrollArea>
  ),
};
