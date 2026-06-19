import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { defaultDateRangeSelection } from "@/components/molecules/DateRangePicker";
import type { PromptAnswerHistoryDto, PromptAnswerRowDto } from "@/types/api";
import { PromptAnswerHistoryDrawer } from "./PromptAnswerHistoryDrawer";

type HookReturn = {
  data?: PromptAnswerHistoryDto;
  isLoading: boolean;
  isError: boolean;
};

let hookState: HookReturn;

vi.mock("../hooks/usePromptAnswerHistory", () => ({
  usePromptAnswerHistory: () => hookState,
}));

const range = defaultDateRangeSelection();

function answer(overrides: Partial<PromptAnswerRowDto>): PromptAnswerRowDto {
  return {
    answerId: "a1",
    scanRunId: "s1",
    scannedAt: "2026-06-08T08:00:00Z",
    platformCode: "openai",
    platformName: "ChatGPT",
    answerText: "Acme is great.",
    brandMentionCount: 2,
    dominantSentiment: "Positive",
    firstMentionPosition: 0.15,
    evidenceSnippet: "Acme is great.",
    ...overrides,
  };
}

function payload(
  rows: PromptAnswerRowDto[],
  promptText = "Best resume builder?",
): PromptAnswerHistoryDto {
  return {
    promptId: "p1",
    promptText,
    from: "2026-05-09T00:00:00Z",
    to: "2026-06-09T00:00:00Z",
    answers: rows,
  };
}

describe("PromptAnswerHistoryDrawer", () => {
  it("does not render content when promptId is null", () => {
    hookState = { data: undefined, isLoading: false, isError: false };
    render(<PromptAnswerHistoryDrawer promptId={null} range={range} onClose={vi.fn()} />);
    expect(screen.queryByText("Answer history")).not.toBeInTheDocument();
  });

  it("renders the prompt text + one card per answer with platform + sentiment + position", () => {
    hookState = {
      data: payload([
        answer({
          answerId: "a1",
          platformCode: "openai",
          platformName: "ChatGPT",
          brandMentionCount: 3,
          dominantSentiment: "Positive",
          firstMentionPosition: 0.12,
          evidenceSnippet: "Acme is the top pick",
          answerText: "Acme is the top pick this year.",
        }),
        answer({
          answerId: "a2",
          platformCode: "claude",
          platformName: "Claude",
          brandMentionCount: 0,
          dominantSentiment: null,
          firstMentionPosition: null,
          evidenceSnippet: null,
          answerText: "No brand mentioned in this answer.",
        }),
      ]),
      isLoading: false,
      isError: false,
    };
    render(<PromptAnswerHistoryDrawer promptId="p1" range={range} onClose={vi.fn()} />);
    expect(screen.getByText("Answer history: Best resume builder?")).toBeInTheDocument();
    expect(screen.getByText("2 answers · 2 platforms · 3 brand mentions")).toBeInTheDocument();
    expect(screen.getByText("ChatGPT")).toBeInTheDocument();
    expect(screen.getByText("Claude")).toBeInTheDocument();
    expect(screen.getByText("Brand mentioned")).toBeInTheDocument();
    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("3 brand mentions")).toBeInTheDocument();
    expect(screen.getByText("First mention at 0.12")).toBeInTheDocument();
    expect(screen.getByText("Acme is the top pick this year.")).toBeInTheDocument();
    // The answer without a brand mention renders the "not mentioned" cue
    // instead of the sentiment/mention chips.
    expect(screen.getByText(/Brand not mentioned/i)).toBeInTheDocument();
  });

  it("singularizes the mention chip when count is exactly 1", () => {
    hookState = {
      data: payload([answer({ brandMentionCount: 1, evidenceSnippet: "snippet" })]),
      isLoading: false,
      isError: false,
    };
    render(<PromptAnswerHistoryDrawer promptId="p1" range={range} onClose={vi.fn()} />);
    expect(screen.getByText("1 brand mention")).toBeInTheDocument();
  });

  it("runs local drawer actions and marks each action complete", async () => {
    hookState = {
      data: payload([answer({})]),
      isLoading: false,
      isError: false,
    };
    render(<PromptAnswerHistoryDrawer promptId="p1" range={range} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Add to report" }));
    expect(screen.getByText("Added to report")).toBeDisabled();
    expect(
      screen.getByText("Best resume builder? was added to the answer report."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create recommendation" }));
    expect(screen.getByText("Recommendation created")).toBeDisabled();
    expect(
      screen.getByText("Recommendation created from Best resume builder?."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Mark reviewed" }));
    expect(screen.getByText("Reviewed")).toBeDisabled();
    expect(screen.getByText("Best resume builder? was marked reviewed.")).toBeInTheDocument();
  });

  it("keeps drawer actions disabled when the prompt is outside workspace scope", () => {
    hookState = {
      data: {
        promptId: "p-foreign",
        promptText: "",
        from: null,
        to: "2026-06-09T00:00:00Z",
        answers: [],
      },
      isLoading: false,
      isError: false,
    };
    render(<PromptAnswerHistoryDrawer promptId="p-foreign" range={range} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Add to report" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create recommendation" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mark reviewed" })).toBeDisabled();
  });

  it("renders the in-scope empty state when the prompt has no in-window answers", () => {
    hookState = {
      data: payload([], "AI Question with no in-window scans"),
      isLoading: false,
      isError: false,
    };
    render(<PromptAnswerHistoryDrawer promptId="p1" range={range} onClose={vi.fn()} />);
    expect(screen.getByText(/no answers in window/i)).toBeInTheDocument();
  });

  it("renders the 'not in scope' state when the BE returns an empty payload (foreign workspace)", () => {
    // The handler returns 200 with empty promptText + empty answers when the
    // prompt isn't in the current workspace. Drawer should render the
    // dedicated "not in scope" message rather than the generic empty state.
    hookState = {
      data: {
        promptId: "p-foreign",
        promptText: "",
        from: null,
        to: "2026-06-09T00:00:00Z",
        answers: [],
      },
      isLoading: false,
      isError: false,
    };
    render(<PromptAnswerHistoryDrawer promptId="p-foreign" range={range} onClose={vi.fn()} />);
    expect(screen.getByText(/not in the current workspace scope/i)).toBeInTheDocument();
    expect(screen.queryByText(/no answers in window/i)).not.toBeInTheDocument();
  });

  it("renders the error state when the query fails", () => {
    hookState = { data: undefined, isLoading: false, isError: true };
    render(<PromptAnswerHistoryDrawer promptId="p1" range={range} onClose={vi.fn()} />);
    expect(screen.getByText(/couldn't load answer history/i)).toBeInTheDocument();
  });

  it("fires onClose when the Close button is clicked", async () => {
    const onClose = vi.fn();
    hookState = { data: payload([answer({})]), isLoading: false, isError: false };
    render(<PromptAnswerHistoryDrawer promptId="p1" range={range} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /^Close$/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
