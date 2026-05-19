import { render, type RenderOptions } from "@testing-library/react";
import {
  createRouter,
  createRootRoute,
  createRoute,
  createMemoryHistory,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";

/**
 * Renders a component wrapped in a TanStack Router context with memory history.
 * Use for components that depend on router features (e.g. <Link>).
 */
export function renderWithRouter(ui: React.ReactElement, options?: RenderOptions) {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });

  const testRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => ui,
  });

  const routeTree = rootRoute.addChildren([testRoute]);
  const memoryHistory = createMemoryHistory({ initialEntries: ["/"] });

  const router = createRouter({
    routeTree,
    history: memoryHistory,
  });

  return render(<RouterProvider router={router} />, options);
}
