import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WorkspaceOverviewDto } from "@/types/api";
import { ClaimsRisksScreen } from "./ClaimsRisksScreen";

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
  coMentions: [],
  topBrandComparisons: [],
  topicOwnership: [],
  topBrandAttributes: [{ rank: 1, name: "credible", polarity: "Positive", mentionCount: 12 }],
  topBrandRiskFlags: [
    { rank: 1, flagType: "outdated_info", severity: "High", mentionCount: 8 },
    { rank: 2, flagType: "brand_confusion", severity: "Medium", mentionCount: 4 },
  ],
  recentFactualClaims: [
    {
      claimId: "claim-1",
      brandId: "brand-1",
      brandName: "India Today",
      subject: "circulation",
      assertedValue: "largest",
      claimText: "India Today is the largest news magazine.",
      evidenceSnippet: "circulation leadership snippet",
      verifiability: "Verifiable",
      reviewStatus: "Pending",
      createdAt: "2026-06-15T00:00:00.000Z",
    },
    {
      claimId: "claim-2",
      brandId: "brand-1",
      brandName: "India Today",
      subject: "ownership",
      assertedValue: "unknown",
      claimText: "India Today is owned by an incorrect entity.",
      evidenceSnippet: "ownership snippet",
      verifiability: "Subjective",
      reviewStatus: "Disputed",
      createdAt: "2026-06-14T00:00:00.000Z",
    },
  ],
};

const meta: Meta<typeof ClaimsRisksScreen> = {
  title: "Features/Reports/ClaimsRisksScreen",
  component: ClaimsRisksScreen,
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
type Story = StoryObj<typeof ClaimsRisksScreen>;

export const Default: Story = {};
