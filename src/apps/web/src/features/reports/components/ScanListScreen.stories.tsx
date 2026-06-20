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

const meta: Meta<typeof ScanListScreen> = {
  title: "Features/Reports/ScanListScreen",
  component: ScanListScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      queryClient.setQueryData(["all-scans"], scans);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof ScanListScreen>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Reporting Scan History page with operational summary metrics, attention cards, linked scan rows, and local v1 row/drawer actions.",
      },
    },
  },
};
