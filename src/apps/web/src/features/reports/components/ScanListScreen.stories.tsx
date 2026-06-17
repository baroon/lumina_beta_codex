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
          "Reporting Scan History page with operational summary metrics and linked scan rows. Storybook will render the error path unless the scans hook is mocked by the global preview.",
      },
    },
  },
};
