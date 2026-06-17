import type { Meta, StoryObj } from "@storybook/react";
import { PRODUCT_PAGES } from "@/content/productPages";
import { ProductPageScaffold } from "./ProductPageScaffold";

const meta: Meta<typeof ProductPageScaffold> = {
  title: "Features/Reports/ProductPageScaffold",
  component: ProductPageScaffold,
  tags: ["autodocs"],
  args: {
    page: PRODUCT_PAGES.lenses,
  },
};

export default meta;
type Story = StoryObj<typeof ProductPageScaffold>;

export const Lenses: Story = {};

export const Recommendations: Story = {
  args: {
    page: PRODUCT_PAGES.recommendations,
  },
};
