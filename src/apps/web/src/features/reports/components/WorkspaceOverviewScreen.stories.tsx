import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WorkspaceCompetitiveDto, WorkspaceDepthDto, WorkspaceOverviewDto } from "@/types/api";
import { WorkspaceOverviewScreen } from "./WorkspaceOverviewScreen";

const acmeId = "11111111-1111-1111-1111-111111111111";
const betaId = "22222222-2222-2222-2222-222222222222";
const indeedId = "33333333-3333-3333-3333-333333333333";
const glassdoorId = "44444444-4444-4444-4444-444444444444";

const overviewFixture: WorkspaceOverviewDto = {
  workspaceId: "00000000-0000-0000-0000-000000000000",
  from: "2026-04-28T00:00:00Z",
  to: "2026-05-28T00:00:00Z",
  scanCount: 6,
  trackedBrands: [
    { brandId: acmeId, name: "Acme" },
    { brandId: betaId, name: "Beta" },
  ],
  competitors: [
    { competitorId: indeedId, name: "Indeed" },
    { competitorId: glassdoorId, name: "Glassdoor" },
  ],
  hero: {
    queries: 240,
    mentions: 137,
    citations: 41,
    brandMentionRate: 0.57,
    brandAbsenceRate: 0.32,
    brandFirstMentionRate: 0.41,
  },
  previousHero: {
    queries: 210,
    mentions: 122,
    citations: 45,
    brandMentionRate: 0.51,
    brandAbsenceRate: 0.4,
    brandFirstMentionRate: 0.33,
  },
  series: [
    {
      entityType: "Brand",
      entityId: acmeId,
      entityName: "Acme",
      metricName: "BrandMentionRate",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: 0.42, category: null },
        { scanRunId: "s2", capturedAt: "2026-05-10T00:00:00Z", value: 0.51, category: null },
        { scanRunId: "s3", capturedAt: "2026-05-21T00:00:00Z", value: 0.6, category: null },
      ],
    },
    {
      entityType: "Brand",
      entityId: betaId,
      entityName: "Beta",
      metricName: "BrandMentionRate",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: 0.31, category: null },
        { scanRunId: "s2", capturedAt: "2026-05-10T00:00:00Z", value: 0.36, category: null },
        { scanRunId: "s3", capturedAt: "2026-05-21T00:00:00Z", value: 0.4, category: null },
      ],
    },
    {
      entityType: "Competitor",
      entityId: indeedId,
      entityName: "Indeed",
      metricName: "MentionRate",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: 0.2, category: null },
        { scanRunId: "s2", capturedAt: "2026-05-10T00:00:00Z", value: 0.18, category: null },
        { scanRunId: "s3", capturedAt: "2026-05-21T00:00:00Z", value: 0.22, category: null },
      ],
    },
    {
      entityType: "Brand",
      entityId: acmeId,
      entityName: "Acme",
      metricName: "OverallSentiment",
      seriesKind: "Categorical",
      points: [
        { scanRunId: "s1", capturedAt: "2026-05-01T00:00:00Z", value: null, category: "Neutral" },
        { scanRunId: "s2", capturedAt: "2026-05-10T00:00:00Z", value: null, category: "Positive" },
        { scanRunId: "s3", capturedAt: "2026-05-21T00:00:00Z", value: null, category: "Positive" },
      ],
    },
  ],
  topEntities: [
    {
      entityType: "Brand",
      entityId: acmeId,
      name: "Acme",
      isTrackedBrand: true,
      visibility: 0.6,
      visibilityDelta: 0.09,
      shareOfVoice: 0.55,
      shareOfVoiceDelta: 0.03,
      sentiment: "Positive",
      sentimentDelta: 1,
    },
    {
      entityType: "Brand",
      entityId: betaId,
      name: "Beta",
      isTrackedBrand: true,
      visibility: 0.4,
      visibilityDelta: 0.04,
      shareOfVoice: 0.25,
      shareOfVoiceDelta: 0,
      sentiment: "Neutral",
      sentimentDelta: 0,
    },
    {
      entityType: "Competitor",
      entityId: indeedId,
      name: "Indeed",
      isTrackedBrand: false,
      visibility: 0.22,
      visibilityDelta: 0.04,
      shareOfVoice: null,
      shareOfVoiceDelta: null,
      sentiment: null,
      sentimentDelta: null,
    },
    {
      entityType: "Competitor",
      entityId: glassdoorId,
      name: "Glassdoor",
      isTrackedBrand: false,
      visibility: 0.18,
      visibilityDelta: -0.02,
      shareOfVoice: null,
      shareOfVoiceDelta: null,
      sentiment: null,
      sentimentDelta: null,
    },
  ],
  topBrandAttributes: [
    { rank: 1, name: "trustworthy", polarity: "Positive", mentionCount: 22 },
    { rank: 2, name: "easy to use", polarity: "Positive", mentionCount: 18 },
    { rank: 3, name: "in-depth", polarity: "Positive", mentionCount: 11 },
    { rank: 4, name: "expensive", polarity: "Negative", mentionCount: 7 },
    { rank: 5, name: "modern", polarity: "Neutral", mentionCount: 4 },
  ],
};

const competitiveFixture: WorkspaceCompetitiveDto = {
  workspaceId: overviewFixture.workspaceId,
  from: overviewFixture.from,
  to: overviewFixture.to,
  topDomains: [
    {
      sourceId: "src-trustpilot",
      sourceName: "Trustpilot",
      normalizedDomain: "trustpilot.com",
      sourceType: "Editorial",
      citationCount: 14,
      citationRate: 0.45,
    },
    {
      sourceId: "src-wikipedia",
      sourceName: "Wikipedia",
      normalizedDomain: "en.wikipedia.org",
      sourceType: "Reference",
      citationCount: 6,
      citationRate: 0.2,
    },
    {
      sourceId: "src-reddit",
      sourceName: "Reddit",
      normalizedDomain: "reddit.com",
      sourceType: "UGC",
      citationCount: 4,
      citationRate: 0.13,
    },
  ],
  domainTypes: [
    { sourceType: "Editorial", citationCount: 14, share: 0.5 },
    { sourceType: "Reference", citationCount: 6, share: 0.22 },
    { sourceType: "UGC", citationCount: 4, share: 0.14 },
    { sourceType: "ReviewSite", citationCount: 4, share: 0.14 },
  ],
  mentionDistribution: [
    {
      entityType: "Brand",
      entityId: acmeId,
      name: "Acme",
      isTrackedBrand: true,
      mentionCount: 56,
      share: 0.41,
    },
    {
      entityType: "Brand",
      entityId: betaId,
      name: "Beta",
      isTrackedBrand: true,
      mentionCount: 28,
      share: 0.2,
    },
    {
      entityType: "Competitor",
      entityId: indeedId,
      name: "Indeed",
      isTrackedBrand: false,
      mentionCount: 32,
      share: 0.23,
    },
    {
      entityType: "Competitor",
      entityId: glassdoorId,
      name: "Glassdoor",
      isTrackedBrand: false,
      mentionCount: 21,
      share: 0.15,
    },
  ],
  competitiveGaps: [
    {
      trackedBrandId: acmeId,
      trackedBrandName: "Acme",
      gaps: [
        {
          competitorId: indeedId,
          competitorName: "Indeed",
          brandMentions: 56,
          competitorMentions: 32,
          mentionsGap: 24,
          brandRecommendations: 18,
          competitorRecommendations: 9,
          recommendationsGap: 9,
        },
        {
          competitorId: glassdoorId,
          competitorName: "Glassdoor",
          brandMentions: 56,
          competitorMentions: 21,
          mentionsGap: 35,
          brandRecommendations: 18,
          competitorRecommendations: 4,
          recommendationsGap: 14,
        },
      ],
    },
    {
      trackedBrandId: betaId,
      trackedBrandName: "Beta",
      gaps: [
        {
          competitorId: indeedId,
          competitorName: "Indeed",
          brandMentions: 28,
          competitorMentions: 32,
          mentionsGap: -4,
          brandRecommendations: 7,
          competitorRecommendations: 9,
          recommendationsGap: -2,
        },
      ],
    },
  ],
  recommendationRates: [
    {
      entityType: "Brand",
      entityId: acmeId,
      name: "Acme",
      isTrackedBrand: true,
      mentionCount: 56,
      recommendationRate: 0.32,
    },
    {
      entityType: "Brand",
      entityId: betaId,
      name: "Beta",
      isTrackedBrand: true,
      mentionCount: 28,
      recommendationRate: 0.25,
    },
    {
      entityType: "Competitor",
      entityId: indeedId,
      name: "Indeed",
      isTrackedBrand: false,
      mentionCount: 32,
      recommendationRate: 0.28,
    },
  ],
};

const depthFixture: WorkspaceDepthDto = {
  workspaceId: overviewFixture.workspaceId,
  from: overviewFixture.from,
  to: overviewFixture.to,
  mentionsByPlatform: [
    {
      platformId: "p-openai",
      platformCode: "openai",
      platformName: "ChatGPT",
      answerCount: 80,
      brandMentionCount: 58,
      brandMentionRate: 0.725,
    },
    {
      platformId: "p-gemini",
      platformCode: "gemini",
      platformName: "Gemini",
      answerCount: 60,
      brandMentionCount: 33,
      brandMentionRate: 0.55,
    },
    {
      platformId: "p-claude",
      platformCode: "claude",
      platformName: "Claude",
      answerCount: 40,
      brandMentionCount: 21,
      brandMentionRate: 0.525,
    },
  ],
  sentimentDistribution: [
    { sentiment: "Positive", count: 64, share: 0.55 },
    { sentiment: "Neutral", count: 36, share: 0.31 },
    { sentiment: "Mixed", count: 9, share: 0.08 },
    { sentiment: "Negative", count: 7, share: 0.06 },
  ],
  topicHeatmap: {
    rows: ["Architecture", "Interior Design", "Urban Planning"],
    columns: ["ChatGPT", "Gemini", "Claude"],
    cells: [
      { row: "Architecture", column: "ChatGPT", answerCount: 22, citationCount: 9 },
      { row: "Architecture", column: "Gemini", answerCount: 16, citationCount: 5 },
      { row: "Architecture", column: "Claude", answerCount: 10, citationCount: 3 },
      { row: "Interior Design", column: "ChatGPT", answerCount: 14, citationCount: 6 },
      { row: "Interior Design", column: "Gemini", answerCount: 11, citationCount: 4 },
      { row: "Urban Planning", column: "ChatGPT", answerCount: 9, citationCount: 2 },
    ],
  },
  recentChats: [
    {
      answerId: "a1",
      promptRunId: "r1",
      promptText: "Best architecture firms for healthcare projects?",
      platformId: "p-openai",
      platformCode: "openai",
      platformName: "ChatGPT",
      lensCode: "category-discovery",
      lensName: "Category Discovery",
      answerSnippet: "Acme leads the field in healthcare architecture in NYC…",
      capturedAt: "2026-05-27T09:00:00Z",
      mentionCount: 4,
      citationCount: 3,
      brandSentiment: "Positive",
      brandName: "Acme",
    },
    {
      answerId: "a2",
      promptRunId: "r2",
      promptText: "Top firms for office interior design?",
      platformId: "p-gemini",
      platformCode: "gemini",
      platformName: "Gemini",
      lensCode: "category-discovery",
      lensName: "Category Discovery",
      answerSnippet: "Beta is a strong contender for modern office interior design…",
      capturedAt: "2026-05-26T18:30:00Z",
      mentionCount: 2,
      citationCount: 1,
      brandSentiment: "Neutral",
      brandName: "Beta",
    },
  ],
};

const meta: Meta<typeof WorkspaceOverviewScreen> = {
  title: "Features/Reports/WorkspaceOverviewScreen",
  component: WorkspaceOverviewScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["workspace-overview", 30], overviewFixture);
      queryClient.setQueryData(["workspace-competitive", 30], competitiveFixture);
      queryClient.setQueryData(["workspace-depth", 30], depthFixture);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof WorkspaceOverviewScreen>;

export const Default: Story = {};

export const EmptyWorkspace: Story = {
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["workspace-overview", 30], {
        ...overviewFixture,
        trackedBrands: [],
        competitors: [],
        scanCount: 0,
        hero: {
          queries: 0,
          mentions: 0,
          citations: 0,
          brandMentionRate: null,
          brandAbsenceRate: null,
          brandFirstMentionRate: null,
        },
        previousHero: null,
        series: [],
        topEntities: [],
        topBrandAttributes: [],
      } satisfies WorkspaceOverviewDto);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
