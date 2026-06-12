import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ScanClaimsDto } from "@/types/api";

vi.mock("./ScanBreadcrumb", () => ({ ScanBreadcrumb: () => null }));

import { ScanClaimsScreen } from "./ScanClaimsScreen";

let hookState: {
  isLoading: boolean;
  isError: boolean;
  data?: ScanClaimsDto;
  refetch: () => void;
};

const useScanClaimsMock = vi.fn();
vi.mock("@/features/reports/hooks/useScanClaims", () => ({
  useScanClaims: (...args: unknown[]) => useScanClaimsMock(...args),
}));

// Verdict-toggle mutation. Default: idle no-op; mutation-flow tests
// override `updateReviewMutate` / `updateReviewState`.
let updateReviewMutate: ReturnType<typeof vi.fn> = vi.fn();
let updateReviewState: {
  isPending: boolean;
  isError: boolean;
  error?: Error;
  variables?: { claimId: string; reviewStatus: string };
} = { isPending: false, isError: false };
vi.mock("@/features/reports/hooks/useUpdateFactualClaimReviewStatus", () => ({
  useUpdateFactualClaimReviewStatus: () => ({
    mutate: updateReviewMutate,
    ...updateReviewState,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    children: React.ReactNode;
  } & Record<string, unknown>) => {
    let href = to;
    if (params) {
      for (const [k, v] of Object.entries(params)) href = href.replace(`$${k}`, v);
    }
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

beforeEach(() => {
  useScanClaimsMock.mockReset();
  useScanClaimsMock.mockImplementation(() => hookState);
  updateReviewMutate = vi.fn();
  updateReviewState = { isPending: false, isError: false };
});

function claim(overrides: Partial<ScanClaimsDto["claims"][number]> = {}) {
  return {
    id: "c1",
    entityName: "India Today",
    entityType: "Brand",
    claimText: "India Today was founded in 1975.",
    subject: "founding_year",
    assertedValue: "1975",
    evidenceSnippet: "Founded in 1975 by Aroon Purie...",
    verifiability: "Verifiable",
    reviewStatus: "Pending",
    confidenceScore: 0.9,
    createdAt: "2026-06-04T10:00:00Z",
    ...overrides,
  };
}

describe("ScanClaimsScreen", () => {
  it("renders the empty state when no claims exist on the scan", () => {
    hookState = {
      isLoading: false,
      isError: false,
      data: { scanRunId: "scan-1", claims: [] },
      refetch: vi.fn(),
    };
    render(<ScanClaimsScreen scanRunId="scan-1" />);
    expect(screen.getByText(/no factual claims were extracted/i)).toBeInTheDocument();
  });

  it("renders one card per claim with subject, value, status badges, and evidence", () => {
    hookState = {
      isLoading: false,
      isError: false,
      data: {
        scanRunId: "scan-1",
        claims: [
          claim({
            id: "c1",
            subject: "founding_year",
            assertedValue: "1975",
            verifiability: "Verifiable",
            reviewStatus: "Pending",
          }),
          claim({
            id: "c2",
            claimText: "It is a daily newspaper.",
            subject: "product_category",
            assertedValue: "daily newspaper",
            verifiability: "Verifiable",
            reviewStatus: "Disputed",
            evidenceSnippet: "India Today is a daily newspaper that covers...",
          }),
        ],
      },
      refetch: vi.fn(),
    };
    render(<ScanClaimsScreen scanRunId="scan-1" />);
    expect(screen.getByText("India Today was founded in 1975.")).toBeInTheDocument();
    expect(screen.getByText("It is a daily newspaper.")).toBeInTheDocument();
    expect(screen.getByText("1975")).toBeInTheDocument();
    expect(screen.getByText("daily newspaper")).toBeInTheDocument();
    // Each claim now renders a verdict toggle. 2 claims × 3 buttons = 6
    // verdict buttons, plus the 4 status filter buttons at the top.
    const verdictGroups = screen.getAllByRole("group", { name: /Review verdict for/i });
    expect(verdictGroups).toHaveLength(2);
  });

  it("filters the request when the user picks a review-status button", async () => {
    hookState = {
      isLoading: false,
      isError: false,
      data: { scanRunId: "scan-1", claims: [] },
      refetch: vi.fn(),
    };
    render(<ScanClaimsScreen scanRunId="scan-1" />);
    // Initial call: filter = undefined (All).
    expect(useScanClaimsMock).toHaveBeenLastCalledWith("scan-1", undefined);

    // Filter row buttons are the only ones rendered when claims is empty.
    await userEvent.click(screen.getByRole("button", { name: "Pending review" }));
    expect(useScanClaimsMock).toHaveBeenLastCalledWith("scan-1", "Pending");
  });

  it("clicking Verified on a row's verdict toggle fires the mutation", async () => {
    hookState = {
      isLoading: false,
      isError: false,
      data: {
        scanRunId: "scan-1",
        claims: [claim({ id: "c1", reviewStatus: "Pending" })],
      },
      refetch: vi.fn(),
    };
    render(<ScanClaimsScreen scanRunId="scan-1" />);

    const verdictGroup = screen.getByRole("group", { name: /Review verdict for/i });
    const buttons = verdictGroup.querySelectorAll("button");
    // Order: Pending / Verified / Disputed.
    expect(buttons).toHaveLength(3);
    await userEvent.click(buttons[1]);
    expect(updateReviewMutate).toHaveBeenCalledOnce();
    const [args] = updateReviewMutate.mock.calls[0];
    expect(args.claimId).toBe("c1");
    expect(args.reviewStatus).toBe("Verified");
  });

  it("renders a server-error message on the row whose claimId matches the failure", () => {
    updateReviewState = {
      isPending: false,
      isError: true,
      error: new Error("Factual claim does not belong to the current workspace."),
      variables: { claimId: "c2", reviewStatus: "Verified" },
    };
    hookState = {
      isLoading: false,
      isError: false,
      data: {
        scanRunId: "scan-1",
        claims: [
          claim({ id: "c1", claimText: "Claim 1 text." }),
          claim({ id: "c2", claimText: "Claim 2 text." }),
        ],
      },
      refetch: vi.fn(),
    };
    render(<ScanClaimsScreen scanRunId="scan-1" />);

    // Error renders only on the failing row.
    expect(screen.getAllByText(/does not belong to the current workspace/i)).toHaveLength(1);
  });
});
