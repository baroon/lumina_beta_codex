import type { Meta, StoryObj } from "@storybook/react";
import { PageHeader } from "./PageHeader";
import { Button } from "../atoms/button";

const meta: Meta<typeof PageHeader> = {
  title: "Molecules/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  decorators: [(Story) => <div className="w-[600px]"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const TitleOnly: Story = {
  args: { title: "Page Title" },
};

export const WithDescription: Story = {
  args: {
    title: "Page Title",
    description: "A brief description of this page.",
  },
};

export const WithActions: Story = {
  render: () => (
    <PageHeader title="Discovery" description="Review your brand discovery results.">
      <Button size="sm">Export</Button>
      <Button size="sm" variant="outline">Settings</Button>
    </PageHeader>
  ),
};
