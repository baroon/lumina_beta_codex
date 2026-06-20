import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TrackerListItemDto } from "@/types/api";
import { TrackersScreen } from "./TrackersScreen";

const meta: Meta<typeof TrackersScreen> = {
  title: "Features/Trackers/TrackersScreen",
  component: TrackersScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TrackersScreen>;

const trackers: TrackerListItemDto[] = [
  createTracker("tracker-1", "India Today visibility", "brand-1", "India Today", "Active", 18),
  createTracker(
    "tracker-2",
    "Business Today source authority",
    "brand-2",
    "Business Today",
    "Active",
    9,
  ),
  createTracker("tracker-3", "Aaj Tak competitive watch", "brand-3", "Aaj Tak", "Paused", 3),
  createTracker(
    "tracker-4",
    "India Today content gaps",
    "brand-1",
    "India Today",
    "Draft",
    0,
    null,
  ),
];

const attentionTrackers: TrackerListItemDto[] = [
  createTracker("tracker-1", "Draft launch tracker", "brand-1", "India Today", "Draft", 0, null),
  createTracker(
    "tracker-2",
    "Paused weekly tracker",
    "brand-2",
    "Business Today",
    "Paused",
    2,
    null,
  ),
  createTracker("tracker-3", "Healthy tracker", "brand-3", "Aaj Tak", "Active", 12),
];

export const Default: Story = withTrackers(trackers);

export const EmptyWorkspace: Story = withTrackers([]);

export const NeedsAttention: Story = withTrackers(attentionTrackers);

function withTrackers(rows: TrackerListItemDto[]): Story {
  return {
    decorators: [
      (StoryComponent) => {
        const queryClient = new QueryClient({
          defaultOptions: { queries: { retry: false, staleTime: Infinity } },
        });
        queryClient.setQueryData(["all-trackers"], rows);

        return (
          <QueryClientProvider client={queryClient}>
            <StoryComponent />
          </QueryClientProvider>
        );
      },
    ],
  };
}

function createTracker(
  trackerId: string,
  name: string,
  brandId: string,
  brandName: string,
  status: string,
  scanCount: number,
  latestScanCompletedAt: string | null = "2026-06-19T00:00:00Z",
): TrackerListItemDto {
  return {
    trackerId,
    name,
    brandId,
    brandName,
    status,
    createdAt: "2026-06-01T00:00:00Z",
    scanCount,
    latestScanCompletedAt,
  };
}
