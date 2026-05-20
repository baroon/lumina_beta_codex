import type { Meta, StoryObj } from "@storybook/react";
import { DiscoveryConfirmationScreen } from "./DiscoveryConfirmationScreen";
import type { DiscoveryResultsDto } from "@/types/api";

const mockResults: DiscoveryResultsDto = {
  brandId: "brand-123",
  brandName: "Acme Inc.",
  status: "AwaitingConfirmation",
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
  products: [
    {
      id: "p1",
      name: "Cloud Platform",
      description: "Core SaaS product.",
      confidence: 0.95,
      source: "WebsiteCrawl",
      status: "Suggested",
      metadata: {},
    },
    {
      id: "p2",
      name: "Analytics Dashboard",
      description: null,
      confidence: 0.7,
      source: "LLMSuggested",
      status: "Suggested",
      metadata: {},
    },
  ],
  audiences: [
    {
      id: "a1",
      name: "Enterprise CTOs",
      description: "C-level tech leaders.",
      confidence: 0.8,
      source: "LLMSuggested",
      status: "Suggested",
      metadata: {},
    },
  ],
  markets: [
    {
      id: "m1",
      name: "North America",
      description: null,
      confidence: 0.9,
      source: "WebsiteCrawl",
      status: "Suggested",
      metadata: {},
    },
  ],
  topics: [
    {
      id: "t1",
      name: "Cloud Migration",
      description: "Moving workloads to the cloud.",
      confidence: 0.75,
      source: "LLMSuggested",
      status: "Suggested",
      metadata: {},
    },
  ],
  competitors: [
    {
      id: "c1",
      name: "Competitor Corp",
      description: "Direct competitor.",
      confidence: 0.6,
      source: "LLMSuggested",
      status: "Suggested",
      metadata: {},
    },
  ],
  trustSignals: [
    {
      id: "ts1",
      name: "SOC 2 Certified",
      description: null,
      confidence: 0.95,
      source: "WebsiteCrawl",
      status: "Suggested",
      metadata: {},
    },
  ],
};

const meta: Meta<typeof DiscoveryConfirmationScreen> = {
  title: "Features/Discovery/DiscoveryConfirmationScreen",
  component: DiscoveryConfirmationScreen,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-3xl mx-auto">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DiscoveryConfirmationScreen>;

/** Wizard starts at step 1 (Brand Identity) */
export const Default: Story = {
  args: { results: mockResults },
};

/** With no brand profile detected */
export const NoBrandProfile: Story = {
  args: {
    results: {
      ...mockResults,
      brandProfile: null,
    },
  },
};

/** With 4 items per lens (max) */
export const RichData: Story = {
  args: {
    results: {
      ...mockResults,
      products: [
        ...mockResults.products,
        {
          id: "p3",
          name: "Data Pipeline",
          description: "ETL service for data teams.",
          confidence: 0.5,
          source: "LLMSuggested",
          status: "Suggested",
          metadata: {},
        },
        {
          id: "p4",
          name: "Auth Service",
          description: "Identity and access management.",
          confidence: 0.4,
          source: "LLMSuggested",
          status: "Suggested",
          metadata: {},
        },
      ],
      audiences: [
        ...mockResults.audiences,
        {
          id: "a2",
          name: "DevOps Engineers",
          description: "Infrastructure teams.",
          confidence: 0.7,
          source: "WebsiteCrawl",
          status: "Suggested",
          metadata: {},
        },
        {
          id: "a3",
          name: "Startup Founders",
          description: "Early-stage tech founders.",
          confidence: 0.55,
          source: "LLMSuggested",
          status: "Suggested",
          metadata: {},
        },
        {
          id: "a4",
          name: "Product Managers",
          description: "Product team leads.",
          confidence: 0.5,
          source: "LLMSuggested",
          status: "Suggested",
          metadata: {},
        },
      ],
      competitors: [
        ...mockResults.competitors,
        {
          id: "c2",
          name: "Rival Inc",
          description: "Competing cloud platform.",
          confidence: 0.8,
          source: "LLMSuggested",
          status: "Suggested",
          metadata: {},
        },
        {
          id: "c3",
          name: "AltCloud",
          description: "Budget alternative.",
          confidence: 0.45,
          source: "LLMSuggested",
          status: "Suggested",
          metadata: {},
        },
        {
          id: "c4",
          name: "CloudNext",
          description: "Next-gen cloud provider.",
          confidence: 0.6,
          source: "LLMSuggested",
          status: "Suggested",
          metadata: {},
        },
      ],
    },
  },
};
