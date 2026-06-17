import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { AppShell } from "@/components/organisms/AppShell";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { BrandsListPage } from "@/routes/brands/list";
import { NewBrandPage } from "@/routes/brands/new";
import { DiscoveryPage } from "@/routes/brands/discovery";
import { BrandProfilePage } from "@/routes/brands/profile";
import { TrackerHubPage } from "@/routes/brands/tracker-hub";
import { TrackerEditPage } from "@/routes/brands/tracker-edit";
import { ScanListPage } from "@/routes/scans/list";
import { ScanResultsPage } from "@/routes/scans/results";
import { ScanSourcesPage } from "@/routes/scans/sources";
import { ScanTopicsPage } from "@/routes/scans/topics";
import { ScanTopicDetailPage } from "@/routes/scans/topic-detail";
import { ScanCompetitorsPage } from "@/routes/scans/competitors";
import { ScanCompetitorDetailPage } from "@/routes/scans/competitor-detail";
import { ScanClaimsPage } from "@/routes/scans/claims";
import { OverviewPage } from "@/routes/overview";
import { PromptsPage } from "@/routes/prompts";
import { SourcesPage } from "@/routes/sources";
import { CompetitorsPage } from "@/routes/competitors";
import { LensesPage } from "@/routes/lenses";
import { LensDetailPage } from "@/routes/lens-detail";
import { RecommendationsPage } from "@/routes/recommendations";
import { TopicsPage } from "@/routes/topics";
import { ClaimsRisksPage } from "@/routes/claims-risks";
import { ReportsPage } from "@/routes/reports";
import { BrandDiscoveryPage } from "@/routes/brand-discovery";
import { TrackersPage } from "@/routes/trackers";
import { SettingsWorkspacePage } from "@/routes/settings/workspace";
import { SettingsProfilePage } from "@/routes/settings/profile";

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <ErrorPage error={error} onReset={() => window.location.reload()} />
    </AppShell>
  ),
});

// `/` redirects to the workspace dashboard. The dedicated new-user
// welcome page slots in here in a future phase; until then, returning
// users land on /overview and new users see the overview's "no brands"
// empty state which CTAs into /brands/new.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/overview", replace: true });
  },
});

// Brand list (MANAGE section). Moved from `/` so management surfaces
// live under `/brands/...` and the index can be replaced by the welcome
// landing later without route churn.
const brandsListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/brands",
  component: BrandsListPage,
});

const newBrandRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/brands/new",
  component: NewBrandPage,
});

const discoveryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/brands/$brandId/discovery",
  component: DiscoveryPage,
});

// Bare `/brands/$brandId` redirects to the brand's profile page — the
// canonical landing for a single brand. Sub-routes (discovery, trackers
// later) live alongside.
const brandIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/brands/$brandId",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/brands/$brandId/profile",
      params: { brandId: params.brandId },
      replace: true,
    });
  },
});

const brandProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/brands/$brandId/profile",
  component: BrandProfilePage,
});

const trackerHubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/brands/$brandId/trackers/$trackerId",
  component: TrackerHubPage,
});

const trackerEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/brands/$brandId/trackers/$trackerId/edit",
  component: TrackerEditPage,
});

const scansListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scans",
  beforeLoad: () => {
    throw redirect({ to: "/scan-history", replace: true });
  },
});

const scanResultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scans/$scanRunId/results",
  component: ScanResultsPage,
});

const scanSourcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scans/$scanRunId/sources",
  component: ScanSourcesPage,
});

const scanTopicsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scans/$scanRunId/topics",
  component: ScanTopicsPage,
});

const scanTopicDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scans/$scanRunId/topics/$topicId",
  component: ScanTopicDetailPage,
});

const scanCompetitorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scans/$scanRunId/competitors",
  component: ScanCompetitorsPage,
});

const scanCompetitorDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scans/$scanRunId/competitors/$competitorId",
  component: ScanCompetitorDetailPage,
});

const scanClaimsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scans/$scanRunId/claims",
  component: ScanClaimsPage,
});

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/overview",
  component: OverviewPage,
});

// New flat analytics routes (placeholders during navigation rollout).
// Real screens land in steps 11–14 of the migration plan; the routes
// exist now so direct URLs + sidebar links don't 404.
const promptsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/prompts",
  beforeLoad: () => {
    throw redirect({ to: "/ai-questions", replace: true });
  },
});

const aiQuestionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ai-questions",
  component: PromptsPage,
});

const lensesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lenses",
  component: LensesPage,
});

const lensDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lenses/$lensId",
  component: LensDetailPage,
});

const recommendationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recommendations",
  component: RecommendationsPage,
});

const topicsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/topics",
  component: TopicsPage,
});

const sourcesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sources",
  component: SourcesPage,
});

const competitorsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/competitors",
  component: CompetitorsPage,
});

const insightsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/insights",
  beforeLoad: () => {
    throw redirect({ to: "/recommendations", replace: true });
  },
});

const claimsRisksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/claims-risks",
  component: ClaimsRisksPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports",
  component: ReportsPage,
});

const scanHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scan-history",
  component: ScanListPage,
});

const brandDiscoveryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/brand-discovery",
  component: BrandDiscoveryPage,
});

const trackersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trackers",
  component: TrackersPage,
});

const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspace",
  component: SettingsWorkspacePage,
});

// Settings stubs — pulled forward from step 15 so the sidebar Settings
// entries resolve instead of 404-ing when step 3 ships.
const settingsWorkspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/workspace",
  beforeLoad: () => {
    throw redirect({ to: "/workspace", replace: true });
  },
});

const settingsProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings/profile",
  component: SettingsProfilePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  brandsListRoute,
  newBrandRoute,
  discoveryRoute,
  brandIndexRoute,
  brandProfileRoute,
  trackerHubRoute,
  trackerEditRoute,
  scansListRoute,
  scanResultsRoute,
  scanSourcesRoute,
  scanTopicsRoute,
  scanTopicDetailRoute,
  scanCompetitorsRoute,
  scanCompetitorDetailRoute,
  scanClaimsRoute,
  overviewRoute,
  promptsRoute,
  aiQuestionsRoute,
  lensesRoute,
  lensDetailRoute,
  recommendationsRoute,
  topicsRoute,
  sourcesRoute,
  competitorsRoute,
  insightsRoute,
  claimsRisksRoute,
  reportsRoute,
  scanHistoryRoute,
  brandDiscoveryRoute,
  trackersRoute,
  workspaceRoute,
  settingsWorkspaceRoute,
  settingsProfileRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
