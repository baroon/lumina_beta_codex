import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WorkspaceCompetitiveDto, WorkspaceOverviewDto } from "@/types/api";
import { ReportsScreen } from "./ReportsScreen";

const overview: WorkspaceOverviewDto = {
  workspaceId: "workspace-1",
  from: null,
  to: "2026-06-19T00:00:00.000Z",
  trackedBrands: [{ brandId: "brand-1", name: "India Today" }],
  competitors: [{ competitorId: "competitor-1", name: "Rival News" }],
  scanCount: 4,
  hero: {
    queries: 100,
    mentions: 40,
    citations: 20,
    brandMentionRate: 0.4,
    brandAbsenceRate: 0.35,
    brandFirstMentionRate: 0.2,
  },
  previousHero: null,
  series: [],
  topEntities: [
    {
      entityType: "Brand",
      entityId: "brand-1",
      name: "India Today",
      isTrackedBrand: true,
      visibility: 0.4,
      visibilityDelta: 0.1,
      shareOfVoice: 0.45,
      shareOfVoiceDelta: 0.05,
      sentiment: "Positive",
      sentimentDelta: 1,
    },
  ],
  topBrandAttributes: [],
  coMentions: [],
  topBrandRiskFlags: [{ rank: 1, flagType: "Accuracy", severity: "High", mentionCount: 3 }],
  topBrandComparisons: [],
  topicOwnership: [
    {
      rank: 1,
      topicName: "AI visibility",
      promptCount: 10,
      brandMentionedPromptCount: 2,
    },
  ],
  recentFactualClaims: [
    {
      claimId: "claim-1",
      brandId: "brand-1",
      brandName: "India Today",
      subject: "pricing",
      assertedValue: "transparent",
      claimText: "India Today has transparent pricing.",
      evidenceSnippet: "Pricing is transparent.",
      verifiability: "Verifiable",
      reviewStatus: "NeedsContext",
      createdAt: "2026-06-01T00:00:00Z",
    },
  ],
};

const competitive: WorkspaceCompetitiveDto = {
  workspaceId: "workspace-1",
  from: null,
  to: "2026-06-19T00:00:00.000Z",
  topDomains: [],
  domainTypes: [],
  mentionDistribution: [
    {
      entityId: "brand-1",
      name: "India Today",
      entityType: "Brand",
      isTrackedBrand: true,
      mentionCount: 10,
      share: 0.5,
    },
  ],
  competitiveGaps: [],
  recommendationRates: [],
};

const meta: Meta<typeof ReportsScreen> = {
  title: "Features/Reports/ReportsScreen",
  component: ReportsScreen,
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
type Story = StoryObj<typeof ReportsScreen>;

export const Default: Story = {};
