import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PromptReviewScreen } from "./PromptReviewScreen";
import type { PromptList } from "@/types/api";

const generateMutate = vi.fn();
const confirmMutate = vi.fn();
const removeMutate = vi.fn();

let listState: { data?: PromptList; isLoading: boolean; isSuccess: boolean };

vi.mock("../hooks/usePrompts", () => ({
  usePrompts: () => listState,
  useGeneratePrompts: () => ({ mutate: generateMutate, isPending: false }),
  useConfirmPrompts: () => ({ mutate: confirmMutate, isPending: false }),
  useRemovePrompt: () => ({ mutate: removeMutate, isPending: false }),
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
};

describe("PromptReviewScreen", () => {
  beforeEach(() => {
    generateMutate.mockReset();
    confirmMutate.mockReset();
    removeMutate.mockReset();
    listState = { data: sampleList, isLoading: false, isSuccess: true };
  });

  it("lists prompts grouped by visibility check", () => {
    render(<PromptReviewScreen trackerId="tr1" />);
    expect(screen.getByText("What are the best CRM for Pricing?")).toBeInTheDocument();
    expect(screen.getByText("How does Acme compare to Rival?")).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    expect(screen.getByText("Competitor Comparison")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("removes a prompt", async () => {
    render(<PromptReviewScreen trackerId="tr1" />);
    await userEvent.click(
      screen.getByRole("button", { name: /Remove prompt: What are the best CRM/ }),
    );
    expect(removeMutate).toHaveBeenCalledWith("p1");
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
      data: { promptAllocation: 30, count: 0, prompts: [] },
    };
    render(<PromptReviewScreen trackerId="tr1" />);
    expect(generateMutate).toHaveBeenCalledWith("tr1");
    expect(screen.getByText(/no prompts yet/i)).toBeInTheDocument();
  });

  it("regenerates all prompts", async () => {
    render(<PromptReviewScreen trackerId="tr1" />);
    await userEvent.click(screen.getByRole("button", { name: /regenerate all/i }));
    expect(generateMutate).toHaveBeenCalledWith("tr1");
  });
});
