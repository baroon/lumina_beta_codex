import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { BrandDto, DiscoveryStatus, TrackerListItemDto } from "@/types/api";
import { BrandList } from "./BrandList";

const meta: Meta<typeof BrandList> = {
  title: "Features/Brands/BrandList",
  component: BrandList,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof BrandList>;

const brands: BrandDto[] = [
  createBrand("brand-1", "India Today", "https://www.indiatoday.in", "Completed"),
  createBrand("brand-2", "Business Today", "https://www.businesstoday.in", "Completed"),
  createBrand("brand-3", "Aaj Tak", "https://www.aajtak.in", "Pending"),
];

const trackers: TrackerListItemDto[] = [
  createTracker("tracker-1", "India Today visibility", "brand-1", "India Today", "Active", 18),
  createTracker(
    "tracker-2",
    "India Today content gaps",
    "brand-1",
    "India Today",
    "Draft",
    0,
    null,
  ),
  createTracker(
    "tracker-3",
    "Business Today source authority",
    "brand-2",
    "Business Today",
    "Active",
    9,
  ),
];

export const Default: Story = withBrandInventory(brands, trackers);

export const EmptyWorkspace: Story = withBrandInventory([], []);

export const BrandsWithoutTrackers: Story = withBrandInventory(brands, []);

function withBrandInventory(brandRows: BrandDto[], trackerRows: TrackerListItemDto[]): Story {
  return {
    decorators: [
      (StoryComponent) => {
        const queryClient = new QueryClient({
          defaultOptions: { queries: { retry: false, staleTime: Infinity } },
        });
        queryClient.setQueryData(["brands"], brandRows);
        queryClient.setQueryData(["all-trackers"], trackerRows);

        return (
          <QueryClientProvider client={queryClient}>
            <StoryComponent />
          </QueryClientProvider>
        );
      },
    ],
  };
}

function createBrand(
  id: string,
  name: string,
  websiteUrl: string,
  status: DiscoveryStatus,
): BrandDto {
  return {
    id,
    name,
    websiteUrl,
    createdAt: "2026-06-01T00:00:00Z",
    latestDiscovery: {
      id: `${id}-discovery`,
      status,
      pagesCrawled: status === "Completed" ? 12 : 4,
      startedAt: "2026-06-01T00:00:00Z",
      completedAt: status === "Completed" ? "2026-06-01T00:10:00Z" : null,
    },
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
