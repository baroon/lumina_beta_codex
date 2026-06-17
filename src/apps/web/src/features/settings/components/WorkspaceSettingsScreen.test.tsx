import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceSettingsSummary } from "@/features/settings/types";

let settingsState: {
  summary: WorkspaceSettingsSummary;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: ReturnType<typeof vi.fn>;
};

vi.mock("@/features/settings/hooks/useWorkspaceSettingsSummary", () => ({
  useWorkspaceSettingsSummary: () => settingsState,
}));

import { WorkspaceSettingsScreen } from "./WorkspaceSettingsScreen";

beforeEach(() => {
  settingsState = {
    summary: {
      brandCount: 3,
      trackerCount: 5,
      activeTrackerCount: 4,
      completedScanCount: 22,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
});

describe("WorkspaceSettingsScreen", () => {
  it("renders workspace summary and settings sections", () => {
    render(<WorkspaceSettingsScreen />);

    expect(screen.getByRole("heading", { name: "Workspace" })).toBeInTheDocument();
    expect(screen.getByText("Brands")).toBeInTheDocument();
    expect(screen.getByText("Trackers")).toBeInTheDocument();
    expect(screen.getByText("Active trackers")).toBeInTheDocument();
    expect(screen.getByText("Completed scans")).toBeInTheDocument();
    expect(screen.getByText("Workspace profile")).toBeInTheDocument();
    expect(screen.getByText("Team access")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Integrations")).toBeInTheDocument();
  });

  it("renders the empty workspace hint when no usage exists", () => {
    settingsState = {
      ...settingsState,
      summary: {
        brandCount: 0,
        trackerCount: 0,
        activeTrackerCount: 0,
        completedScanCount: 0,
      },
    };

    render(<WorkspaceSettingsScreen />);

    expect(screen.getByText(/Add a brand and create a tracker/i)).toBeInTheDocument();
  });

  it("renders the shared error state when settings summary fails", () => {
    settingsState = {
      ...settingsState,
      isError: true,
      error: new Error("Workspace unavailable"),
    };

    render(<WorkspaceSettingsScreen />);

    expect(screen.getByText("Workspace unavailable")).toBeInTheDocument();
  });
});
