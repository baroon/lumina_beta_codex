import { screen, within } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderWithRouter } from "@/test-utils";
import { APP_COPY } from "@/content/app";

// Stub the data hook so Sidebar tests don't need a QueryClientProvider.
// We're testing navigation structure here; the hook itself has its own
// tests in `useBrandsWithTrackers.test.tsx`.
vi.mock("@/hooks/useBrandsWithTrackers", () => ({
  useBrandsWithTrackers: () => ({ brands: [], isLoading: false, isError: false, error: null }),
}));

import { Sidebar } from "./Sidebar";

beforeEach(() => {
  // Reset URL between tests so the TrackerSelector's URL-driven state is
  // deterministic.
  window.history.replaceState(null, "", "/");
});

describe("Sidebar", () => {
  it("renders the app name from APP_COPY", async () => {
    renderWithRouter(<Sidebar />);
    expect(await screen.findByText(APP_COPY.name)).toBeInTheDocument();
  });

  it("renders the TrackerSelector at the top", async () => {
    renderWithRouter(<Sidebar />);
    expect(
      await screen.findByRole("button", { name: /tracker scope selector/i }),
    ).toBeInTheDocument();
  });

  it("renders the three section headers", async () => {
    renderWithRouter(<Sidebar />);
    expect(await screen.findByText(APP_COPY.navSections.analytics)).toBeInTheDocument();
    expect(screen.getByText(APP_COPY.navSections.manage)).toBeInTheDocument();
    expect(screen.getByText(APP_COPY.navSections.settings)).toBeInTheDocument();
  });

  it("ANALYTICS section links resolve to the right routes", async () => {
    renderWithRouter(<Sidebar />);

    const expectLink = async (label: string, href: string) => {
      const link = await screen.findByRole("link", {
        name: new RegExp(`^${label}(\\s+BETA)?$`, "i"),
      });
      expect(link).toHaveAttribute("href", href);
    };

    await expectLink(APP_COPY.nav.overview, "/overview");
    await expectLink(APP_COPY.nav.prompts, "/prompts");
    await expectLink(APP_COPY.nav.sources, "/sources");
    await expectLink(APP_COPY.nav.competitors, "/competitors");
    await expectLink(APP_COPY.nav.insights, "/insights");
    await expectLink(APP_COPY.nav.scans, "/scans");
  });

  it("MANAGE section links — Brands and Trackers both point at /brands", async () => {
    renderWithRouter(<Sidebar />);
    const brands = await screen.findByRole("link", {
      name: new RegExp(`^${APP_COPY.nav.brands}$`, "i"),
    });
    expect(brands).toHaveAttribute("href", "/brands");
    // Trackers → same brand-list page with a hash anchor that the brand
    // list will use to expand tracker sub-rows once that lands.
    const trackers = await screen.findByRole("link", {
      name: new RegExp(`^${APP_COPY.nav.trackers}$`, "i"),
    });
    expect(trackers.getAttribute("href")).toMatch(/^\/brands#trackers$/);
  });

  it("SETTINGS section links resolve to settings stubs", async () => {
    renderWithRouter(<Sidebar />);
    const workspace = await screen.findByRole("link", {
      name: new RegExp(`^${APP_COPY.nav.settingsWorkspace}$`, "i"),
    });
    expect(workspace).toHaveAttribute("href", "/settings/workspace");

    const profile = await screen.findByRole("link", {
      name: new RegExp(`^${APP_COPY.nav.settingsProfile}$`, "i"),
    });
    expect(profile).toHaveAttribute("href", "/settings/profile");
  });

  it("renders a BETA pill next to the Insights nav item", async () => {
    renderWithRouter(<Sidebar />);
    const insightsLink = await screen.findByRole("link", {
      name: new RegExp(`^${APP_COPY.nav.insights}\\s+BETA$`, "i"),
    });
    expect(within(insightsLink).getByText(/^beta$/i)).toBeInTheDocument();
  });

  it("does not render the deprecated standalone 'Add Brand' nav item", async () => {
    renderWithRouter(<Sidebar />);
    // Wait for the sidebar to mount.
    await screen.findByText(APP_COPY.name);
    expect(
      screen.queryByRole("link", { name: new RegExp(APP_COPY.nav.addBrand, "i") }),
    ).not.toBeInTheDocument();
  });
});
