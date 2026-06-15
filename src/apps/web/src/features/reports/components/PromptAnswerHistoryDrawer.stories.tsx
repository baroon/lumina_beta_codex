import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  defaultDateRangeSelection,
  serializeDateRangeSelection,
} from "@/components/molecules/DateRangePicker";
import type { PromptAnswerHistoryDto } from "@/types/api";
import { PromptAnswerHistoryDrawer } from "./PromptAnswerHistoryDrawer";

const range = defaultDateRangeSelection();

const fixture: PromptAnswerHistoryDto = {
  promptId: "p1",
  promptText: "What are the best resume builders in 2026?",
  from: "2026-05-09T00:00:00Z",
  to: "2026-06-09T00:00:00Z",
  answers: [
    {
      answerId: "a1",
      scanRunId: "s1",
      scannedAt: "2026-06-08T08:00:00Z",
      platformCode: "openai",
      platformName: "ChatGPT",
      answerText:
        "Acme is one of the most-recommended resume builders this year, with strong reviews on accessibility and template quality.",
      brandMentionCount: 3,
      dominantSentiment: "Positive",
      firstMentionPosition: 0.12,
      evidenceSnippet: "Acme is one of the most-recommended resume builders this year",
    },
    {
      answerId: "a2",
      scanRunId: "s1",
      scannedAt: "2026-06-08T08:00:00Z",
      platformCode: "claude",
      platformName: "Claude",
      answerText: "There are several reputable resume tools, but the top three are different.",
      brandMentionCount: 0,
      dominantSentiment: null,
      firstMentionPosition: null,
      evidenceSnippet: null,
    },
  ],
};

const meta: Meta<typeof PromptAnswerHistoryDrawer> = {
  title: "Features/Reports/PromptAnswerHistoryDrawer",
  component: PromptAnswerHistoryDrawer,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(
        ["prompt-answer-history", "p1", serializeDateRangeSelection(range)],
        fixture,
      );
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof PromptAnswerHistoryDrawer>;

export const Open: Story = {
  args: { promptId: "p1", range, onClose: () => {} },
};

export const Closed: Story = {
  args: { promptId: null, range, onClose: () => {} },
};
