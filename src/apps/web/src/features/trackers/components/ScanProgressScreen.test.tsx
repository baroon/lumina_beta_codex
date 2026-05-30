import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScanProgressScreen } from "./ScanProgressScreen";
import type { ScanPlatformProgress, ScanStatus, SentimentDistribution } from "@/types/api";

let scanState: { data?: ScanStatus };

vi.mock("../hooks/useScans", () => ({
  useLatestScan: () => scanState,
}));

// The CTA renders a tanstack-router <Link/>; mock it to a plain anchor so
// the tests don't need a real RouterProvider. Resolves `:scanRunId` in the
// `to` template against the `params` prop the way TanStack would.
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
      for (const [k, v] of Object.entries(params)) {
        href = href.replace(`$${k}`, v);
      }
    }
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

function sentiment(overrides: Partial<SentimentDistribution> = {}): SentimentDistribution {
  return { positive: 0, neutral: 0, negative: 0, mixed: 0, unknown: 0, ...overrides };
}

function platform(overrides: Partial<ScanPlatformProgress> = {}): ScanPlatformProgress {
  return {
    platformId: "p1",
    code: "openai",
    name: "ChatGPT",
    completed: 0,
    failed: 0,
    total: 2,
    status: "Running",
    ...overrides,
  };
}

function status(overrides: Partial<ScanStatus> = {}): ScanStatus {
  return {
    scanRunId: "s1",
    status: "Running",
    triggerType: "Manual",
    scanCheckCount: 4,
    completedCount: 0,
    failedCount: 0,
    startedAt: "2026-05-25T00:00:00Z",
    completedAt: null,
    brandName: "Acme",
    platforms: [platform({ name: "ChatGPT", code: "openai" })],
    liveCounters: {
      mentions: 0,
      citations: 0,
      recommended: 0,
      sentiment: sentiment(),
    },
    ...overrides,
  };
}

describe("ScanProgressScreen", () => {
  beforeEach(() => {
    scanState = { data: status({ completedCount: 1 }) };
  });

  it("renders the mid-scan header with platform names joined and the brand name", () => {
    scanState = {
      data: status({
        completedCount: 2,
        brandName: "Nostri",
        platforms: [
          platform({ platformId: "a", code: "openai", name: "ChatGPT", completed: 1, total: 2 }),
          platform({ platformId: "b", code: "gemini", name: "Gemini", completed: 1, total: 2 }),
        ],
      }),
    };
    render(<ScanProgressScreen trackerId="t1" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      /Checking ChatGPT and Gemini for Nostri/i,
    );
    expect(screen.getByText("2/4 complete")).toBeInTheDocument();
  });

  it("renders a tile per platform with its derived status label", () => {
    scanState = {
      data: status({
        completedCount: 2,
        platforms: [
          platform({
            platformId: "a",
            code: "openai",
            name: "ChatGPT",
            status: "Done",
            completed: 2,
            total: 2,
          }),
          platform({
            platformId: "b",
            code: "gemini",
            name: "Gemini",
            status: "Running",
            completed: 0,
            total: 2,
          }),
        ],
      }),
    };
    render(<ScanProgressScreen trackerId="t1" />);
    const tileList = screen.getByRole("list", { name: /platform progress/i });
    expect(tileList).toBeInTheDocument();
    expect(screen.getByText("ChatGPT")).toBeInTheDocument();
    expect(screen.getByText("Gemini")).toBeInTheDocument();
    // Status badges live inside the tiles; we just assert both labels render.
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("renders live counters mid-scan, sentiment net + dominant label", () => {
    scanState = {
      data: status({
        completedCount: 2,
        liveCounters: {
          mentions: 13,
          citations: 32,
          recommended: 2,
          sentiment: sentiment({ positive: 10, negative: 2, neutral: 1 }),
        },
      }),
    };
    render(<ScanProgressScreen trackerId="t1" />);
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText("32")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    // Net = positive(10) - negative(2) = +8.
    expect(screen.getByText("+8")).toBeInTheDocument();
    // Dominant label.
    expect(screen.getByText("Positive")).toBeInTheDocument();
  });

  it("renders a rotating product-awareness message mid-scan and no skip link", () => {
    render(<ScanProgressScreen trackerId="t1" />);
    // First message in the rotation is the Visibility Lenses primer.
    expect(screen.getByText(/Visibility Lenses look at your brand/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /skip to scan results/i })).not.toBeInTheDocument();
  });

  it("renders the celebration state when the scan completes", () => {
    scanState = {
      data: status({
        status: "Completed",
        completedCount: 30,
        scanCheckCount: 30,
        brandName: "Acme",
        liveCounters: {
          mentions: 179,
          citations: 90,
          recommended: 53,
          sentiment: sentiment({ positive: 150, negative: 13 }),
        },
      }),
    };
    render(<ScanProgressScreen trackerId="t1" />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Your first scan is complete!",
    );
    expect(screen.getByText(/30 queries/)).toBeInTheDocument();
    expect(screen.getByText(/Acme/)).toBeInTheDocument();
    expect(screen.getByText("179")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("53")).toBeInTheDocument();
    expect(screen.getByText("+137")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /view scan results/i });
    expect(cta).toHaveAttribute("href", "/scans/s1/results");
  });

  it("renders a negative net sentiment when negatives outnumber positives", () => {
    scanState = {
      data: status({
        completedCount: 2,
        liveCounters: {
          mentions: 5,
          citations: 0,
          recommended: 0,
          sentiment: sentiment({ positive: 1, negative: 3, neutral: 1 }),
        },
      }),
    };
    render(<ScanProgressScreen trackerId="t1" />);
    expect(screen.getByText("-2")).toBeInTheDocument();
    expect(screen.getByText("Negative")).toBeInTheDocument();
  });
});
