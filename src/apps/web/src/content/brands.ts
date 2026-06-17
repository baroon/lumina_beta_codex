export const BRANDS_COPY = {
  addBrand: {
    title: "Add Brand",
    description:
      "Enter your brand details and we'll analyze your website to discover key information.",
    nameLabel: "Brand Name",
    namePlaceholder: "Acme Inc.",
    urlLabel: "Website URL",
    urlPlaceholder: "https://example.com",
    submitting: "Analyzing...",
    submit: "Start Discovery",
  },
  list: {
    title: "Brands",
    description: "Pick a brand to continue, or add a new one.",
    addBrand: "Add Brand",
    empty: "No brands yet. Add your first brand to get started.",
  },
  discoveryHub: {
    title: "Brand Discovery",
    description:
      "Review the brands Lumina has discovered, continue pending discovery runs, and open brand profiles before creating trackers.",
    actions: {
      addBrand: "Add brand",
      continueDiscovery: "Continue discovery",
      openProfile: "Open profile",
    },
    summary: {
      brands: "Brands",
      brandsHelper: "Brands configured in this workspace.",
      completed: "Completed discoveries",
      completedHelper: "Brands with confirmed discovery profiles.",
      pending: "Needs review",
      pendingHelper: "Discovery runs still awaiting confirmation.",
      pages: "Pages crawled",
      pagesHelper: "Website pages analyzed during discovery.",
    },
    table: {
      brand: "Brand",
      website: "Website",
      status: "Discovery status",
      pages: "Pages",
      lastRun: "Last run",
      action: "Action",
      notStarted: "Not started",
      notCompleted: "Not completed",
      empty: "No brands yet. Add a brand to scan its website and build the discovery profile.",
    },
  },
  profile: {
    description: "Brand identity, dimensions, and discovery snapshot.",
    rerunDiscovery: "Re-run discovery",
    sections: {
      identity: "Identity",
      aliases: "Aliases",
    },
    fields: {
      description: "Description",
      industry: "Industry",
      category: "Category",
      positioning: "Positioning",
      websiteUrl: "Website",
    },
    empty: {
      noDiscovery:
        "Discovery hasn't run yet for this brand. Click Re-run discovery to populate the profile.",
      noAliases: "No aliases yet.",
      noItems: "Not detected.",
      notSet: "Not set.",
    },
  },
} as const;
