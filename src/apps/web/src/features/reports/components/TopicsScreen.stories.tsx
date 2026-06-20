import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WorkspaceOverviewDto } from "@/types/api";
import { TopicsScreen } from "./TopicsScreen";

const overview: WorkspaceOverviewDto = {
  workspaceId: "workspace-1",
  from: null,
  to: "2026-06-19T00:00:00.000Z",
  trackedBrands: [{ brandId: "brand-1", name: "India Today" }],
  competitors: [],
  scanCount: 4,
  hero: {
    queries: 100,
    mentions: 40,
    citations: 20,
    brandMentionRate: 0.4,
    brandAbsenceRate: 0.25,
    brandFirstMentionRate: 0.2,
  },
  previousHero: null,
  series: [],
  topEntities: [],
  topBrandAttributes: [],
  coMentions: [],
  topBrandRiskFlags: [],
  topBrandComparisons: [],
  topicOwnership: [
    {
      rank: 1,
      topicName: "Media credibility",
      promptCount: 10,
      brandMentionedPromptCount: 8,
    },
    {
      rank: 2,
      topicName: "Election analysis",
      promptCount: 8,
      brandMentionedPromptCount: 4,
    },
    {
      rank: 3,
      topicName: "Political news",
      promptCount: 6,
      brandMentionedPromptCount: 0,
    },
  ],
  recentFactualClaims: [],
};

const meta: Meta<typeof TopicsScreen> = {
  title: "Features/Reports/TopicsScreen",
  component: TopicsScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      queryClient.setQueryData(
        ["workspace-overview", "preset:30", "", "", "", "", "", "", "", ""],
        overview,
      );
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof TopicsScreen>;

export const Default: Story = {};
