import React from "react";
import type { Decorator } from "@storybook/react";
import {
  createRouter,
  createRootRoute,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: () => null,
});

const memoryHistory = createMemoryHistory({ initialEntries: ["/"] });

const router = createRouter({
  routeTree: rootRoute,
  history: memoryHistory,
});

export const withRouter: Decorator = (Story) => (
  <RouterProvider router={router} defaultComponent={() => <Story />} />
);
