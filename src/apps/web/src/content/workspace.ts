export const WORKSPACE_COPY = {
  settings: {
    title: "Workspace",
    description:
      "Manage workspace-level defaults, access, usage limits, notifications, and integration readiness.",
    actions: {
      invite: "Invite teammate",
      invitePrepared: "Invite prepared",
      billing: "Manage billing",
      billingQueued: "Billing review queued",
      inviteNotice: "Teammate invite draft prepared for account administration.",
      billingNotice: "Billing review queued for workspace administration.",
    },
    summary: {
      brands: "Brands",
      brandsHelper: "Configured brands in this workspace.",
      trackers: "Trackers",
      trackersHelper: "Monitoring setups across all brands.",
      activeTrackers: "Active trackers",
      activeTrackersHelper: "Trackers currently expected to produce scans.",
      completedScans: "Completed scans",
      completedScansHelper: "Total completed scan runs across trackers.",
    },
    readiness: {
      title: "Workspace readiness",
      description: "Operational setup needed before reporting and collaboration are fully useful.",
    },
    sections: {
      readOnly: "Read-only",
      profile: {
        title: "Workspace profile",
        description: "Account-level defaults used by reports, dashboards, and scheduling.",
        items: [
          { label: "Workspace name", value: "Lumina workspace" },
          { label: "Default timezone", value: "Browser timezone" },
          { label: "Report audience", value: "Client-ready" },
        ],
      },
      team: {
        title: "Team access",
        description: "Invite teammates and manage roles once account administration lands.",
        items: [
          { label: "Owner", value: "Current user" },
          { label: "Roles", value: "Admin, Analyst, Viewer" },
          { label: "Access policy", value: "Workspace scoped" },
        ],
      },
      notifications: {
        title: "Notifications",
        description: "Default alerts for scan completion, risk changes, and report delivery.",
        items: [
          { label: "Scan completion", value: "Enabled" },
          { label: "Risk alerts", value: "Enabled" },
          { label: "Weekly digest", value: "Planned" },
        ],
      },
      plan: {
        title: "Plan and limits",
        description: "Current v1 usage against the workspace limits that will gate billing.",
        helper: "{used} of {limit} used",
      },
      integrations: {
        title: "Integrations",
        description: "External connections used for exports, reporting, and source monitoring.",
        items: [
          { label: "AI providers", value: "Configured in API" },
          { label: "Report exports", value: "Planned" },
          { label: "Webhooks", value: "Planned" },
        ],
      },
    },
    empty:
      "Add a brand and create a tracker to populate workspace usage and configuration signals.",
  },
  profile: {
    title: "Profile",
    description: "Your personal preferences, display settings, and account details.",
    actions: {
      save: "Save changes",
      saved: "Changes saved",
      security: "Security settings",
      securityOpened: "Security checklist opened",
      saveNotice: "Profile preferences saved locally.",
      securityNotice: "Security checklist opened for provider-managed access.",
    },
    readiness: {
      title: "Profile readiness",
      description: "Current ownership for personal settings, preferences, and security controls.",
    },
    sections: {
      readOnly: "Read-only",
      identity: {
        title: "Identity",
        description: "Personal details shown in workspace activity and report ownership.",
        items: [
          { label: "Display name", value: "Current user" },
          { label: "Email", value: "Managed by sign-in provider" },
          { label: "Role", value: "Workspace member" },
        ],
      },
      preferences: {
        title: "Preferences",
        description: "Interface defaults for repeated analysis and review work.",
        items: [
          { label: "Theme", value: "System default" },
          { label: "Default landing page", value: "Overview" },
          { label: "Date range", value: "Last 30 days" },
        ],
      },
      notifications: {
        title: "Notification preferences",
        description: "Personal delivery choices for alerts and summaries.",
        items: [
          { label: "Scan completion", value: "Workspace default" },
          { label: "Risk review", value: "Workspace default" },
          { label: "Report delivery", value: "Workspace default" },
        ],
      },
      access: {
        title: "Access",
        description: "Authentication and session details are managed by the configured provider.",
        items: [
          { label: "Password", value: "Managed externally" },
          { label: "MFA", value: "Provider managed" },
          { label: "Sessions", value: "Provider managed" },
        ],
      },
    },
  },
} as const;
