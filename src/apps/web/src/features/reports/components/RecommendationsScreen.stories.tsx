import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WorkspaceCompetitiveDto, WorkspaceOverviewDto } from "@/types/api";
import { RecommendationsScreen } from "./RecommendationsScreen";

const overview: WorkspaceOverviewDto = {
  workspaceId: "workspace-1",
  from: null,
  to: "2026-06-19T00:00:00.000Z",
  trackedBrands: [{ brandId: "brand-1", name: "India Today" }],
  competitors: [{ competitorId: "competitor-1", name: "Rival News" }],
  scanCount: 3,
  hero: {
    queries: 100,
    mentions: 20,
    citations: 10,
    brandMentionRate: 0.2,
    brandAbsenceRate: 0.45,
    brandFirstMentionRate: 0.12,
  },
  previousHero: null,
  series: [],
  topEntities: [],
  topBrandAttributes: [],
  coMentions: [],
  topBrandRiskFlags: [{ rank: 1, flagType: "outdated_info", severity: "High", mentionCount: 12 }],
  topBrandComparisons: [],
  topicOwnership: [
    {
      rank: 1,
      topicName: "Political news",
      promptCount: 8,
      brandMentionedPromptCount: 2,
    },
  ],
  recentFactualClaims: [
    {
      claimId: "claim-1",
      brandId: "brand-1",
      brandName: "India Today",
      subject: "circulation",
      assertedValue: "largest",
      claimText: "India Today is the largest news magazine by circulation.",
      evidenceSnippet: "AI answer cited circulation leadership.",
      verifiability: "Verifiable",
      reviewStatus: "Pending",
      createdAt: "2026-06-15T00:00:00.000Z",
    },
  ],
};

const competitive: WorkspaceCompetitiveDto = {
  workspaceId: "workspace-1",
  from: null,
  to: "2026-06-19T00:00:00.000Z",
  topDomains: [],
  domainTypes: [],
  mentionDistribution: [],
  recommendationRates: [],
  competitiveGaps: [
    {
      trackedBrandId: "brand-1",
      trackedBrandName: "India Today",
      gaps: [
        {
          competitorId: "competitor-1",
          competitorName: "Rival News",
          brandMentions: 5,
          competitorMentions: 11,
          mentionsGap: -6,
          brandRecommendations: 2,
          competitorRecommendations: 4,
          recommendationsGap: -2,
        },
      ],
    },
  ],
};

const meta: Meta<typeof RecommendationsScreen> = {
  title: "Features/Reports/RecommendationsScreen",
  component: RecommendationsScreen,
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
      queryClient.setQueryData(
        ["workspace-competitive", "preset:30", "", "", "", "", "", "", "", ""],
        competitive,
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
type Story = StoryObj<typeof RecommendationsScreen>;

export const Default: Story = {};
