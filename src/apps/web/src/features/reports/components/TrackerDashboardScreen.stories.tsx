import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TrackerTrendDto } from "@/types/api";
import { TrackerDashboardScreen } from "./TrackerDashboardScreen";

const trackerId = "33b28ae4-a9fc-440d-8c4e-71356ca9ef30";

const fixture: TrackerTrendDto = {
  trackerId,
  days: 30,
  windowStart: "2026-04-28T00:00:00Z",
  series: [
    {
      metricName: "BrandMentionRate",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s1", capturedAt: "2026-04-28T00:00:00Z", value: 0.25, category: null },
        { scanRunId: "s2", capturedAt: "2026-05-03T00:00:00Z", value: 0.28, category: null },
        { scanRunId: "s3", capturedAt: "2026-05-08T00:00:00Z", value: 0.3, category: null },
        { scanRunId: "s4", capturedAt: "2026-05-13T00:00:00Z", value: 0.32, category: null },
        { scanRunId: "s5", capturedAt: "2026-05-18T00:00:00Z", value: 0.35, category: null },
        { scanRunId: "s6", capturedAt: "2026-05-21T00:00:00Z", value: 0.38, category: null },
      ],
    },
    {
      metricName: "BrandShareOfVoice",
      seriesKind: "Numeric",
      points: [
        { scanRunId: "s1", capturedAt: "2026-04-28T00:00:00Z", value: 0.3, category: null },
        { scanRunId: "s2", capturedAt: "2026-05-03T00:00:00Z", value: 0.32, category: null },
        { scanRunId: "s3", capturedAt: "2026-05-08T00:00:00Z", value: 0.35, category: null },
        { scanRunId: "s4", capturedAt: "2026-05-13T00:00:00Z", value: 0.4, category: null },
        { scanRunId: "s5", capturedAt: "2026-05-18T00:00:00Z", value: 0.45, category: null },
        { scanRunId: "s6", capturedAt: "2026-05-21T00:00:00Z", value: 0.5, category: null },
      ],
    },
    {
      metricName: "OverallSentiment",
      seriesKind: "Categorical",
      points: [
        { scanRunId: "s1", capturedAt: "2026-04-28T00:00:00Z", value: null, category: "Neutral" },
        { scanRunId: "s2", capturedAt: "2026-05-03T00:00:00Z", value: null, category: "Neutral" },
        { scanRunId: "s3", capturedAt: "2026-05-08T00:00:00Z", value: null, category: "Positive" },
        { scanRunId: "s4", capturedAt: "2026-05-13T00:00:00Z", value: null, category: "Positive" },
        { scanRunId: "s5", capturedAt: "2026-05-18T00:00:00Z", value: null, category: "Positive" },
        { scanRunId: "s6", capturedAt: "2026-05-21T00:00:00Z", value: null, category: "Positive" },
      ],
    },
  ],
};

const meta: Meta<typeof TrackerDashboardScreen> = {
  title: "Features/Reports/TrackerDashboardScreen",
  component: TrackerDashboardScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["tracker-trend", trackerId, 30], fixture);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof TrackerDashboardScreen>;

export const Default: Story = {
  args: { trackerId },
};
