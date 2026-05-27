import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ScanSourceCitationsDto } from "@/types/api";
import { SourceCitationsDrawer } from "./SourceCitationsDrawer";

const fixture: ScanSourceCitationsDto = {
  scanRunId: "scan-1",
  sourceId: "source-1",
  sourceName: "American Society of Landscape Architects (ASLA)",
  domain: "asla.org",
  citations: [
    {
      citationId: "c1",
      aiAnswerId: "a1",
      citationType: "ExplicitUrl",
      url: "https://asla.org/page",
      answerSnippet:
        "ASLA's guidance recommends prioritising native plant palettes for stormwater management in urban contexts. The professional body has published several technical resources for member firms.",
      promptText:
        "What are the best practices for urban stormwater management in landscape architecture?",
      platformCode: "openai",
      platformName: "ChatGPT",
      lensName: "Discovery",
      citedAt: "2026-05-27T10:00:00Z",
    },
    {
      citationId: "c2",
      aiAnswerId: "a2",
      citationType: "MentionedSource",
      url: null,
      answerSnippet:
        "According to the American Society of Landscape Architects, sustainable design practices have become a core competency expected by clients across all market segments.",
      promptText: "Which professional associations should landscape architects join?",
      platformCode: "claude",
      platformName: "Claude",
      lensName: null,
      citedAt: "2026-05-27T10:05:00Z",
    },
  ],
};

const meta: Meta<typeof SourceCitationsDrawer> = {
  title: "Features/Reports/SourceCitationsDrawer",
  component: SourceCitationsDrawer,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      // Pre-populate the cache so the drawer renders instantly in Storybook.
      queryClient.setQueryData(["scan-source-citations", "scan-1", "source-1"], fixture);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof SourceCitationsDrawer>;

export const Open: Story = {
  args: {
    scanRunId: "scan-1",
    sourceId: "source-1",
    onClose: () => {},
  },
};

export const Closed: Story = {
  args: {
    scanRunId: "scan-1",
    sourceId: null,
    onClose: () => {},
  },
};
