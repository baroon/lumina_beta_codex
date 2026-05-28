import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ScanCompetitorDetailDto } from "@/types/api";
import { ScanCompetitorDetailScreen } from "./ScanCompetitorDetailScreen";

const fixture: ScanCompetitorDetailDto = {
  scanRunId: "scan-1",
  competitorId: "c1",
  name: "Acme",
  domain: "acme.com",
  metrics: {
    mentionCount: 12,
    recommendationCount: 4,
    mentionRate: 0.4,
    recommendationRate: 0.33,
  },
  sourcesMentioningCompetitor: [
    {
      sourceId: "s1",
      sourceName: "Trustpilot",
      normalizedDomain: "trustpilot.com",
      citationCount: 5,
    },
    { sourceId: "s2", sourceName: "G2", normalizedDomain: "g2.com", citationCount: 3 },
    { sourceId: "s3", sourceName: "Reddit thread", normalizedDomain: null, citationCount: 1 },
  ],
};

const meta: Meta<typeof ScanCompetitorDetailScreen> = {
  title: "Features/Reports/ScanCompetitorDetailScreen",
  component: ScanCompetitorDetailScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["scan-competitor", "scan-1", "c1"], fixture);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof ScanCompetitorDetailScreen>;

export const Default: Story = {
  args: { scanRunId: "scan-1", competitorId: "c1" },
};
