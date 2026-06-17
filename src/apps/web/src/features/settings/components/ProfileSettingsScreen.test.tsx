import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfileSettingsScreen } from "./ProfileSettingsScreen";

describe("ProfileSettingsScreen", () => {
  it("renders profile preference sections", () => {
    render(<ProfileSettingsScreen />);

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Preferences")).toBeInTheDocument();
    expect(screen.getByText("Notification preferences")).toBeInTheDocument();
    expect(screen.getByText("Access")).toBeInTheDocument();
    expect(screen.getByText("Display name")).toBeInTheDocument();
    expect(screen.getByText("Default landing page")).toBeInTheDocument();
  });

  it("renders disabled v1 actions", () => {
    render(<ProfileSettingsScreen />);

    expect(screen.getByRole("button", { name: /Security settings/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Save changes/i })).toBeDisabled();
  });
});
