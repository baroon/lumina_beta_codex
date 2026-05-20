import type { Meta, StoryObj } from "@storybook/react";
import { WizardStepReview } from "./WizardStepReview";
import type { CandidateDto } from "@/types/api";

const make = (
  id: string,
  name: string,
  source: CandidateDto["source"] = "LLMSuggested",
): CandidateDto => ({
  id,
  name,
  description: null,
  confidence: 0.8,
  source,
  status: "Suggested",
  metadata: {},
});

const meta: Meta<typeof WizardStepReview> = {
  title: "Features/Discovery/Wizard/WizardStepReview",
  component: WizardStepReview,
  tags: ["autodocs"],
  args: {
    onToggle: () => {},
    onAddCustom: () => {},
    onRemoveCustom: () => {},
    onEditSection: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WizardStepReview>;

export const Default: Story = {
  args: {
    brandProfile: {
      id: "bp-1",
      shortDescription: "Leading cloud platform for enterprise teams.",
      industry: "SaaS",
      category: "B2B Software",
      positioning: "Enterprise-grade reliability",
      confidence: 0.9,
      source: "WebsiteCrawl",
      status: "Suggested",
    },
    sections: {
      products: {
        candidates: [make("p1", "Cloud Platform"), make("p2", "Analytics")],
        selectedIds: new Set(["p1", "p2"]),
      },
      audiences: {
        candidates: [make("a1", "Enterprise CTOs")],
        selectedIds: new Set(["a1"]),
      },
      markets: {
        candidates: [make("m1", "North America"), make("m2", "Europe")],
        selectedIds: new Set(["m1"]),
      },
      topics: {
        candidates: [make("t1", "Cloud Migration")],
        selectedIds: new Set(["t1"]),
      },
      competitors: {
        candidates: [make("c1", "Competitor Corp"), make("c2", "Rival Inc")],
        selectedIds: new Set(["c1"]),
      },
      trustSignals: {
        candidates: [make("ts1", "SOC 2 Certified")],
        selectedIds: new Set(["ts1"]),
      },
    },
  },
};

export const WithCustomItems: Story = {
  args: {
    brandProfile: {
      id: "bp-1",
      shortDescription: "Leading cloud platform for enterprise teams.",
      industry: "SaaS",
      category: "B2B Software",
      positioning: "Enterprise-grade reliability",
      confidence: 0.9,
      source: "WebsiteCrawl",
      status: "Suggested",
    },
    sections: {
      products: {
        candidates: [
          make("p1", "Cloud Platform"),
          make("p2", "Analytics"),
          make("p3", "My Custom Product", "UserAdded"),
        ],
        selectedIds: new Set(["p1", "p2", "p3"]),
      },
      audiences: {
        candidates: [
          make("a1", "Enterprise CTOs"),
          make("a2", "Small Business Owners", "UserAdded"),
        ],
        selectedIds: new Set(["a1", "a2"]),
      },
      markets: {
        candidates: [make("m1", "North America"), make("m2", "Europe")],
        selectedIds: new Set(["m1", "m2"]),
      },
      topics: {
        candidates: [make("t1", "Cloud Migration"), make("t2", "Custom Topic", "UserAdded")],
        selectedIds: new Set(["t1", "t2"]),
      },
      competitors: {
        candidates: [make("c1", "Competitor Corp"), make("c2", "My Competitor", "UserAdded")],
        selectedIds: new Set(["c1", "c2"]),
      },
      trustSignals: {
        candidates: [make("ts1", "SOC 2 Certified")],
        selectedIds: new Set(["ts1"]),
      },
    },
  },
};

export const NothingSelected: Story = {
  args: {
    brandProfile: null,
    sections: {
      products: { candidates: [make("p1", "Cloud Platform")], selectedIds: new Set() },
      audiences: { candidates: [make("a1", "Enterprise CTOs")], selectedIds: new Set() },
      markets: { candidates: [make("m1", "North America")], selectedIds: new Set() },
      topics: { candidates: [], selectedIds: new Set() },
      competitors: { candidates: [], selectedIds: new Set() },
      trustSignals: { candidates: [], selectedIds: new Set() },
    },
  },
};
