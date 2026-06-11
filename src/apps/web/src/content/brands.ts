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
