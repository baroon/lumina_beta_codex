import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ScanCompetitorsDto } from "@/types/api";
import { ScanCompetitorsScreen } from "./ScanCompetitorsScreen";

const fixture: ScanCompetitorsDto = {
  scanRunId: "scan-1",
  competitors: [
    {
      competitorId: "c1",
      name: "Acme",
      domain: "acme.com",
      mentionCount: 12,
      recommendationCount: 4,
      mentionRate: 0.4,
      recommendationRate: 0.33,
    },
    {
      competitorId: "c2",
      name: "Beta",
      domain: "beta.com",
      mentionCount: 5,
      recommendationCount: 0,
      mentionRate: 0.16,
      recommendationRate: 0,
    },
  ],
};

const meta: Meta<typeof ScanCompetitorsScreen> = {
  title: "Features/Reports/ScanCompetitorsScreen",
  component: ScanCompetitorsScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["scan-competitors", "scan-1"], fixture);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof ScanCompetitorsScreen>;

export const Default: Story = {
  args: { scanRunId: "scan-1" },
};
