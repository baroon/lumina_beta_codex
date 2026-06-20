import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ScanClaimsDto } from "@/types/api";
import { ScanClaimsScreen } from "./ScanClaimsScreen";

const fixture: ScanClaimsDto = {
  scanRunId: "scan-1",
  claims: [
    {
      id: "claim-1",
      entityName: "India Today",
      entityType: "Brand",
      claimText: "India Today was founded in 1975.",
      subject: "founding_year",
      assertedValue: "1975",
      evidenceSnippet: "Founded in 1975 by Aroon Purie as a weekly news magazine.",
      verifiability: "Verifiable",
      reviewStatus: "Pending",
      confidenceScore: 0.9,
      createdAt: "2026-06-04T10:00:00Z",
    },
    {
      id: "claim-2",
      entityName: "India Today",
      entityType: "Brand",
      claimText: "India Today Group operates across digital, broadcast, and print channels.",
      subject: "channel_mix",
      assertedValue: "digital, broadcast, print",
      evidenceSnippet: "The group includes digital properties, TV news, and magazine brands.",
      verifiability: "NeedsContext",
      reviewStatus: "NeedsContext",
      confidenceScore: 0.74,
      createdAt: "2026-06-04T10:03:00Z",
    },
  ],
};

const meta: Meta<typeof ScanClaimsScreen> = {
  title: "Features/Reports/ScanClaimsScreen",
  component: ScanClaimsScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["scan-claims", "scan-1", "all"], fixture);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;
type Story = StoryObj<typeof ScanClaimsScreen>;

export const Default: Story = { args: { scanRunId: "scan-1" } };
