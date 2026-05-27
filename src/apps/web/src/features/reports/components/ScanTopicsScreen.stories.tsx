import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ScanTopicsDto } from "@/types/api";
import { ScanTopicsScreen } from "./ScanTopicsScreen";

const fixture: ScanTopicsDto = {
  scanRunId: "scan-1",
  topics: [
    {
      topicId: "t1",
      topicName: "Sustainable Design",
      brandMentionRate: 0.45,
      brandRecommendationRate: 0.2,
      brandShareOfVoice: 0.55,
      averageBrandRank: 2.3,
      citationCount: 12,
      ownedCitationShare: 0.25,
      dominantSentiment: "Positive",
    },
    {
      topicId: "t2",
      topicName: "Urban Planning",
      brandMentionRate: 0.1,
      brandRecommendationRate: null,
      brandShareOfVoice: null,
      averageBrandRank: null,
      citationCount: 4,
      ownedCitationShare: 0.0,
      dominantSentiment: "Neutral",
    },
  ],
};

const meta: Meta<typeof ScanTopicsScreen> = {
  title: "Features/Reports/ScanTopicsScreen",
  component: ScanTopicsScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["scan-topics", "scan-1"], fixture);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof ScanTopicsScreen>;

export const Default: Story = {
  args: { scanRunId: "scan-1" },
};
