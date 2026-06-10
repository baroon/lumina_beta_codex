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
    // "Pending review" + "Disputed" appear both on a filter button and on
    // a row badge — count >= 2 confirms the badge rendered alongside the
    // filter chrome.
    expect(screen.getAllByText("Pending review").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Disputed").length).toBeGreaterThanOrEqual(2);
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

    await userEvent.click(screen.getByRole("button", { name: "Pending review" }));
    expect(useScanClaimsMock).toHaveBeenLastCalledWith("scan-1", "Pending");
  });
});
