import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TrackerDashboardDto } from "@/types/api";
import { TrackerDashboardV2Screen } from "./TrackerDashboardV2Screen";

const trackerId = "33b28ae4-a9fc-440d-8c4e-71356ca9ef30";
const brandId = "5f26b6a3-114c-44fc-aa14-49df23c7aedb";
const gensler = "07a50bba-e1ad-41f6-80a9-c5f8696935d3";
const hok = "2875f0ce-9726-4f0b-9041-f05941e0ff17";

const dates = [
  "2026-04-28T00:00:00Z",
  "2026-05-03T00:00:00Z",
  "2026-05-08T00:00:00Z",
  "2026-05-13T00:00:00Z",
  "2026-05-18T00:00:00Z",
  "2026-05-21T00:00:00Z",
];

function series(
  entityType: string,
  entityId: string,
  entityName: string,
  metricName: string,
  values: (number | null)[],
) {
  return {
    entityType,
    entityId,
    entityName,
    metricName,
    seriesKind: "Numeric",
    points: dates.map((d, i) => ({
      scanRunId: `scan-${i}`,
      capturedAt: d,
      value: values[i],
      category: null,
    })),
  };
}

const fixture: TrackerDashboardDto = {
  trackerId,
  trackerName: "india Consultancy Visibility Tracker",
  brandId,
  brandName: "Nostri",
  days: 30,
  windowStart: "2026-04-28T00:00:00Z",
  scanCount: 6,
  hero: {
    queries: 180,
    mentions: 96,
    citations: 12,
    brandMentionRate: 0.33,
  },
  series: [
    series("Brand", brandId, "Nostri", "BrandMentionRate", [0.25, 0.28, 0.3, 0.32, 0.35, 0.38]),
    series(
      "Brand",
      brandId,
      "Nostri",
      "BrandRecommendationRate",
      [0.08, 0.1, 0.12, 0.13, 0.15, 0.18],
    ),
    series("Competitor", gensler, "Gensler", "MentionRate", [0.27, 0.23, 0.23, 0.2, 0.17, 0.17]),
    series(
      "Competitor",
      gensler,
      "Gensler",
      "RecommendationRate",
      [0.25, 0.29, 0.14, 0.17, 0.2, 0.2],
    ),
    series("Competitor", hok, "HOK", "MentionRate", [0.2, 0.2, 0.17, 0.17, 0.17, 0.13]),
    series("Competitor", hok, "HOK", "RecommendationRate", [0.17, 0.17, 0.2, 0.2, 0.2, 0.0]),
  ],
  topBrands: [
    {
      entityType: "Brand",
      entityId: brandId,
      name: "Nostri",
      isTrackedBrand: true,
      visibility: 0.38,
      visibilityDelta: 0.03,
      shareOfVoice: 0.5,
      shareOfVoiceDelta: 0.05,
      sentiment: "Positive",
    },
    {
      entityType: "Competitor",
      entityId: gensler,
      name: "Gensler",
      isTrackedBrand: false,
      visibility: 0.17,
      visibilityDelta: 0.0,
      shareOfVoice: null,
      shareOfVoiceDelta: null,
      sentiment: null,
    },
    {
      entityType: "Competitor",
      entityId: hok,
      name: "HOK",
      isTrackedBrand: false,
      visibility: 0.13,
      visibilityDelta: -0.04,
      shareOfVoice: null,
      shareOfVoiceDelta: null,
      sentiment: null,
    },
  ],
};

const meta: Meta<typeof TrackerDashboardV2Screen> = {
  title: "Features/Reports/TrackerDashboardV2Screen",
  component: TrackerDashboardV2Screen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["tracker-dashboard", trackerId, 30], fixture);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof TrackerDashboardV2Screen>;

export const Default: Story = {
  args: { trackerId },
};
