import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { BrandDto, TrackerListItemDto } from "@/types/api";
import { WorkspaceSettingsScreen } from "./WorkspaceSettingsScreen";

const meta: Meta<typeof WorkspaceSettingsScreen> = {
  title: "Features/Settings/WorkspaceSettingsScreen",
  component: WorkspaceSettingsScreen,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof WorkspaceSettingsScreen>;

const defaultBrands: BrandDto[] = [
  createBrand("brand-1", "India Today"),
  createBrand("brand-2", "Business Today"),
  createBrand("brand-3", "Aaj Tak"),
];

const defaultTrackers: TrackerListItemDto[] = [
  createTracker("tracker-1", "India Today visibility", "brand-1", "India Today", "Active", 12),
  createTracker("tracker-2", "Business Today visibility", "brand-2", "Business Today", "Active", 6),
  createTracker("tracker-3", "Aaj Tak visibility", "brand-3", "Aaj Tak", "Paused", 4),
  createTracker("tracker-4", "Competitor watch", "brand-1", "India Today", "Active", 0),
  createTracker("tracker-5", "Source authority", "brand-2", "Business Today", "Active", 0),
];

const nearLimitBrands = Array.from({ length: 8 }, (_, index) =>
  createBrand(`brand-${index + 1}`, `Brand ${index + 1}`),
);

const nearLimitTrackers = Array.from({ length: 25 }, (_, index) =>
  createTracker(
    `tracker-${index + 1}`,
    `Tracker ${index + 1}`,
    nearLimitBrands[index % nearLimitBrands.length].id,
    nearLimitBrands[index % nearLimitBrands.length].name,
    index < 18 ? "Active" : "Paused",
    index < 24 ? 17 : 9,
  ),
);

export const Default: Story = withWorkspaceData(defaultBrands, defaultTrackers);

export const EmptyWorkspace: Story = withWorkspaceData([], []);

export const NearLimits: Story = withWorkspaceData(nearLimitBrands, nearLimitTrackers);

function withWorkspaceData(brands: BrandDto[], trackers: TrackerListItemDto[]): Story {
  return {
    decorators: [
      (StoryComponent) => {
        const queryClient = new QueryClient({
          defaultOptions: { queries: { retry: false, staleTime: Infinity } },
        });
        queryClient.setQueryData(["settings-brands"], brands);
        queryClient.setQueryData(["settings-trackers"], trackers);

        return (
          <QueryClientProvider client={queryClient}>
            <StoryComponent />
          </QueryClientProvider>
        );
      },
    ],
  };
}

function createBrand(id: string, name: string): BrandDto {
  return {
    id,
    name,
    websiteUrl: `https://${name.toLowerCase().replace(/\s+/g, "-")}.example`,
    createdAt: "2026-06-01T00:00:00Z",
    latestDiscovery: null,
  };
}

function createTracker(
  trackerId: string,
  name: string,
  brandId: string,
  brandName: string,
  status: string,
  scanCount: number,
): TrackerListItemDto {
  return {
    trackerId,
    name,
    brandId,
    brandName,
    status,
    createdAt: "2026-06-01T00:00:00Z",
    scanCount,
    latestScanCompletedAt: scanCount > 0 ? "2026-06-19T00:00:00Z" : null,
  };
}
