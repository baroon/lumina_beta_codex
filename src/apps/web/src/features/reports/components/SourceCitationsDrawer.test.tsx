import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import type { ScanSourceCitationsDto } from "@/types/api";
import { SourceCitationsDrawer } from "./SourceCitationsDrawer";

type HookReturn = {
  data?: ScanSourceCitationsDto;
  isLoading: boolean;
  isError: boolean;
};

let hookState: HookReturn;

vi.mock("../hooks/useScanSourceCitations", () => ({
  useScanSourceCitations: () => hookState,
}));

const fixture: ScanSourceCitationsDto = {
  scanRunId: "scan-1",
  sourceId: "source-1",
  sourceName: "ASLA",
  domain: "asla.org",
  citations: [
    {
      citationId: "c1",
      aiAnswerId: "a1",
      citationType: "ExplicitUrl",
      url: "https://asla.org/page",
      answerSnippet: "ASLA recommends native plant palettes for stormwater management.",
      promptText: "Best practices for urban stormwater?",
      platformCode: "openai",
      platformName: "ChatGPT",
      lensName: "Discovery",
      citedAt: "2026-05-27T10:00:00Z",
    },
  ],
};

describe("SourceCitationsDrawer", () => {
  it("does not render content when sourceId is null", () => {
    hookState = { data: undefined, isLoading: false, isError: false };
    render(<SourceCitationsDrawer scanRunId="scan-1" sourceId={null} onClose={vi.fn()} />);
    expect(screen.queryByText("ASLA")).not.toBeInTheDocument();
  });

  it("renders citations when sourceId is set and data is loaded", () => {
    hookState = { data: fixture, isLoading: false, isError: false };
    render(<SourceCitationsDrawer scanRunId="scan-1" sourceId="source-1" onClose={vi.fn()} />);
    expect(screen.getByText("ASLA")).toBeInTheDocument();
    expect(screen.getByText("asla.org")).toBeInTheDocument();
    expect(screen.getByText(/ASLA recommends native plant palettes/)).toBeInTheDocument();
    expect(screen.getByText(/Best practices for urban stormwater\?/)).toBeInTheDocument();
    expect(screen.getByText("ChatGPT")).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();
  });

  it("renders external link when citation has a URL", () => {
    hookState = { data: fixture, isLoading: false, isError: false };
    render(<SourceCitationsDrawer scanRunId="scan-1" sourceId="source-1" onClose={vi.fn()} />);
    const link = screen.getByRole("link", { name: /open url/i });
    expect(link).toHaveAttribute("href", "https://asla.org/page");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders empty state when source has no citations", () => {
    hookState = {
      data: { ...fixture, citations: [] },
      isLoading: false,
      isError: false,
    };
    render(<SourceCitationsDrawer scanRunId="scan-1" sourceId="source-1" onClose={vi.fn()} />);
    expect(screen.getByText(/has no citations in this scan/i)).toBeInTheDocument();
  });

  it("renders error state when the citations query fails", () => {
    hookState = { data: undefined, isLoading: false, isError: true };
    render(<SourceCitationsDrawer scanRunId="scan-1" sourceId="source-1" onClose={vi.fn()} />);
    expect(screen.getByText(/couldn't load citations/i)).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    hookState = { data: fixture, isLoading: false, isError: false };
    const onClose = vi.fn();
    render(<SourceCitationsDrawer scanRunId="scan-1" sourceId="source-1" onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
