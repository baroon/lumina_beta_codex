import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { InsightsNarrativeDto } from "@/types/api";
import { defaultDateRangeSelection } from "./DateRangePicker";
import { AiNarrativeSection } from "./AiNarrativeSection";

let mutate: ReturnType<typeof vi.fn>;
let state: {
  data?: InsightsNarrativeDto;
  isPending: boolean;
  isError: boolean;
  error?: Error;
};

vi.mock("@/hooks/useAiNarrative", () => ({
  useGenerateAiNarrative: () => ({ mutate, ...state }),
}));

beforeEach(() => {
  mutate = vi.fn();
  state = { isPending: false, isError: false };
});

const baseProps = {
  selection: defaultDateRangeSelection(),
  trackerIds: [] as readonly string[],
  hasData: true,
};

describe("AiNarrativeSection", () => {
  it("renders nothing when hasData is false", () => {
    const { container } = render(<AiNarrativeSection {...baseProps} hasData={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the Generate button initially when hasData is true", () => {
    render(<AiNarrativeSection {...baseProps} />);
    expect(screen.getByRole("button", { name: /Generate AI summary/i })).toBeInTheDocument();
  });

  it("calls mutate with the selection and trackerIds on click", async () => {
    render(<AiNarrativeSection {...baseProps} trackerIds={["t1", "t2"]} />);
    await userEvent.click(screen.getByRole("button", { name: /Generate AI summary/i }));
    expect(mutate).toHaveBeenCalledOnce();
    const [args] = mutate.mock.calls[0];
    expect(args.trackerIds).toEqual(["t1", "t2"]);
  });

  it("shows an 'Asking the model…' indicator while pending", () => {
    state = { isPending: true, isError: false };
    render(<AiNarrativeSection {...baseProps} />);
    expect(screen.getByText(/Asking the model/i)).toBeInTheDocument();
  });

  it("renders the narrative text + a 'via {platform}' byline on success", () => {
    state = {
      data: { narrative: "Acme trails Canva by 30 points.", platformCode: "openai" },
      isPending: false,
      isError: false,
    };
    render(<AiNarrativeSection {...baseProps} />);
    expect(screen.getByText(/Acme trails Canva by 30 points\./i)).toBeInTheDocument();
    expect(screen.getByText(/via openai/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Regenerate/i })).toBeInTheDocument();
  });

  it("renders the error message + Regenerate button when the mutation errors", () => {
    state = {
      isPending: false,
      isError: true,
      error: new Error("The openai platform is not configured. Add an API key first."),
    };
    render(<AiNarrativeSection {...baseProps} />);
    expect(screen.getByText(/openai.*not configured/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Regenerate/i })).toBeInTheDocument();
  });

  it("falls back to a generic error message when the error is not an Error instance", () => {
    state = { isPending: false, isError: true };
    render(<AiNarrativeSection {...baseProps} />);
    expect(screen.getByText(/Could not generate the AI summary/i)).toBeInTheDocument();
  });
});
