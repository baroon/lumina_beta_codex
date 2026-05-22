import type { Meta, StoryObj } from "@storybook/react";
import { Package } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const meta: Meta<typeof SectionHeader> = {
  title: "Molecules/SectionHeader",
  component: SectionHeader,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SectionHeader>;

export const Default: Story = {
  args: { title: "Products & Services", description: "What the brand offers" },
};

export const WithIcon: Story = {
  args: { icon: Package, title: "Products & Services", description: "What the brand offers" },
};

export const WithMetaAndActions: Story = {
  args: {
    icon: Package,
    title: "Products & Services",
    description: "What the brand offers",
    meta: <span className="text-sm text-neutral-500">3/6</span>,
  },
};
