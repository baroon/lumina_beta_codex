import { createRouter, createRootRoute, createRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/organisms/AppShell";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { BrandsListPage } from "@/routes/brands/list";
import { NewBrandPage } from "@/routes/brands/new";
import { DiscoveryPage } from "@/routes/brands/discovery";
import { ScanListPage } from "@/routes/scans/list";
import { ScanResultsPage } from "@/routes/scans/results";
import { ScanSourcesPage } from "@/routes/scans/sources";
import { ScanTopicsPage } from "@/routes/scans/topics";
import { ScanTopicDetailPage } from "@/routes/scans/topic-detail";
import { ScanCompetitorsPage } from "@/routes/scans/competitors";
import { ScanCompetitorDetailPage } from "@/routes/scans/competitor-detail";
import { TrackerDashboardPage } from "@/routes/trackers/dashboard";

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

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
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

const scansListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/scans",
  component: ScanListPage,
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

const trackerDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trackers/$trackerId/dashboard",
  component: TrackerDashboardPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  newBrandRoute,
  discoveryRoute,
  scansListRoute,
  scanResultsRoute,
  scanSourcesRoute,
  scanTopicsRoute,
  scanTopicDetailRoute,
  scanCompetitorsRoute,
  scanCompetitorDetailRoute,
  trackerDashboardRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
