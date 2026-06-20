import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WorkspaceOverviewDto } from "@/types/api";
import { LensDetailScreen } from "./LensDetailScreen";

const baseOverview: WorkspaceOverviewDto = {
  workspaceId: "workspace-1",
  from: null,
  to: "2026-06-19T00:00:00.000Z",
  trackedBrands: [{ brandId: "brand-1", name: "India Today" }],
  competitors: [
    { competitorId: "competitor-1", name: "NDTV" },
    { competitorId: "competitor-2", name: "The Hindu" },
  ],
  scanCount: 8,
  hero: {
    queries: 120,
    mentions: 72,
    citations: 34,
    brandMentionRate: 0.6,
    brandAbsenceRate: 0.28,
    brandFirstMentionRate: 0.34,
  },
  previousHero: {
    queries: 96,
    mentions: 50,
    citations: 29,
    brandMentionRate: 0.52,
    brandAbsenceRate: 0.36,
    brandFirstMentionRate: 0.27,
  },
  series: [],
  topEntities: [
    {
      entityType: "Brand",
      entityId: "brand-1",
      name: "India Today",
      isTrackedBrand: true,
      visibility: 0.6,
      visibilityDelta: 0.08,
      shareOfVoice: 0.44,
      shareOfVoiceDelta: 0.04,
      sentiment: "Positive",
      sentimentDelta: 1,
    },
    {
      entityType: "Competitor",
      entityId: "competitor-1",
      name: "NDTV",
      isTrackedBrand: false,
      visibility: 0.42,
      visibilityDelta: -0.02,
      shareOfVoice: 0.31,
      shareOfVoiceDelta: -0.03,
      sentiment: "Neutral",
      sentimentDelta: 0,
    },
    {
      entityType: "Competitor",
      entityId: "competitor-2",
      name: "The Hindu",
      isTrackedBrand: false,
      visibility: 0.29,
      visibilityDelta: 0.02,
      shareOfVoice: 0.25,
      shareOfVoiceDelta: 0,
      sentiment: "Positive",
      sentimentDelta: 1,
    },
  ],
  topBrandAttributes: [],
  coMentions: [],
  topBrandRiskFlags: [],
  topBrandComparisons: [],
  topicOwnership: [],
  recentFactualClaims: [],
};

const buyingIntentOverview: WorkspaceOverviewDto = {
  ...baseOverview,
  hero: {
    ...baseOverview.hero,
    queries: 48,
    mentions: 12,
    brandMentionRate: 0.25,
    brandAbsenceRate: 0.62,
    brandFirstMentionRate: 0.12,
  },
};

const emptyOverview: WorkspaceOverviewDto = {
  ...baseOverview,
  hero: {
    ...baseOverview.hero,
    queries: 0,
    mentions: 0,
    citations: 0,
    brandMentionRate: 0,
    brandAbsenceRate: 0,
    brandFirstMentionRate: 0,
  },
  topEntities: [],
};

const meta: Meta<typeof LensDetailScreen> = {
  title: "Features/Reports/LensDetailScreen",
  component: LensDetailScreen,
  tags: ["autodocs"],
  decorators: [
    (Story, context) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      seedOverview(queryClient, "Discovery", baseOverview);
      seedOverview(queryClient, "BuyingIntent", buyingIntentOverview);
      seedOverview(queryClient, "CitationVisibility", emptyOverview);

      return (
        <QueryClientProvider client={queryClient}>
          <Story {...context.args} />
        </QueryClientProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof LensDetailScreen>;

export const Discovery: Story = {
  args: { lensId: "discovery" },
};

export const BuyingIntentNeedsAttention: Story = {
  args: { lensId: "buying-intent" },
};

export const EmptyCitations: Story = {
  args: { lensId: "citations" },
};

function seedOverview(queryClient: QueryClient, lensCode: string, overview: WorkspaceOverviewDto) {
  queryClient.setQueryData(
    ["workspace-overview", "preset:30", lensCode, "", "", "", "", "", "", ""],
    overview,
  );
}
