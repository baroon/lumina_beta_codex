import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { LensCountDto, WorkspaceOverviewDto } from "@/types/api";
import { LensesScreen } from "./LensesScreen";

const overview: WorkspaceOverviewDto = {
  workspaceId: "workspace-1",
  from: "2026-05-20T00:00:00.000Z",
  to: "2026-06-19T00:00:00.000Z",
  trackedBrands: [{ brandId: "brand-1", name: "India Today" }],
  competitors: [
    { competitorId: "competitor-1", name: "NDTV" },
    { competitorId: "competitor-2", name: "The Hindu" },
  ],
  scanCount: 8,
  hero: {
    queries: 120,
    mentions: 54,
    citations: 32,
    brandMentionRate: 0.45,
    brandAbsenceRate: 0.28,
    brandFirstMentionRate: 0.2,
  },
  previousHero: null,
  series: [],
  topEntities: [],
  topBrandAttributes: [],
  coMentions: [],
  topBrandRiskFlags: [],
  topBrandComparisons: [],
  topicOwnership: [],
  recentFactualClaims: [],
};

const lensCounts: LensCountDto[] = [
  { lensCode: "Discovery", mentionCount: 12 },
  { lensCode: "BuyingIntent", mentionCount: 6 },
  { lensCode: "CompetitorComparison", mentionCount: 2 },
  { lensCode: "SentimentAndTrust", mentionCount: 0 },
  { lensCode: "CitationVisibility", mentionCount: 4 },
  { lensCode: "ContentGaps", mentionCount: 1 },
];

const meta: Meta<typeof LensesScreen> = {
  title: "Features/Reports/LensesScreen",
  component: LensesScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(
        ["workspace-overview", "preset:30", "", "", "", "", "", "", "", ""],
        overview,
      );
      queryClient.setQueryData(["workspace-lens-counts", "preset:30"], lensCounts);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof LensesScreen>;

export const Default: Story = {};
