import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WorkspacePromptsDto } from "@/types/api";
import { PromptsScreen } from "./PromptsScreen";

const fixture: WorkspacePromptsDto = {
  workspaceId: "workspace-1",
  from: "2026-05-20T00:00:00.000Z",
  to: "2026-06-19T00:00:00.000Z",
  totalAllocation: 50,
  totalUsed: 3,
  trackers: [
    {
      id: "tracker-1",
      name: "India Today / News discovery",
      brandId: "brand-1",
      brandName: "India Today",
      promptAllocation: 50,
      promptUsed: 3,
      lenses: [
        { id: "lens-1", name: "Discovery" },
        { id: "lens-2", name: "Buying Intent" },
      ],
    },
  ],
  prompts: [
    {
      promptId: "prompt-1",
      text: "What are the most trusted news brands for Indian politics?",
      lensId: "lens-1",
      lensName: "Discovery",
      topics: ["Political news"],
      products: ["Digital news"],
      audiences: ["News readers"],
      markets: ["India"],
      marketCountryCodes: ["IN"],
      trackerId: "tracker-1",
      trackerName: "India Today / News discovery",
      brandId: "brand-1",
      brandName: "India Today",
      scanCount: 8,
      lastScanAt: "2026-06-18T09:00:00.000Z",
      platformCodes: ["ChatGpt", "Gemini"],
      visibilityRate: 0.62,
      brandMentionCount: 14,
      dominantSentiment: "Positive",
      averageFirstMentionPosition: 0.28,
    },
    {
      promptId: "prompt-2",
      text: "Which Indian news apps should I use for daily election coverage?",
      lensId: "lens-2",
      lensName: "Buying Intent",
      topics: ["Election coverage"],
      products: ["Mobile app"],
      audiences: ["Mobile readers"],
      markets: ["India"],
      marketCountryCodes: ["IN"],
      trackerId: "tracker-1",
      trackerName: "India Today / News discovery",
      brandId: "brand-1",
      brandName: "India Today",
      scanCount: 6,
      lastScanAt: "2026-06-17T11:00:00.000Z",
      platformCodes: ["ChatGpt"],
      visibilityRate: 0.18,
      brandMentionCount: 2,
      dominantSentiment: "Neutral",
      averageFirstMentionPosition: 0.64,
    },
    {
      promptId: "prompt-3",
      text: "Who provides reliable explainers on India's economy?",
      lensId: "lens-1",
      lensName: "Discovery",
      topics: ["Economy"],
      products: ["Explainers"],
      audiences: ["Business readers"],
      markets: ["India"],
      marketCountryCodes: ["IN"],
      trackerId: "tracker-1",
      trackerName: "India Today / News discovery",
      brandId: "brand-1",
      brandName: "India Today",
      scanCount: 0,
      lastScanAt: null,
      platformCodes: [],
      visibilityRate: null,
      brandMentionCount: 0,
      dominantSentiment: null,
      averageFirstMentionPosition: null,
    },
  ],
};

const meta: Meta<typeof PromptsScreen> = {
  title: "Features/Reports/AIQuestionsScreen",
  component: PromptsScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      queryClient.setQueryData(["workspace-prompts", "preset:30", ""], fixture);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof PromptsScreen>;

export const Default: Story = {};
