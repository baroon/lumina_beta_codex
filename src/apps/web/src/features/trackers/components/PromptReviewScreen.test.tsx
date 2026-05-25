import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromptReviewScreen } from "./PromptReviewScreen";
import type { PromptList } from "@/types/api";

const generateMutate = vi.fn();
const confirmMutate = vi.fn();
const removeMutate = vi.fn();
const addMutate = vi.fn();
const updateMutate = vi.fn();

let listState: { data?: PromptList; isLoading: boolean; isSuccess: boolean };

vi.mock("../hooks/usePrompts", () => ({
  usePrompts: () => listState,
  useGeneratePrompts: () => ({ mutate: generateMutate, isPending: false }),
  useConfirmPrompts: () => ({ mutate: confirmMutate, isPending: false }),
  useRemovePrompt: () => ({ mutate: removeMutate, isPending: false }),
  useAddCustomPrompt: () => ({ mutate: addMutate, isPending: false }),
  useUpdatePrompt: () => ({ mutate: updateMutate, isPending: false }),
}));

vi.mock("./TrackerScheduleScreen", () => ({
  TrackerScheduleScreen: () => <div data-testid="schedule-screen" />,
}));

const sampleList: PromptList = {
  promptAllocation: 30,
  count: 3,
  prompts: [
    {
      id: "p1",
      text: "What are the best CRM for Pricing?",
      status: "Draft",
      source: "Generated",
      lensId: "c1",
      lensName: "Discovery",
      topics: ["Pricing"],
      reviewReason: null,
    },
    {
      id: "p2",
      text: "How does Acme compare to Rival?",
      status: "Draft",
      source: "Generated",
      lensId: "c2",
      lensName: "Competitor Comparison",
      topics: [],
      reviewReason: null,
    },
    {
      id: "p3",
      text: "Is Acme trustworthy?",
      status: "Draft",
      source: "UserAdded",
      lensId: "c3",
      lensName: "Sentiment & Trust",
      topics: [],
      reviewReason: null,
    },
  ],
  checks: [
    { id: "c1", name: "Discovery" },
    { id: "c2", name: "Competitor Comparison" },
    { id: "c3", name: "Sentiment & Trust" },
  ],
  topics: [{ id: "t1", name: "Pricing" }],
};

describe("PromptReviewScreen", () => {
  beforeEach(() => {
    generateMutate.mockReset();
    confirmMutate.mockReset();
    removeMutate.mockReset();
    addMutate.mockReset();
    updateMutate.mockReset();
    listState = { data: sampleList, isLoading: false, isSuccess: true };
  });

  it("lists prompts grouped by visibility check with source icons", () => {
    render(<PromptReviewScreen trackerId="tr1" />);
    expect(screen.getByText("What are the best CRM for Pricing?")).toBeInTheDocument();
    expect(screen.getByText("How does Acme compare to Rival?")).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.getByText("Competitor Comparison")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.getAllByTitle("AI-generated")).toHaveLength(2);
    expect(screen.getByTitle("Added by you")).toBeInTheDocument();
  });

  it("removes a prompt", async () => {
    render(<PromptReviewScreen trackerId="tr1" />);
    await userEvent.click(
      screen.getByRole("button", { name: /Remove prompt: What are the best CRM/ }),
    );
    expect(removeMutate).toHaveBeenCalledWith("p1");
  });

  it("edits a prompt's text", async () => {
    render(<PromptReviewScreen trackerId="tr1" />);
    await userEvent.click(
      screen.getByRole("button", { name: "What are the best CRM for Pricing?" }),
    );
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "Edited prompt");
    await userEvent.tab();
    expect(updateMutate).toHaveBeenCalledWith({ promptId: "p1", text: "Edited prompt" });
  });

  it("adds a custom prompt scoped to its section", async () => {
    render(<PromptReviewScreen trackerId="tr1" />);
    const addButtons = screen.getAllByRole("button", { name: /add custom prompt/i });
    await userEvent.click(addButtons[0]);
    await userEvent.type(screen.getByPlaceholderText("Type a prompt..."), "New one");
    await userEvent.click(screen.getByRole("button", { name: /^Add$/ }));
    expect(addMutate).toHaveBeenCalledWith({
      text: "New one",
      lensId: "c1",
      primaryTopicId: null,
    });
  });

  it("regenerates a single visibility check", async () => {
    render(<PromptReviewScreen trackerId="tr1" />);
    await userEvent.click(screen.getByRole("button", { name: "Regenerate Discovery" }));
    expect(generateMutate).toHaveBeenCalledWith(
      { trackerId: "tr1", lensId: "c1" },
      expect.anything(),
    );
  });

  it("confirms prompts and advances to the schedule screen", async () => {
    confirmMutate.mockImplementation((_arg, opts) => opts.onSuccess({ activatedCount: 2 }));
    render(<PromptReviewScreen trackerId="tr1" />);
    await userEvent.click(screen.getByRole("button", { name: /confirm prompts/i }));
    expect(confirmMutate).toHaveBeenCalled();
    expect(screen.getByTestId("schedule-screen")).toBeInTheDocument();
  });

  it("shows the generating state while loading", () => {
    listState = { isLoading: true, isSuccess: false };
    render(<PromptReviewScreen trackerId="tr1" />);
    expect(screen.getByText(/generating your prompts/i)).toBeInTheDocument();
  });

  it("auto-generates and shows an empty state when there are no prompts", () => {
    listState = {
      isLoading: false,
      isSuccess: true,
      data: { promptAllocation: 30, count: 0, prompts: [], checks: [], topics: [] },
    };
    render(<PromptReviewScreen trackerId="tr1" />);
    expect(generateMutate).toHaveBeenCalledWith({ trackerId: "tr1" });
    expect(screen.getByText(/no prompts yet/i)).toBeInTheDocument();
  });

  it("shows the full state at allocation and hides add", () => {
    listState = {
      isLoading: false,
      isSuccess: true,
      data: {
        promptAllocation: 1,
        count: 1,
        checks: [],
        topics: [],
        prompts: [
          {
            id: "p1",
            text: "One",
            status: "Draft",
            source: "Generated",
            lensId: "c1",
            lensName: "Discovery",
            topics: [],
            reviewReason: null,
          },
        ],
      },
    };
    render(<PromptReviewScreen trackerId="tr1" />);
    expect(screen.getByText(/tracker is full/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add custom prompt/i })).not.toBeInTheDocument();
  });

  it("shows a review badge when a prompt's check is flagged", () => {
    listState = {
      isLoading: false,
      isSuccess: true,
      data: {
        promptAllocation: 30,
        count: 1,
        checks: [{ id: "c2", name: "Competitor Comparison" }],
        topics: [],
        prompts: [
          {
            id: "p1",
            text: "How does Acme compare?",
            status: "Draft",
            source: "Generated",
            lensId: "c2",
            lensName: "Competitor Comparison",
            topics: [],
            reviewReason: "No competitors configured to compare against.",
          },
        ],
      },
    };
    render(<PromptReviewScreen trackerId="tr1" />);
    expect(screen.getByText("Review")).toBeInTheDocument();
  });
});
