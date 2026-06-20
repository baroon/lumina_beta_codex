import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ScanTopicDetailDto } from "@/types/api";
import { ScanTopicDetailScreen } from "./ScanTopicDetailScreen";

const fixture: ScanTopicDetailDto = {
  scanRunId: "scan-1",
  topicId: "t1",
  topicName: "Sustainable Design",
  metrics: {
    brandMentionRate: 0.45,
    brandRecommendationRate: 0.2,
    brandShareOfVoice: 0.55,
    averageBrandRank: 2.3,
    citationCount: 12,
    ownedCitationCount: 3,
    competitorCitationCount: 4,
    thirdPartyCitationCount: 4,
    unknownCitationCount: 1,
    brandSentimentDistribution: { Positive: 6, Neutral: 5, Negative: 1 },
  },
  byPlatform: [
    {
      platformId: "p1",
      platformCode: "openai",
      platformName: "ChatGPT",
      answerCount: 12,
      brandMentionRate: 0.5,
      brandRecommendationRate: 0.25,
      brandShareOfVoice: 0.6,
      citationCount: 7,
    },
    {
      platformId: "p2",
      platformCode: "gemini",
      platformName: "Gemini",
      answerCount: 6,
      brandMentionRate: 0.33,
      brandRecommendationRate: 0.0,
      brandShareOfVoice: 0.5,
      citationCount: 5,
    },
  ],
  topCitedSources: [
    { sourceId: "s1", sourceName: "ASLA", citationCount: 4 },
    { sourceId: "s2", sourceName: "Wikipedia", citationCount: 3 },
    { sourceId: "s3", sourceName: "Trustpilot", citationCount: 2 },
  ],
};

const meta: Meta<typeof ScanTopicDetailScreen> = {
  title: "Features/Reports/ScanTopicDetailScreen",
  component: ScanTopicDetailScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["scan-topic", "scan-1", "t1"], fixture);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof ScanTopicDetailScreen>;

export const Default: Story = {
  args: { scanRunId: "scan-1", topicId: "t1" },
};
