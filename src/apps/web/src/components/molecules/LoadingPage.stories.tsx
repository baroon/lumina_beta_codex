import type { Meta, StoryObj } from "@storybook/react";
import { LoadingPage } from "./LoadingPage";

const meta: Meta<typeof LoadingPage> = {
  title: "Molecules/LoadingPage",
  component: LoadingPage,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof LoadingPage>;

export const Default: Story = {};
