import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  defaultDateRangeSelection,
  serializeDateRangeSelection,
} from "@/components/molecules/DateRangePicker";
import { previousSelectionFor } from "@/lib/previousWindow";
import type {
  SourceTypeReferenceDto,
  WorkspaceDomainsDto,
  WorkspaceOverviewDto,
  WorkspaceUrlsDto,
} from "@/types/api";
import { SourcesScreen } from "./SourcesScreen";

const selection = defaultDateRangeSelection();
const currentKey = serializeDateRangeSelection(selection);
const previousKey = serializeDateRangeSelection(previousSelectionFor(selection));
const emptyFilterSuffix = ["", "", "", "", "", "", "", ""];

const domains: WorkspaceDomainsDto = {
  workspaceId: "workspace-1",
  from: "2026-05-20T00:00:00.000Z",
  to: "2026-06-19T00:00:00.000Z",
  domains: [
    {
      sourceId: "source-1",
      sourceName: "India Today",
      normalizedDomain: "indiatoday.in",
      sourceType: "Owned",
      authorityScore: 92,
      citationCount: 18,
      retrievedInScans: 6,
      lastSeenAt: "2026-06-18T09:00:00.000Z",
    },
    {
      sourceId: "source-2",
      sourceName: "Wikipedia",
      normalizedDomain: "wikipedia.org",
      sourceType: "Reference",
      authorityScore: 81,
      citationCount: 11,
      retrievedInScans: 4,
      lastSeenAt: "2026-06-17T09:00:00.000Z",
    },
    {
      sourceId: "source-3",
      sourceName: "Reuters",
      normalizedDomain: "reuters.com",
      sourceType: "Editorial",
      authorityScore: 88,
      citationCount: 7,
      retrievedInScans: 3,
      lastSeenAt: "2026-06-16T09:00:00.000Z",
    },
  ],
};

const previousDomains: WorkspaceDomainsDto = {
  ...domains,
  domains: [
    { ...domains.domains[0], citationCount: 10 },
    { ...domains.domains[1], citationCount: 13 },
    { ...domains.domains[2], citationCount: 4 },
  ],
};

const urls: WorkspaceUrlsDto = {
  workspaceId: "workspace-1",
  from: domains.from,
  to: domains.to,
  urls: [
    {
      sourceUrlId: "url-1",
      url: "https://www.indiatoday.in/india",
      normalizedUrl: "indiatoday.in/india",
      title: "India News",
      sourceId: "source-1",
      sourceName: "India Today",
      normalizedDomain: "indiatoday.in",
      sourceType: "Owned",
      citationCount: 9,
      retrievedInScans: 4,
      lastSeenAt: "2026-06-18T09:00:00.000Z",
    },
    {
      sourceUrlId: "url-2",
      url: "https://en.wikipedia.org/wiki/India_Today",
      normalizedUrl: "wikipedia.org/wiki/India_Today",
      title: "India Today",
      sourceId: "source-2",
      sourceName: "Wikipedia",
      normalizedDomain: "wikipedia.org",
      sourceType: "Reference",
      citationCount: 6,
      retrievedInScans: 3,
      lastSeenAt: "2026-06-17T09:00:00.000Z",
    },
  ],
};

const overview: WorkspaceOverviewDto = {
  workspaceId: "workspace-1",
  from: domains.from,
  to: domains.to,
  trackedBrands: [{ brandId: "brand-1", name: "India Today" }],
  competitors: [],
  scanCount: 6,
  hero: {
    queries: 120,
    mentions: 54,
    citations: 36,
    brandMentionRate: 0.45,
    brandAbsenceRate: 0.28,
    brandFirstMentionRate: 0.2,
  },
  previousHero: null,
  series: [],
  topEntities: [],
  topBrandAttributes: [],
  coMentions: [],
  topBrandRiskFlags: [],
  topBrandComparisons: [],
  topicOwnership: [],
  recentFactualClaims: [],
};

const sourceTypes: SourceTypeReferenceDto[] = [
  {
    id: "type-1",
    code: "Owned",
    name: "Owned",
    description: "Brand-owned content.",
    displayOrder: 1,
  },
  {
    id: "type-2",
    code: "Editorial",
    name: "Editorial",
    description: "Publisher coverage.",
    displayOrder: 2,
  },
  {
    id: "type-3",
    code: "Reference",
    name: "Reference",
    description: "Reference databases.",
    displayOrder: 3,
  },
];

const meta: Meta<typeof SourcesScreen> = {
  title: "Features/Reports/SourcesScreen",
  component: SourcesScreen,
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });
      queryClient.setQueryData(["workspace-domains", currentKey, ...emptyFilterSuffix], domains);
      queryClient.setQueryData(
        ["workspace-domains", previousKey, ...emptyFilterSuffix],
        previousDomains,
      );
      queryClient.setQueryData(["workspace-urls", currentKey, ...emptyFilterSuffix], urls);
      queryClient.setQueryData(
        ["workspace-overview", currentKey, "", "", "", "", "", "", "", ""],
        overview,
      );
      queryClient.setQueryData(["source-types"], sourceTypes);
      queryClient.setQueryData(["workspace-discovery-summary"], {
        products: [],
        markets: [],
        audiences: [],
        topics: [],
        trustSignals: [],
      });
      queryClient.setQueryData(["workspace-topic-counts", currentKey], []);
      queryClient.setQueryData(["workspace-product-counts", currentKey], []);
      queryClient.setQueryData(["workspace-market-counts", currentKey], []);
      queryClient.setQueryData(["workspace-audience-counts", currentKey], []);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;
type Story = StoryObj<typeof SourcesScreen>;

export const Default: Story = {};
