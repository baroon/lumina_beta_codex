import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";

const meta: Meta<typeof Card> = {
  title: "Atoms/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-neutral-500">Card content area.</p>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-neutral-400">Footer</p>
      </CardFooter>
    </Card>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Card variant="default" className="w-60 p-4">
        <p className="text-sm font-medium">Default</p>
      </Card>
      <Card variant="outline" className="w-60 p-4">
        <p className="text-sm font-medium">Outline</p>
      </Card>
      <Card variant="ghost" className="w-60 p-4">
        <p className="text-sm font-medium">Ghost</p>
      </Card>
    </div>
  ),
};
