import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@tanstack/react-router", () => ({ useParams: () => ({ brandId: "b1" }) }));
vi.mock("@/features/brands/hooks/useBrands", () => ({ useBrand: vi.fn() }));
vi.mock("@/features/discovery/hooks/useDiscovery", () => ({ useDiscoveryResults: vi.fn() }));
vi.mock("@/features/discovery/hooks/useDiscoveryProgress", () => ({
  useDiscoveryProgress: vi.fn(),
}));
vi.mock("@/components/molecules/LoadingPage", () => ({
  LoadingPage: () => <div data-testid="loading" />,
}));
vi.mock("@/features/discovery/components/DiscoveryProgressScreen", () => ({
  DiscoveryProgressScreen: () => <div data-testid="progress-screen" />,
}));
vi.mock("@/features/discovery/components/DiscoveryConfirmationScreen", () => ({
  DiscoveryConfirmationScreen: () => <div data-testid="confirmation-screen" />,
}));
vi.mock("@/features/trackers/components/ReadyToCreateTrackerScreen", () => ({
  ReadyToCreateTrackerScreen: () => <div data-testid="ready-to-create" />,
}));

import { useBrand } from "@/features/brands/hooks/useBrands";
import { useDiscoveryResults } from "@/features/discovery/hooks/useDiscovery";
import { useDiscoveryProgress } from "@/features/discovery/hooks/useDiscoveryProgress";
import { DiscoveryPage } from "./discovery";

const brand = vi.mocked(useBrand);
const results = vi.mocked(useDiscoveryResults);
const progress = vi.mocked(useDiscoveryProgress);

beforeEach(() => {
  vi.clearAllMocks();
  brand.mockReturnValue({ isLoading: false, isError: false, data: { name: "Acme" } } as never);
  results.mockReturnValue({ isLoading: false, data: undefined } as never);
  progress.mockReturnValue({ status: "Pending", message: "", step: 0, totalSteps: 5 } as never);
});

describe("DiscoveryPage", () => {
  it("shows the loading page while the brand loads", () => {
    brand.mockReturnValue({ isLoading: true } as never);
    render(<DiscoveryPage />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("shows an error alert when the brand fails to load", () => {
    brand.mockReturnValue({ isLoading: false, isError: true } as never);
    render(<DiscoveryPage />);
    expect(screen.getByText("Failed to load brand information.")).toBeInTheDocument();
  });

  it("shows the progress screen while discovery is running", () => {
    progress.mockReturnValue({ status: "Crawling", message: "", step: 1, totalSteps: 5 } as never);
    render(<DiscoveryPage />);
    expect(screen.getByTestId("progress-screen")).toBeInTheDocument();
  });

  it("offers a manual fallback when discovery fails, then shows the confirmation screen", async () => {
    progress.mockReturnValue({ status: "Failed", message: "", step: 0, totalSteps: 5 } as never);
    render(<DiscoveryPage />);
    expect(screen.getByText("Website crawl failed")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /continue manually/i }));
    expect(screen.getByTestId("confirmation-screen")).toBeInTheDocument();
  });

  it("shows the ready-to-create tracker screen when discovery is completed", () => {
    progress.mockReturnValue({
      status: "AwaitingConfirmation",
      message: "",
      step: 5,
      totalSteps: 5,
    } as never);
    results.mockReturnValue({
      isLoading: false,
      data: { status: "Completed", brandName: "Acme", brandId: "b1" },
    } as never);
    render(<DiscoveryPage />);
    expect(screen.getByTestId("ready-to-create")).toBeInTheDocument();
  });

  it("shows the confirmation screen when results await confirmation", () => {
    progress.mockReturnValue({
      status: "AwaitingConfirmation",
      message: "",
      step: 5,
      totalSteps: 5,
    } as never);
    results.mockReturnValue({
      isLoading: false,
      data: { status: "AwaitingConfirmation", brandName: "Acme", brandId: "b1" },
    } as never);
    render(<DiscoveryPage />);
    expect(screen.getByTestId("confirmation-screen")).toBeInTheDocument();
  });
});
