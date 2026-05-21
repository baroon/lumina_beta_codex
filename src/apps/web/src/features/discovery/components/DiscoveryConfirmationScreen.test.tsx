import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiscoveryConfirmationScreen } from "./DiscoveryConfirmationScreen";
import type { DiscoveryResultsDto, CandidateDto } from "@/types/api";

type ResuggestItem = {
  name: string;
  description: null;
  confidence: number;
  source: string;
  metadata: Record<string, string>;
};
type ResuggestData = { topics: ResuggestItem[]; competitors: ResuggestItem[] };

// ── Mocks ──────────────────────────────────────────────────────────

const mutateMock = vi.fn();
const confirmMutateMock = vi.fn();
const regenerateMutateMock = vi.fn();

vi.mock("../hooks/useDiscovery", () => ({
  useConfirmDiscovery: () => ({
    mutate: confirmMutateMock,
    isPending: false,
    isError: false,
    error: null,
  }),
  useResuggestDiscovery: () => ({
    mutate: mutateMock,
    isPending: false,
    isError: false,
    error: null,
  }),
  useRegenerateLens: () => ({
    mutate: regenerateMutateMock,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

/* Wizard step mocks that expose selection state via data attributes.
   Each candidate renders as a <span> with data-selected="true|false"
   so tests can assert which items are preselected. */
function renderItems(
  testId: string,
  sections: Record<string, { candidates: CandidateDto[]; selectedIds: Set<string> }>,
) {
  return (
    <div data-testid={testId}>
      {Object.entries(sections).map(([key, { candidates, selectedIds }]) =>
        candidates.map((c) => (
          <span
            key={c.id}
            data-testid={`${key}-${c.id}`}
            data-selected={String(selectedIds.has(c.id))}
          >
            {c.name}
          </span>
        )),
      )}
    </div>
  );
}

vi.mock("./wizard", () => ({
  WizardStepBrandIdentity: () => <div data-testid="step-brand" />,
  WizardStepProducts: ({
    candidates,
    selectedIds,
  }: {
    candidates: CandidateDto[];
    selectedIds: Set<string>;
  }) => renderItems("step-products", { products: { candidates, selectedIds } }),
  WizardStepAudiencesMarkets: ({
    audiences,
    markets,
  }: {
    audiences: { candidates: CandidateDto[]; selectedIds: Set<string> };
    markets: { candidates: CandidateDto[]; selectedIds: Set<string> };
  }) => renderItems("step-audiences-markets", { audiences, markets }),
  WizardStepCompetitiveLandscape: ({
    topics,
    competitors,
    trustSignals,
  }: {
    topics: { candidates: CandidateDto[]; selectedIds: Set<string> };
    competitors: { candidates: CandidateDto[]; selectedIds: Set<string> };
    trustSignals: { candidates: CandidateDto[]; selectedIds: Set<string> };
  }) => renderItems("step-competitive", { topics, competitors, trustSignals }),
  WizardStepReview: ({ onEditSection }: { onEditSection?: (key: string) => void }) => (
    <div data-testid="step-review">
      {onEditSection && (
        <button data-testid="edit-products" onClick={() => onEditSection("products")}>
          Edit Products
        </button>
      )}
    </div>
  ),
}));

// ── Helpers ────────────────────────────────────────────────────────

function makeCandidate(id: string, confidence: number): CandidateDto {
  return {
    id,
    name: `Candidate ${id}`,
    description: null,
    confidence,
    source: "LLMSuggested",
    status: "Suggested",
    metadata: {},
  };
}

function makeResults(overrides?: Partial<DiscoveryResultsDto>): DiscoveryResultsDto {
  return {
    brandId: "brand-1",
    brandName: "Test Brand",
    status: "AwaitingConfirmation",
    brandProfile: {
      id: "bp-1",
      shortDescription: "A test brand",
      industry: "Tech",
      category: "SaaS",
      positioning: "Leader",
      confidence: 0.9,
      source: "LLMSuggested",
      status: "Suggested",
    },
    products: [makeCandidate("prod-high", 0.9), makeCandidate("prod-low", 0.3)],
    audiences: [makeCandidate("aud-high", 0.85), makeCandidate("aud-med", 0.5)],
    markets: [makeCandidate("mkt-high", 0.75), makeCandidate("mkt-low", 0.2)],
    topics: [makeCandidate("topic-high", 0.8), makeCandidate("topic-low", 0.35)],
    competitors: [makeCandidate("comp-high", 0.7), makeCandidate("comp-low", 0.4)],
    trustSignals: [makeCandidate("ts-high", 0.9), makeCandidate("ts-low", 0.3)],
    ...overrides,
  };
}

async function advanceToStep(user: ReturnType<typeof userEvent.setup>, step: number) {
  for (let i = 0; i < step; i++) {
    await user.click(screen.getByRole("button", { name: /next/i }));
  }
}

function expectSelected(testId: string) {
  expect(screen.getByTestId(testId)).toHaveAttribute("data-selected", "true");
}

function expectNotSelected(testId: string) {
  expect(screen.getByTestId(testId)).toHaveAttribute("data-selected", "false");
}

// ── Tests ──────────────────────────────────────────────────────────

describe("DiscoveryConfirmationScreen", () => {
  beforeEach(() => {
    mutateMock.mockReset();
    confirmMutateMock.mockReset();
    regenerateMutateMock.mockReset();
  });

  // ── Navigation ───────────────────────────────────────────────────

  it("renders step 0 (Brand Identity) by default", () => {
    render(<DiscoveryConfirmationScreen results={makeResults()} />);
    expect(screen.getByTestId("step-brand")).toBeInTheDocument();
  });

  it("advances through steps on Next clicks", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByTestId("step-products")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByTestId("step-audiences-markets")).toBeInTheDocument();
  });

  it("navigates back from step 1 to step 0", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByTestId("step-products")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByTestId("step-brand")).toBeInTheDocument();
  });

  // ── Resuggest guard ──────────────────────────────────────────────

  it("calls resuggest on first transition from step 2 to step 3", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    await advanceToStep(user, 2);
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(mutateMock).toHaveBeenCalledTimes(1);
  });

  it("does NOT call resuggest on second transition from step 2 to step 3", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    await advanceToStep(user, 2);

    mutateMock.mockImplementationOnce(
      (
        _data: unknown,
        options: { onSuccess: (data: { topics: never[]; competitors: never[] }) => void },
      ) => {
        options.onSuccess({ topics: [], competitors: [] });
      },
    );
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(mutateMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /back/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(mutateMock).toHaveBeenCalledTimes(1);
  });

  it("sets hasResuggested even when resuggest errors", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    await advanceToStep(user, 2);

    mutateMock.mockImplementationOnce((_data: unknown, options: { onError: () => void }) => {
      options.onError();
    });
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByTestId("step-competitive")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(mutateMock).toHaveBeenCalledTimes(1);
  });

  // ── Preselection: Products (step 1) ──────────────────────────────

  it("preselects high-confidence products on initial render", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    await advanceToStep(user, 1);

    expectSelected("products-prod-high");
    expectNotSelected("products-prod-low");
  });

  it("does not preselect any products when all are below threshold", async () => {
    const user = userEvent.setup();
    render(
      <DiscoveryConfirmationScreen
        results={makeResults({
          products: [makeCandidate("prod-a", 0.5), makeCandidate("prod-b", 0.3)],
        })}
      />,
    );

    await advanceToStep(user, 1);

    expectNotSelected("products-prod-a");
    expectNotSelected("products-prod-b");
  });

  // ── Preselection: Audiences & Markets (step 2) ───────────────────

  it("preselects high-confidence audiences and markets", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    await advanceToStep(user, 2);

    expectSelected("audiences-aud-high");
    expectNotSelected("audiences-aud-med");
    expectSelected("markets-mkt-high");
    expectNotSelected("markets-mkt-low");
  });

  // ── Preselection: Competitive Landscape (step 3) ─────────────────

  it("preselects high-confidence trust signals on step 3", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    await advanceToStep(user, 2);

    // Resuggest returns new topics/competitors but trust signals stay from initial data
    mutateMock.mockImplementationOnce(
      (
        _data: unknown,
        options: {
          onSuccess: (data: {
            topics: {
              name: string;
              description: null;
              confidence: number;
              source: string;
              metadata: Record<string, string>;
            }[];
            competitors: {
              name: string;
              description: null;
              confidence: number;
              source: string;
              metadata: Record<string, string>;
            }[];
          }) => void;
        },
      ) => {
        options.onSuccess({
          topics: [
            {
              name: "New Topic",
              description: null,
              confidence: 0.9,
              source: "LLMSuggested",
              metadata: {},
            },
          ],
          competitors: [
            {
              name: "New Comp",
              description: null,
              confidence: 0.8,
              source: "LLMSuggested",
              metadata: {},
            },
          ],
        });
      },
    );
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Trust signals should retain initial preselection
    expectSelected("trustSignals-ts-high");
    expectNotSelected("trustSignals-ts-low");
  });

  it("preselects high-confidence resuggest results for topics and competitors", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    await advanceToStep(user, 2);

    mutateMock.mockImplementationOnce(
      (
        _data: unknown,
        options: {
          onSuccess: (data: {
            topics: {
              name: string;
              description: null;
              confidence: number;
              source: string;
              metadata: Record<string, string>;
            }[];
            competitors: {
              name: string;
              description: null;
              confidence: number;
              source: string;
              metadata: Record<string, string>;
            }[];
          }) => void;
        },
      ) => {
        options.onSuccess({
          topics: [
            {
              name: "High Topic",
              description: null,
              confidence: 0.85,
              source: "LLMSuggested",
              metadata: {},
            },
            {
              name: "Low Topic",
              description: null,
              confidence: 0.3,
              source: "LLMSuggested",
              metadata: {},
            },
          ],
          competitors: [
            {
              name: "High Comp",
              description: null,
              confidence: 0.7,
              source: "LLMSuggested",
              metadata: {},
            },
            {
              name: "Low Comp",
              description: null,
              confidence: 0.4,
              source: "LLMSuggested",
              metadata: {},
            },
          ],
        });
      },
    );
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Resuggest-generated IDs start with "resuggest-"
    const topicItems = screen.getAllByTestId(/^topics-/);
    const highTopic = topicItems.find((el) => el.textContent === "High Topic");
    const lowTopic = topicItems.find((el) => el.textContent === "Low Topic");

    expect(highTopic).toHaveAttribute("data-selected", "true");
    expect(lowTopic).toHaveAttribute("data-selected", "false");

    const compItems = screen.getAllByTestId(/^competitors-/);
    const highComp = compItems.find((el) => el.textContent === "High Comp");
    const lowComp = compItems.find((el) => el.textContent === "Low Comp");

    expect(highComp).toHaveAttribute("data-selected", "true");
    expect(lowComp).toHaveAttribute("data-selected", "false");
  });

  // ── Selection preservation across back-navigation ────────────────

  it("preserves product selections after navigating back and forward", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    // Go to products (step 1), verify preselection
    await advanceToStep(user, 1);
    expectSelected("products-prod-high");
    expectNotSelected("products-prod-low");

    // Go forward to step 2, then back to step 1
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /back/i }));

    // Selections should be preserved
    expectSelected("products-prod-high");
    expectNotSelected("products-prod-low");
  });

  // ── Stale data recovery ──────────────────────────────────────────

  it("re-initializes preselection when results prop delivers new candidates", async () => {
    const user = userEvent.setup();

    // Simulate the race condition: component mounts with stale data (empty candidates)
    const staleResults = makeResults({
      products: [],
      audiences: [],
      markets: [],
      topics: [],
      competitors: [],
      trustSignals: [],
    });
    const { rerender } = render(<DiscoveryConfirmationScreen results={staleResults} />);

    // Advance to products — nothing to show
    await advanceToStep(user, 1);

    // Now the query refetch arrives with real data
    const freshResults = makeResults();
    rerender(<DiscoveryConfirmationScreen results={freshResults} />);

    // Preselection should sync with the fresh data
    expectSelected("products-prod-high");
    expectNotSelected("products-prod-low");
  });

  // ── Deep-link return from review ────────────────────────────────

  it("navigates to source step on edit and returns to review", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    // Navigate to review (step 4) — need to pass through resuggest at step 2→3
    await advanceToStep(user, 2);
    mutateMock.mockImplementationOnce(
      (
        _data: unknown,
        options: { onSuccess: (data: { topics: never[]; competitors: never[] }) => void },
      ) => {
        options.onSuccess({ topics: [], competitors: [] });
      },
    );
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Now on review step
    expect(screen.getByTestId("step-review")).toBeInTheDocument();

    // Click Edit Products → goes to step 1
    await user.click(screen.getByTestId("edit-products"));
    expect(screen.getByTestId("step-products")).toBeInTheDocument();

    // Next button should say "Return to Review"
    expect(screen.getByRole("button", { name: /return to review/i })).toBeInTheDocument();

    // Click "Return to Review" → back on review
    await user.click(screen.getByRole("button", { name: /return to review/i }));
    expect(screen.getByTestId("step-review")).toBeInTheDocument();

    // Next button should revert to "Confirm & Finish"
    expect(screen.getByRole("button", { name: /confirm & finish/i })).toBeInTheDocument();
  });

  it("preserves audience/market selections after back-navigation from step 3", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    await advanceToStep(user, 2);
    expectSelected("audiences-aud-high");
    expectSelected("markets-mkt-high");

    // Trigger resuggest → step 3
    mutateMock.mockImplementationOnce(
      (
        _data: unknown,
        options: { onSuccess: (data: { topics: never[]; competitors: never[] }) => void },
      ) => {
        options.onSuccess({ topics: [], competitors: [] });
      },
    );
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Go back to step 2
    await user.click(screen.getByRole("button", { name: /back/i }));

    // Selections should be preserved
    expectSelected("audiences-aud-high");
    expectNotSelected("audiences-aud-med");
    expectSelected("markets-mkt-high");
    expectNotSelected("markets-mkt-low");
  });

  // ── Completion gating (Confirm & Finish) ─────────────────────────

  it("disables Confirm & Finish until market, topic, and product/category are selected", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    await advanceToStep(user, 2);
    mutateMock.mockImplementationOnce(
      (_data: unknown, options: { onSuccess: (data: ResuggestData) => void }) => {
        options.onSuccess({ topics: [], competitors: [] });
      },
    );
    await user.click(screen.getByRole("button", { name: /next/i })); // → step 3
    await user.click(screen.getByRole("button", { name: /next/i })); // → step 4 (review)

    expect(screen.getByRole("button", { name: /confirm & finish/i })).toBeDisabled();
  });

  it("enables Confirm & Finish once required sections are satisfied", async () => {
    const user = userEvent.setup();
    render(<DiscoveryConfirmationScreen results={makeResults()} />);

    await advanceToStep(user, 2);
    mutateMock.mockImplementationOnce(
      (_data: unknown, options: { onSuccess: (data: ResuggestData) => void }) => {
        options.onSuccess({
          topics: [
            {
              name: "High Topic",
              description: null,
              confidence: 0.9,
              source: "LLMSuggested",
              metadata: {},
            },
          ],
          competitors: [],
        });
      },
    );
    await user.click(screen.getByRole("button", { name: /next/i })); // → step 3
    await user.click(screen.getByRole("button", { name: /next/i })); // → step 4 (review)

    expect(screen.getByRole("button", { name: /confirm & finish/i })).toBeEnabled();
  });
});
