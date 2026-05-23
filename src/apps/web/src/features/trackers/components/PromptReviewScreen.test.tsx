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

const sampleList: PromptList = {
  promptAllocation: 30,
  count: 3,
  prompts: [
    {
      id: "p1",
      text: "What are the best CRM for Pricing?",
      status: "Draft",
      source: "Generated",
      visibilityCheckId: "c1",
      visibilityCheckName: "Discovery",
      primaryTopicId: "t1",
      primaryTopicName: "Pricing",
    },
    {
      id: "p2",
      text: "How does Acme compare to Rival?",
      status: "Draft",
      source: "Generated",
      visibilityCheckId: "c2",
      visibilityCheckName: "Competitor Comparison",
      primaryTopicId: null,
      primaryTopicName: null,
    },
    {
      id: "p3",
      text: "Is Acme trustworthy?",
      status: "Draft",
      source: "UserAdded",
      visibilityCheckId: "c3",
      visibilityCheckName: "Sentiment & Trust",
      primaryTopicId: null,
      primaryTopicName: null,
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
    await userEvent.keyboard("{Enter}");
    expect(updateMutate).toHaveBeenCalledWith({ promptId: "p1", text: "Edited prompt" });
  });

  it("regenerates all prompts", async () => {
    render(<PromptReviewScreen trackerId="tr1" />);
    await userEvent.click(screen.getByRole("button", { name: /regenerate all/i }));
    expect(generateMutate).toHaveBeenCalledWith({ trackerId: "tr1" });
  });

  it("regenerates a single visibility check", async () => {
    render(<PromptReviewScreen trackerId="tr1" />);
    await userEvent.click(screen.getByRole("button", { name: "Regenerate Discovery" }));
    expect(generateMutate).toHaveBeenCalledWith({ trackerId: "tr1", visibilityCheckId: "c1" });
  });

  it("confirms prompts and shows the confirmed state", async () => {
    confirmMutate.mockImplementation((_arg, opts) => opts.onSuccess({ activatedCount: 2 }));
    render(<PromptReviewScreen trackerId="tr1" />);
    await userEvent.click(screen.getByRole("button", { name: /confirm prompts/i }));
    expect(confirmMutate).toHaveBeenCalled();
    expect(screen.getByText("Prompts confirmed")).toBeInTheDocument();
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

  it("opens the add-custom form", async () => {
    render(<PromptReviewScreen trackerId="tr1" />);
    await userEvent.click(screen.getByRole("button", { name: /add custom prompt/i }));
    expect(screen.getByPlaceholderText("Type a prompt...")).toBeInTheDocument();
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
            visibilityCheckId: "c1",
            visibilityCheckName: "Discovery",
            primaryTopicId: null,
            primaryTopicName: null,
          },
        ],
      },
    };
    render(<PromptReviewScreen trackerId="tr1" />);
    expect(screen.getByText(/tracker is full/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add custom prompt/i })).not.toBeInTheDocument();
  });
});
