import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { deriveProfileControls, deriveProfileReadiness } from "@/features/settings/settings";
import { ProfileSettingsScreen } from "./ProfileSettingsScreen";

describe("ProfileSettingsScreen", () => {
  it("renders profile preference sections", () => {
    render(<ProfileSettingsScreen />);

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getAllByText("Identity").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Preferences").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Notification preferences")).toBeInTheDocument();
    expect(screen.getByText("Access")).toBeInTheDocument();
    expect(screen.getByText("Display name")).toBeInTheDocument();
    expect(screen.getByText("Default landing page")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Profile readiness" })).toBeInTheDocument();
    expect(screen.getByText("Identity details")).toBeInTheDocument();
    expect(screen.getAllByText("Security").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("region", { name: "Profile controls" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Owner" })).toBeInTheDocument();
    expect(screen.getByText("Overview / Last 30 days")).toBeInTheDocument();
    expect(
      screen.getByText("Personal delivery controls will override workspace defaults later."),
    ).toBeInTheDocument();
  });

  it("runs profile header actions locally", async () => {
    render(<ProfileSettingsScreen />);

    await userEvent.click(screen.getByRole("button", { name: /Security settings/i }));
    expect(screen.getByRole("button", { name: /Security checklist opened/i })).toBeDisabled();
    expect(
      screen.getByText("Security checklist opened for provider-managed access."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Save changes/i }));
    expect(screen.getByRole("button", { name: /Changes saved/i })).toBeDisabled();
    expect(screen.getByText("Profile preferences saved locally.")).toBeInTheDocument();
  });

  it("derives profile readiness ownership", () => {
    expect(deriveProfileReadiness().map((item) => item.status)).toEqual([
      "Managed",
      "Ready",
      "Planned",
      "Managed",
    ]);
  });

  it("derives profile control ownership", () => {
    expect(deriveProfileControls().map((item) => [item.area, item.owner, item.status])).toEqual([
      ["Identity", "Sign-in provider", "Managed"],
      ["Preferences", "Lumina", "Ready"],
      ["Notifications", "Workspace defaults", "Planned"],
      ["Security", "Sign-in provider", "Managed"],
    ]);
  });
});
