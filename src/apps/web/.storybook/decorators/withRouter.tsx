import React from "react";
import type { Decorator } from "@storybook/react";
import {
  createRouter,
  createRootRoute,
  createRoute,
  createMemoryHistory,
  RouterProvider,
  Outlet,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

export const withRouter: Decorator = (Story) => {
  const storyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <Story />,
  });

  const routeTree = rootRoute.addChildren([storyRoute]);
  const memoryHistory = createMemoryHistory({ initialEntries: ["/"] });

  const router = createRouter({
    routeTree,
    history: memoryHistory,
  });

  return <RouterProvider router={router} />;
};
