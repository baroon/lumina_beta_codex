import type { Meta, StoryObj } from "@storybook/react";
import { Package, Wrench, Puzzle, Lightbulb, Box, BookOpen } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./select";

const meta: Meta = {
  title: "Atoms/Select",
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Choose an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Small: Story = {
  render: () => (
    <Select>
      <SelectTrigger selectSize="sm">
        <SelectValue placeholder="Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Option A</SelectItem>
        <SelectItem value="b">Option B</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <Select>
      <SelectTrigger selectSize="sm">
        <SelectValue placeholder="Type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Product" icon={<Package className="h-3.5 w-3.5" />}>
          Product
        </SelectItem>
        <SelectItem value="Service" icon={<Wrench className="h-3.5 w-3.5" />}>
          Service
        </SelectItem>
        <SelectItem value="Feature" icon={<Puzzle className="h-3.5 w-3.5" />}>
          Feature
        </SelectItem>
        <SelectItem value="Solution" icon={<Lightbulb className="h-3.5 w-3.5" />}>
          Solution
        </SelectItem>
        <SelectItem value="Tool" icon={<Box className="h-3.5 w-3.5" />}>
          Tool
        </SelectItem>
        <SelectItem value="Resource" icon={<BookOpen className="h-3.5 w-3.5" />}>
          Resource
        </SelectItem>
      </SelectContent>
    </Select>
  ),
};
