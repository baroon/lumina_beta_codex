import type { Meta, StoryObj } from "@storybook/react";
import { AppShell } from "./AppShell";

const meta: Meta<typeof AppShell> = {
  title: "Organisms/AppShell",
  component: AppShell,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof AppShell>;

export const Default: Story = {
  args: {
    children: (
      <div className="flex h-64 items-center justify-center text-neutral-400">
        Main content area
      </div>
    ),
  },
};

export const WithContent: Story = {
  args: {
    children: (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">Welcome to Lumina.</p>
      </div>
    ),
  },
};
