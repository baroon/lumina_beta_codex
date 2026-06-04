import type { Meta, StoryObj } from "@storybook/react";
import { ScanClaimsScreen } from "./ScanClaimsScreen";

const meta: Meta<typeof ScanClaimsScreen> = {
  title: "Features/Reports/ScanClaimsScreen",
  component: ScanClaimsScreen,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof ScanClaimsScreen>;

// The screen reads via a React Query hook; storybook renders the loading
// state by default because no data is wired. Useful for visual review of
// chrome + filter buttons.
export const Default: Story = { args: { scanRunId: "scan-1" } };
