import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ScanResultsDto } from "@/types/api";
import { ScanResultsScreen } from "./ScanResultsScreen";

const scanResults: ScanResultsDto = {
  scanRunId: "scan-1",
  summary: {
    trackerId: "tracker-1",
    trackerName: "India Today visibility",
    brandId: "brand-1",
    brandName: "India Today",
    startedAt: "2026-06-19T10:00:00Z",
    completedAt: "2026-06-19T10:08:00Z",
    scanStatus: "Completed",
    analysisStatus: "Completed",
    analysisError: null,
    scanCheckCount: 48,
    completedCount: 46,
    failedCount: 2,
    platforms: [
      { platformId: "platform-1", code: "ChatGpt", name: "ChatGPT" },
      { platformId: "platform-2", code: "Perplexity", name: "Perplexity" },
    ],
  },
  coreMetrics: {
    brandMentionRate: 0.58,
    brandRecommendationRate: 0.24,
    brandShareOfVoice: 0.42,
    brandFirstMentionRate: 0.31,
    averageBrandRankUniverseSize: null,
    brandRecommendationScore: 0.52,
    brandRecommendationShare: 0.39,
    brandAbsenceRate: 0.42,
    averageAnswerCertainty: 0.74,
    brandTopRecommendationShare: 0.22,
    averageBrandRecommendationPosition: 1.8,
    brandRiskFlagCount: 3,
    brandWinningComparisonCount: 8,
    brandLosingComparisonCount: 4,
    brandRecommendedForCount: 12,
    brandWithCaveatsCount: 5,
    brandTopicRecommendedCount: 7,
    brandTopicNotRecommendedCount: 3,
    highAuthorityCitationCount: 14,
    lowAuthorityCitationCount: 2,
    brandMentionRateMomentum: 0.08,
    brandShareOfVoiceMomentum: 0.04,
    brandAbsenceRateMomentum: -0.06,
    averageBrandRank: null,
    competitorMentionCount: 32,
    productMentionCount: 18,
    citationCount: 41,
    ownedCitationCount: 9,
    competitorCitationCount: 12,
    thirdPartyCitationCount: 18,
    unknownCitationCount: 2,
    brandSentimentDistribution: { Positive: 19, Neutral: 14, Negative: 4, Unknown: 9 },
    topCitedSources: [
      { rank: 1, sourceName: "indiatoday.in", citationCount: 9 },
      { rank: 2, sourceName: "Wikipedia", citationCount: 7 },
      { rank: 3, sourceName: "Reuters", citationCount: 5 },
    ],
    topBrandAttributes: [
      { rank: 1, name: "breaking news", polarity: "Positive", mentionCount: 13 },
      { rank: 2, name: "national coverage", polarity: "Positive", mentionCount: 11 },
      { rank: 3, name: "political reporting", polarity: "Neutral", mentionCount: 7 },
    ],
  },
  breakdowns: {
    byPlatform: [
      {
        platformId: "platform-1",
        platformName: "ChatGPT",
        brandMentionRate: 0.62,
        brandRecommendationRate: 0.27,
        brandShareOfVoice: 0.45,
        citationCount: 23,
        brandSentimentDistribution: { Positive: 11, Neutral: 8, Negative: 2 },
      },
      {
        platformId: "platform-2",
        platformName: "Perplexity",
        brandMentionRate: 0.54,
        brandRecommendationRate: 0.2,
        brandShareOfVoice: 0.38,
        citationCount: 18,
        brandSentimentDistribution: { Positive: 8, Neutral: 6, Negative: 2 },
      },
    ],
    byLens: [
      {
        lensId: "lens-1",
        lensName: "Discovery",
        brandMentionRate: 0.7,
        brandRecommendationRate: 0.3,
        brandShareOfVoice: 0.49,
        citationCount: 15,
        brandSentimentDistribution: { Positive: 8, Neutral: 4 },
      },
      {
        lensId: "lens-2",
        lensName: "Competitive",
        brandMentionRate: 0.46,
        brandRecommendationRate: 0.18,
        brandShareOfVoice: 0.35,
        citationCount: 11,
        brandSentimentDistribution: { Positive: 4, Neutral: 6, Negative: 2 },
      },
    ],
    byTopic: [
      {
        topicId: "topic-1",
        topicName: "National news",
        brandMentionRate: 0.68,
        brandRecommendationRate: 0.31,
        brandShareOfVoice: 0.5,
        citationCount: 16,
      },
      {
        topicId: "topic-2",
        topicName: "Business reporting",
        brandMentionRate: 0.37,
        brandRecommendationRate: 0.16,
        brandShareOfVoice: 0.29,
        citationCount: 8,
      },
    ],
    byCompetitor: [
      {
        competitorId: "competitor-1",
        competitorName: "NDTV",
        mentionCount: 18,
        recommendationCount: 7,
        shareOfVoice: 0.28,
        recommendationShare: 0.25,
      },
      {
        competitorId: "competitor-2",
        competitorName: "The Hindu",
        mentionCount: 14,
        recommendationCount: 5,
        shareOfVoice: 0.22,
        recommendationShare: 0.18,
      },
    ],
  },
};

const lowDataScan: ScanResultsDto = {
  ...scanResults,
  scanRunId: "scan-low-data",
  summary: {
    ...scanResults.summary,
    trackerName: "India Today new tracker",
    scanCheckCount: 12,
    completedCount: 12,
    failedCount: 0,
  },
  coreMetrics: {
    ...scanResults.coreMetrics,
    brandMentionRate: null,
    brandRecommendationRate: null,
    brandShareOfVoice: null,
    brandFirstMentionRate: null,
    brandAbsenceRate: null,
    averageAnswerCertainty: null,
    averageBrandRank: null,
    competitorMentionCount: 0,
    productMentionCount: 0,
    citationCount: 0,
    ownedCitationCount: 0,
    competitorCitationCount: 0,
    thirdPartyCitationCount: 0,
    unknownCitationCount: 0,
    brandSentimentDistribution: {},
    topCitedSources: [],
    topBrandAttributes: [],
  },
  breakdowns: {
    byPlatform: [],
    byLens: [],
    byTopic: [],
    byCompetitor: [],
  },
};

const meta: Meta<typeof ScanResultsScreen> = {
  title: "Features/Reports/ScanResultsScreen",
  component: ScanResultsScreen,
  tags: ["autodocs"],
  decorators: [
    (Story, context) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      if (context.args.scanRunId === scanResults.scanRunId) {
        queryClient.setQueryData(["scan-results", scanResults.scanRunId], scanResults);
      }
      if (context.args.scanRunId === lowDataScan.scanRunId) {
        queryClient.setQueryData(["scan-results", lowDataScan.scanRunId], lowDataScan);
      }

      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof ScanResultsScreen>;

export const Default: Story = {
  args: { scanRunId: scanResults.scanRunId },
};

export const LowData: Story = {
  args: { scanRunId: lowDataScan.scanRunId },
};
