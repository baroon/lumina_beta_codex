import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
  Outlet,
} from "@tanstack/react-router";
import { AppShell } from "@/components/organisms/AppShell";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { NewBrandPage } from "@/routes/brands/new";
import { DiscoveryPage } from "@/routes/brands/discovery";

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
  beforeLoad: () => {
    throw redirect({ to: "/brands/new" });
  },
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

const routeTree = rootRoute.addChildren([indexRoute, newBrandRoute, discoveryRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
