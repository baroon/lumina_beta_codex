import type { Meta, StoryObj } from "@storybook/react";
import { ScanResultsScreen } from "./ScanResultsScreen";

const meta: Meta<typeof ScanResultsScreen> = {
  title: "Features/Reports/ScanResultsScreen",
  component: ScanResultsScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ScanResultsScreen>;

export const Default: Story = {
  args: { scanRunId: "story-scan-id" },
  parameters: {
    docs: {
      description: {
        story:
          "Renders the Scan Results page from a useScanResults hook fetch. In Storybook the API call will fail (no backend), so this story exercises the error path. Run the dev server + verify endpoint to see the populated layout.",
      },
    },
  },
};
