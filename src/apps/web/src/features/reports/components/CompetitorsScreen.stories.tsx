import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  defaultDateRangeSelection,
  serializeDateRangeSelection,
} from "@/components/molecules/DateRangePicker";
import { previousSelectionFor } from "@/lib/previousWindow";
import type { WorkspaceCompetitiveDto, WorkspaceOverviewDto } from "@/types/api";
import { CompetitorsScreen } from "./CompetitorsScreen";

const selection = defaultDateRangeSelection();
const currentKey = serializeDateRangeSelection(selection);
const previousKey = serializeDateRangeSelection(previousSelectionFor(selection));
const emptyFilterSuffix = ["", "", "", "", "", "", "", ""];

const competitive: WorkspaceCompetitiveDto = {
  workspaceId: "workspace-1",
  from: "2026-05-20T00:00:00.000Z",
  to: "2026-06-19T00:00:00.000Z",
  topDomains: [],
  domainTypes: [],
  mentionDistribution: [
    {
      entityType: "Brand",
      entityId: "brand-1",
      name: "India Today",
      isTrackedBrand: true,
      mentionCount: 42,
      share: 0.44,
    },
    {
      entityType: "Competitor",
      entityId: "competitor-1",
      name: "Rival News",
      isTrackedBrand: false,
      mentionCount: 31,
      share: 0.33,
    },
    {
      entityType: "Competitor",
      entityId: "competitor-2",
      name: "The Hindu",
      isTrackedBrand: false,
      mentionCount: 19,
      share: 0.2,
    },
  ],
  recommendationRates: [
    {
      entityType: "Brand",
      entityId: "brand-1",
      name: "India Today",
      isTrackedBrand: true,
      mentionCount: 42,
      recommendationRate: 0.26,
    },
    {
      entityType: "Competitor",
      entityId: "competitor-1",
      name: "Rival News",
      isTrackedBrand: false,
      mentionCount: 31,
      recommendationRate: 0.34,
    },
    {
      entityType: "Competitor",
      entityId: "competitor-2",
      name: "The Hindu",
      isTrackedBrand: false,
      mentionCount: 19,
      recommendationRate: 0.18,
    },
  ],
  competitiveGaps: [
    {
      trackedBrandId: "brand-1",
      trackedBrandName: "India Today",
      gaps: [
        {
          competitorId: "competitor-1",
          competitorName: "Rival News",
          brandMentions: 42,
          competitorMentions: 31,
          mentionsGap: 11,
          brandRecommendations: 11,
          competitorRecommendations: 13,
          recommendationsGap: -2,
        },
      ],
    },
  ],
};

const previousCompetitive: WorkspaceCompetitiveDto = {
  ...competitive,
  mentionDistribution: [
    { ...competitive.mentionDistribution[0], mentionCount: 34, share: 0.4 },
    { ...competitive.mentionDistribution[1], mentionCount: 35, share: 0.41 },
    { ...competitive.mentionDistribution[2], mentionCount: 16, share: 0.19 },
  ],
};

const overview: WorkspaceOverviewDto = {
  workspaceId: "workspace-1",
  from: competitive.from,
  to: competitive.to,
  trackedBrands: [{ brandId: "brand-1", name: "India Today" }],
  competitors: [
    { competitorId: "competitor-1", name: "Rival News" },
    { competitorId: "competitor-2", name: "The Hindu" },
  ],
  scanCount: 6,
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

const meta: Meta<typeof CompetitorsScreen> = {
  title: "Features/Reports/CompetitorsScreen",
  component: CompetitorsScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      queryClient.setQueryData(
        ["workspace-competitive", currentKey, ...emptyFilterSuffix],
        competitive,
      );
      queryClient.setQueryData(
        ["workspace-competitive", previousKey, ...emptyFilterSuffix],
        previousCompetitive,
      );
      queryClient.setQueryData(["workspace-overview", currentKey, ...emptyFilterSuffix], overview);
      queryClient.setQueryData(["workspace-discovery-summary"], {
        products: [],
        markets: [],
        audiences: [],
        topics: [],
        trustSignals: [],
      });
      queryClient.setQueryData(["workspace-topic-counts", currentKey], []);
      queryClient.setQueryData(["workspace-product-counts", currentKey], []);
      queryClient.setQueryData(["workspace-market-counts", currentKey], []);
      queryClient.setQueryData(["workspace-audience-counts", currentKey], []);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof CompetitorsScreen>;

export const Default: Story = {};
