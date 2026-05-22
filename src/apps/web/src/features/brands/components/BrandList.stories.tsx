import type { Meta, StoryObj } from "@storybook/react";
import { BrandList } from "./BrandList";

const meta: Meta<typeof BrandList> = {
  title: "Features/Brands/BrandList",
  component: BrandList,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof BrandList>;

export const Default: Story = {};
