import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ScanSourcesDto, SourceTypeReferenceDto } from "@/types/api";
import { ScanSourcesScreen } from "./ScanSourcesScreen";

const sources: ScanSourcesDto = {
  scanRunId: "scan-1",
  brandId: "brand-1",
  sources: [
    {
      sourceId: "s1",
      sourceName: "American Society of Landscape Architects (ASLA)",
      domain: "asla.org",
      normalizedDomain: "asla.org",
      sourceType: "Institutional",
      status: "Active",
      provenanceSource: "LLMClassified",
      confidenceScore: 0.9,
      citationCount: 5,
      platforms: [{ platformId: "p1", code: "openai", name: "ChatGPT" }],
    },
    {
      sourceId: "s2",
      sourceName: "Trustpilot",
      domain: "trustpilot.com",
      normalizedDomain: "trustpilot.com",
      sourceType: "ReviewSite",
      status: "UserCorrected",
      provenanceSource: "UserCorrected",
      confidenceScore: 1.0,
      citationCount: 3,
      platforms: [{ platformId: "p1", code: "openai", name: "ChatGPT" }],
    },
  ],
};

const sourceTypes: SourceTypeReferenceDto[] = [
  {
    id: "1",
    code: "Owned",
    name: "Owned",
    description: "The brand's own properties.",
    displayOrder: 1,
  },
  { id: "2", code: "Editorial", name: "Editorial", description: "News articles.", displayOrder: 5 },
  {
    id: "3",
    code: "Institutional",
    name: "Institutional",
    description: "Government, NGO.",
    displayOrder: 8,
  },
  {
    id: "4",
    code: "ReviewSite",
    name: "Review Site",
    description: "G2, Trustpilot.",
    displayOrder: 6,
  },
];

const meta: Meta<typeof ScanSourcesScreen> = {
  title: "Features/Reports/ScanSourcesScreen",
  component: ScanSourcesScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["scan-sources", "scan-1"], sources);
      queryClient.setQueryData(["source-types"], sourceTypes);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof ScanSourcesScreen>;

export const Default: Story = {
  args: { scanRunId: "scan-1" },
};
