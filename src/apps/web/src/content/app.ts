export const APP_COPY = {
  name: "Lumina",
  nav: {
    addBrand: "Add Brand",
    brands: "Brands",
    overview: "Overview",
    trackers: "Trackers",
    scans: "Scans",
    // Phase: navigation-and-pages rework (categorized sidebar).
    prompts: "Prompts",
    sources: "Sources",
    competitors: "Competitors",
    insights: "Insights",
    settingsWorkspace: "Workspace",
    settingsProfile: "Profile",
  },
  navSections: {
    analytics: "Analytics",
    manage: "Manage",
    settings: "Settings",
  },
  stepper: {
    progressLabel: "Wizard progress",
    next: "Next",
    back: "Back",
    loading: "Loading...",
  },
  error: {
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
    retry: "Try again",
  },
} as const;
