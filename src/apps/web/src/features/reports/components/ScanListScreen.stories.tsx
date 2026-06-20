import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ScanListItemDto } from "@/types/api";
import { ScanListScreen } from "./ScanListScreen";

const scans: ScanListItemDto[] = [
  {
    scanRunId: "scan-1",
    trackerId: "tracker-1",
    trackerName: "India Today / News discovery",
    brandId: "brand-1",
    brandName: "India Today",
    startedAt: "2026-06-18T09:00:00.000Z",
    completedAt: "2026-06-18T09:05:00.000Z",
    scanStatus: "Completed",
    analysisStatus: "Completed",
    scanCheckCount: 20,
    completedCount: 20,
    failedCount: 0,
  },
  {
    scanRunId: "scan-2",
    trackerId: "tracker-1",
    trackerName: "India Today / News discovery",
    brandId: "brand-1",
    brandName: "India Today",
    startedAt: "2026-06-17T09:00:00.000Z",
    completedAt: "2026-06-17T09:04:00.000Z",
    scanStatus: "Failed",
    analysisStatus: "Failed",
    scanCheckCount: 20,
    completedCount: 14,
    failedCount: 6,
  },
  {
    scanRunId: "scan-3",
    trackerId: "tracker-2",
    trackerName: "India Today / App coverage",
    brandId: "brand-1",
    brandName: "India Today",
    startedAt: "2026-06-16T10:00:00.000Z",
    completedAt: null,
    scanStatus: "Running",
    analysisStatus: null,
    scanCheckCount: 16,
    completedCount: 8,
    failedCount: 0,
  },
];

const attentionScans: ScanListItemDto[] = [
  {
    scanRunId: "scan-failed",
    trackerId: "tracker-1",
    trackerName: "India Today / News discovery",
    brandId: "brand-1",
    brandName: "India Today",
    startedAt: "2026-06-19T09:00:00.000Z",
    completedAt: "2026-06-19T09:03:00.000Z",
    scanStatus: "Failed",
    analysisStatus: "Failed",
    scanCheckCount: 24,
    completedCount: 15,
    failedCount: 9,
  },
  {
    scanRunId: "scan-running",
    trackerId: "tracker-2",
    trackerName: "Business Today / Source authority",
    brandId: "brand-2",
    brandName: "Business Today",
    startedAt: "2026-06-19T10:00:00.000Z",
    completedAt: null,
    scanStatus: "Running",
    analysisStatus: null,
    scanCheckCount: 18,
    completedCount: 9,
    failedCount: 0,
  },
  {
    scanRunId: "scan-analysis",
    trackerId: "tracker-3",
    trackerName: "Aaj Tak / Competitive watch",
    brandId: "brand-3",
    brandName: "Aaj Tak",
    startedAt: "2026-06-18T15:00:00.000Z",
    completedAt: "2026-06-18T15:05:00.000Z",
    scanStatus: "Completed",
    analysisStatus: null,
    scanCheckCount: 20,
    completedCount: 20,
    failedCount: 0,
  },
];

const meta: Meta<typeof ScanListScreen> = {
  title: "Features/Reports/ScanListScreen",
  component: ScanListScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ScanListScreen>;

export const Default: Story = {
  ...withScans(scans),
  parameters: {
    docs: {
      description: {
        story:
          "Reporting Scan History page with operational summary metrics, attention cards, linked scan rows, and local v1 row/drawer actions.",
      },
    },
  },
};

export const EmptyHistory: Story = withScans([]);

export const NeedsAttention: Story = withScans(attentionScans);

function withScans(rows: ScanListItemDto[]): Story {
  return {
    decorators: [
      (StoryComponent) => {
        const queryClient = new QueryClient({
          defaultOptions: { queries: { retry: false, staleTime: Infinity } },
        });
        queryClient.setQueryData(["all-scans"], rows);
        return (
          <QueryClientProvider client={queryClient}>
            <StoryComponent />
          </QueryClientProvider>
        );
      },
    ],
  };
}
