import { screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderWithRouter } from "@/test-utils";
import { APP_COPY } from "@/content/app";
import { navSections } from "@/content/navigation";

vi.mock("@/hooks/useBrandsWithTrackers", () => ({
  useBrandsWithTrackers: () => ({ brands: [], isLoading: false, isError: false, error: null }),
}));

import { Sidebar } from "./Sidebar";

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("Sidebar", () => {
  it("renders the app name and TrackerSelector", async () => {
    renderWithRouter(<Sidebar />);

    expect(await screen.findByText(APP_COPY.name)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tracker scope selector/i })).toBeInTheDocument();
  });

  it("renders the five product navigation sections", async () => {
    renderWithRouter(<Sidebar />);

    expect(await screen.findByText(APP_COPY.navSections.dashboard)).toBeInTheDocument();
    expect(screen.getByText(APP_COPY.navSections.strategy)).toBeInTheDocument();
    expect(screen.getByText(APP_COPY.navSections.intelligence)).toBeInTheDocument();
    expect(screen.getByText(APP_COPY.navSections.reporting)).toBeInTheDocument();
    expect(screen.getByText(APP_COPY.navSections.setup)).toBeInTheDocument();
  });

  it("links top-level items to the new route structure", async () => {
    renderWithRouter(<Sidebar />);

    const expected = new Map([
      [APP_COPY.nav.overview, "/overview"],
      [APP_COPY.nav.lenses, "/lenses"],
      [APP_COPY.nav.recommendations, "/recommendations"],
      [APP_COPY.nav.topics, "/topics"],
      [APP_COPY.nav.aiQuestions, "/ai-questions"],
      [APP_COPY.nav.competitors, "/competitors"],
      [APP_COPY.nav.sources, "/sources"],
      [APP_COPY.nav.claimsRisks, "/claims-risks"],
      [APP_COPY.nav.reports, "/reports"],
      [APP_COPY.nav.scanHistory, "/scan-history"],
      [APP_COPY.nav.brandDiscovery, "/brand-discovery"],
      [APP_COPY.nav.trackers, "/trackers"],
      [APP_COPY.nav.brands, "/brands"],
      [APP_COPY.nav.workspace, "/workspace"],
    ]);

    for (const [label, href] of expected) {
      expect(await screen.findByRole("link", { name: label })).toHaveAttribute("href", href);
    }
  });

  it("defines six child lens routes in the typed nav config", () => {
    const strategy = navSections.find((section) => section.label === APP_COPY.navSections.strategy);
    const lenses = strategy?.items.find((item) => item.label === APP_COPY.nav.lenses);

    expect(lenses?.children?.map((child) => child.href)).toEqual([
      "/lenses/discovery",
      "/lenses/buying-intent",
      "/lenses/competitive",
      "/lenses/sentiment",
      "/lenses/citations",
      "/lenses/content-gaps",
    ]);
  });

  it("does not expose deprecated primary labels", async () => {
    renderWithRouter(<Sidebar />);
    await screen.findByText(APP_COPY.name);

    expect(screen.queryByRole("link", { name: "Prompts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Insights" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Scans" })).not.toBeInTheDocument();
  });
});
