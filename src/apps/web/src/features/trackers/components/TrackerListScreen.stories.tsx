import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TrackerListItemDto } from "@/types/api";
import { TrackerListScreen } from "./TrackerListScreen";

const fixture: TrackerListItemDto[] = [
  {
    trackerId: "33b28ae4-a9fc-440d-8c4e-71356ca9ef30",
    name: "india Consultancy Visibility Tracker",
    brandId: "5f26b6a3-114c-44fc-aa14-49df23c7aedb",
    brandName: "Nostri",
    status: "Active",
    createdAt: "2026-04-15T12:00:00Z",
    scanCount: 8,
    latestScanCompletedAt: "2026-05-27T17:01:29Z",
  },
  {
    trackerId: "31951a42-5858-4217-b263-bd60c3d05d15",
    name: "Global News and Publishing Visibility Tracker",
    brandId: "10000000-0000-0000-0000-000000000001",
    brandName: "Acme",
    status: "Draft",
    createdAt: "2026-05-10T09:30:00Z",
    scanCount: 0,
    latestScanCompletedAt: null,
  },
];

const meta: Meta<typeof TrackerListScreen> = {
  title: "Features/Trackers/TrackerListScreen",
  component: TrackerListScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["all-trackers"], fixture);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof TrackerListScreen>;

export const Default: Story = {};

export const Empty: Story = {
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["all-trackers"], []);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
