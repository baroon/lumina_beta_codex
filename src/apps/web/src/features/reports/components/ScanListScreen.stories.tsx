import type { Meta, StoryObj } from "@storybook/react";
import { ScanListScreen } from "./ScanListScreen";

const meta: Meta<typeof ScanListScreen> = {
  title: "Features/Reports/ScanListScreen",
  component: ScanListScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ScanListScreen>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Temporary cross-tracker scan index. Storybook will render the error path since no backend is available; run the dev servers to see the populated table with linked rows.",
      },
    },
  },
};
