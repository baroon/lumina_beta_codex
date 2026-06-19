import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceSettingsSummary } from "@/features/settings/types";
import { deriveWorkspaceReadiness } from "@/features/settings/settings";

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
    expect(screen.getByRole("region", { name: "Workspace readiness" })).toBeInTheDocument();
    expect(screen.getByText("Brand context")).toBeInTheDocument();
    expect(screen.getByText("Evidence base")).toBeInTheDocument();
    expect(screen.getAllByText("Team access").length).toBeGreaterThanOrEqual(1);
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
    expect(screen.getAllByText("Needs setup").length).toBeGreaterThanOrEqual(3);
  });

  it("derives workspace readiness statuses", () => {
    expect(
      deriveWorkspaceReadiness({
        brandCount: 1,
        trackerCount: 2,
        activeTrackerCount: 1,
        completedScanCount: 3,
      }).map((item) => item.status),
    ).toEqual(["Ready", "Ready", "Ready", "Planned"]);

    expect(
      deriveWorkspaceReadiness({
        brandCount: 0,
        trackerCount: 0,
        activeTrackerCount: 0,
        completedScanCount: 0,
      }).map((item) => item.status),
    ).toEqual(["Needs setup", "Needs setup", "Needs setup", "Planned"]);
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

  it("runs workspace header actions locally", async () => {
    render(<WorkspaceSettingsScreen />);

    await userEvent.click(screen.getByRole("button", { name: /Invite teammate/i }));
    expect(screen.getByRole("button", { name: /Invite prepared/i })).toBeDisabled();
    expect(
      screen.getByText("Teammate invite draft prepared for account administration."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Manage billing/i }));
    expect(screen.getByRole("button", { name: /Billing review queued/i })).toBeDisabled();
    expect(
      screen.getByText("Billing review queued for workspace administration."),
    ).toBeInTheDocument();
  });
});
