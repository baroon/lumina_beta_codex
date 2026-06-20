import type { WorkspaceSettingsSummary } from "@/features/settings/types";

export type WorkspaceReadinessStatus = "Ready" | "Needs setup" | "Planned";
export type ProfileReadinessStatus = "Ready" | "Managed" | "Planned";

export interface WorkspaceLimitItem {
  id: "brands" | "trackers" | "active-trackers" | "completed-scans" | "seats";
  label: string;
  used: number;
  limit: number;
  status: "Available" | "Near limit" | "Planned";
}

export interface WorkspaceReadinessItem {
  id: "brands" | "trackers" | "evidence" | "team";
  label: string;
  status: WorkspaceReadinessStatus;
  detail: string;
}

export interface WorkspaceActivityItem {
  id: "brand-context" | "monitoring" | "evidence" | "administration";
  label: string;
  value: string;
  status: WorkspaceReadinessStatus;
  detail: string;
}

export interface ProfileReadinessItem {
  id: "identity" | "preferences" | "notifications" | "security";
  label: string;
  status: ProfileReadinessStatus;
  detail: string;
}

export interface ProfileControlItem {
  id: "identity" | "preferences" | "notifications" | "security";
  area: string;
  owner: string;
  currentSetting: string;
  status: ProfileReadinessStatus;
  detail: string;
}

export function deriveWorkspaceLimits(summary: WorkspaceSettingsSummary): WorkspaceLimitItem[] {
  return [
    {
      id: "brands",
      label: "Brands",
      used: summary.brandCount,
      limit: 10,
      status: limitStatus(summary.brandCount, 10),
    },
    {
      id: "trackers",
      label: "Trackers",
      used: summary.trackerCount,
      limit: 25,
      status: limitStatus(summary.trackerCount, 25),
    },
    {
      id: "active-trackers",
      label: "Active trackers",
      used: summary.activeTrackerCount,
      limit: 20,
      status: limitStatus(summary.activeTrackerCount, 20),
    },
    {
      id: "completed-scans",
      label: "Completed scans",
      used: summary.completedScanCount,
      limit: 500,
      status: limitStatus(summary.completedScanCount, 500),
    },
    {
      id: "seats",
      label: "Seats",
      used: 1,
      limit: 5,
      status: "Planned",
    },
  ];
}

export function deriveWorkspaceReadiness(
  summary: WorkspaceSettingsSummary,
): WorkspaceReadinessItem[] {
  return [
    {
      id: "brands",
      label: "Brand context",
      status: summary.brandCount > 0 ? "Ready" : "Needs setup",
      detail:
        summary.brandCount > 0
          ? `${summary.brandCount.toLocaleString()} brand${
              summary.brandCount === 1 ? "" : "s"
            } configured.`
          : "Add a brand to establish workspace context.",
    },
    {
      id: "trackers",
      label: "Monitoring",
      status: summary.activeTrackerCount > 0 ? "Ready" : "Needs setup",
      detail:
        summary.activeTrackerCount > 0
          ? `${summary.activeTrackerCount.toLocaleString()} active tracker${
              summary.activeTrackerCount === 1 ? "" : "s"
            } running.`
          : "Activate a tracker to start monitoring AI visibility.",
    },
    {
      id: "evidence",
      label: "Evidence base",
      status: summary.completedScanCount > 0 ? "Ready" : "Needs setup",
      detail:
        summary.completedScanCount > 0
          ? `${summary.completedScanCount.toLocaleString()} completed scan${
              summary.completedScanCount === 1 ? "" : "s"
            } available.`
          : "Run a scan to populate reports and recommendations.",
    },
    {
      id: "team",
      label: "Team access",
      status: "Planned",
      detail: "Invites and roles are read-only until account administration lands.",
    },
  ];
}

export function deriveWorkspaceActivity(
  summary: WorkspaceSettingsSummary,
): WorkspaceActivityItem[] {
  return [
    {
      id: "brand-context",
      label: "Brand context",
      value: summary.brandCount.toLocaleString(),
      status: summary.brandCount > 0 ? "Ready" : "Needs setup",
      detail:
        summary.brandCount > 0
          ? "Brand inventory is available for reporting scopes."
          : "Add the first brand before workspace reporting is useful.",
    },
    {
      id: "monitoring",
      label: "Monitoring",
      value: summary.activeTrackerCount.toLocaleString(),
      status: summary.activeTrackerCount > 0 ? "Ready" : "Needs setup",
      detail:
        summary.activeTrackerCount > 0
          ? "Active trackers can generate fresh visibility evidence."
          : "Activate a tracker to start scheduled monitoring.",
    },
    {
      id: "evidence",
      label: "Evidence",
      value: summary.completedScanCount.toLocaleString(),
      status: summary.completedScanCount > 0 ? "Ready" : "Needs setup",
      detail:
        summary.completedScanCount > 0
          ? "Completed scans are available for reports and recommendations."
          : "Run a scan to populate claims, sources, topics, and reports.",
    },
    {
      id: "administration",
      label: "Administration",
      value: "v1",
      status: "Planned",
      detail: "Member audit logs and role history will attach to this surface later.",
    },
  ];
}

export function deriveProfileReadiness(): ProfileReadinessItem[] {
  return [
    {
      id: "identity",
      label: "Identity details",
      status: "Managed",
      detail: "Display name, email, and role are provided by workspace sign-in.",
    },
    {
      id: "preferences",
      label: "Preferences",
      status: "Ready",
      detail: "Theme, landing page, and report defaults are visible for review.",
    },
    {
      id: "notifications",
      label: "Notifications",
      status: "Planned",
      detail: "Personal notification controls inherit workspace defaults in v1.",
    },
    {
      id: "security",
      label: "Security",
      status: "Managed",
      detail: "Password, MFA, and sessions are managed by the sign-in provider.",
    },
  ];
}

export function deriveProfileControls(): ProfileControlItem[] {
  return [
    {
      id: "identity",
      area: "Identity",
      owner: "Sign-in provider",
      currentSetting: "Managed account",
      status: "Managed",
      detail: "Name, email, and role are read from workspace authentication.",
    },
    {
      id: "preferences",
      area: "Preferences",
      owner: "Lumina",
      currentSetting: "Overview / Last 30 days",
      status: "Ready",
      detail: "Local defaults are visible and can be saved in v1.",
    },
    {
      id: "notifications",
      area: "Notifications",
      owner: "Workspace defaults",
      currentSetting: "Inherited",
      status: "Planned",
      detail: "Personal delivery controls will override workspace defaults later.",
    },
    {
      id: "security",
      area: "Security",
      owner: "Sign-in provider",
      currentSetting: "Provider managed",
      status: "Managed",
      detail: "Password, MFA, and sessions are managed outside Lumina.",
    },
  ];
}

function limitStatus(used: number, limit: number): WorkspaceLimitItem["status"] {
  return used / limit >= 0.8 ? "Near limit" : "Available";
}
