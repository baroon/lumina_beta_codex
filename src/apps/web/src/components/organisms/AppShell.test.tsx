import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { renderWithRouter } from "@/test-utils";
import { APP_COPY } from "@/content/app";

// Stub the data hook — AppShell renders Sidebar, which uses
// `useBrandsWithTrackers`. Mocking here avoids needing a QueryClient in
// the test render.
vi.mock("@/hooks/useBrandsWithTrackers", () => ({
  useBrandsWithTrackers: () => ({ brands: [], isLoading: false, isError: false, error: null }),
}));

import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("renders children in main content area", async () => {
    renderWithRouter(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );
    expect(await screen.findByText("Page content")).toBeInTheDocument();
  });

  it("renders the Sidebar", async () => {
    renderWithRouter(
      <AppShell>
        <p>Content</p>
      </AppShell>,
    );
    expect(await screen.findByText(APP_COPY.name)).toBeInTheDocument();
  });
});
