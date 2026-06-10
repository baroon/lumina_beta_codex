import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { Tabs, type TabItem } from "./Tabs";

const TABS: TabItem[] = [
  { id: "overview", label: "Overview", children: <p>Overview panel</p> },
  { id: "schedule", label: "Schedule", children: <p>Schedule panel</p> },
  { id: "prompts", label: "Prompts", children: <p>Prompts panel</p> },
];

beforeEach(() => {
  // Reset URL between tests so the mount-from-URL behavior is deterministic.
  window.history.replaceState(null, "", "/");
});

describe("Tabs", () => {
  it("renders nothing when tabs is empty", () => {
    render(<Tabs tabs={[]} />);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("renders a tab button for each tab", () => {
    render(<Tabs tabs={TABS} />);
    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Schedule" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Prompts" })).toBeInTheDocument();
  });

  it("marks the first tab active by default", () => {
    render(<Tabs tabs={TABS} />);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Schedule" })).toHaveAttribute("aria-selected", "false");
  });

  it("honors defaultTab when provided", () => {
    render(<Tabs tabs={TABS} defaultTab="prompts" />);
    expect(screen.getByRole("tab", { name: "Prompts" })).toHaveAttribute("aria-selected", "true");
  });

  it("reads ?tab= from the URL on mount", () => {
    window.history.replaceState(null, "", "/?tab=schedule");
    render(<Tabs tabs={TABS} />);
    expect(screen.getByRole("tab", { name: "Schedule" })).toHaveAttribute("aria-selected", "true");
  });

  it("falls back to first tab when ?tab= is invalid", () => {
    window.history.replaceState(null, "", "/?tab=does-not-exist");
    render(<Tabs tabs={TABS} />);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  });

  it("renders only the active panel content", () => {
    render(<Tabs tabs={TABS} />);
    expect(screen.getByText("Overview panel")).toBeInTheDocument();
    expect(screen.queryByText("Schedule panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Prompts panel")).not.toBeInTheDocument();
  });

  it("clicking a tab swaps active state, panel content, and URL", async () => {
    render(<Tabs tabs={TABS} />);
    await userEvent.click(screen.getByRole("tab", { name: "Schedule" }));

    expect(screen.getByRole("tab", { name: "Schedule" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("Schedule panel")).toBeInTheDocument();
    expect(screen.queryByText("Overview panel")).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get("tab")).toBe("schedule");
  });

  it("preserves other URL search params when the tab changes", async () => {
    window.history.replaceState(null, "", "/?trackers=t-1,t-2&foo=bar");
    render(<Tabs tabs={TABS} />);
    await userEvent.click(screen.getByRole("tab", { name: "Prompts" }));

    const params = new URLSearchParams(window.location.search);
    expect(params.get("tab")).toBe("prompts");
    expect(params.get("trackers")).toBe("t-1,t-2");
    expect(params.get("foo")).toBe("bar");
  });

  it("supports a custom paramName", async () => {
    render(<Tabs tabs={TABS} paramName="section" />);
    await userEvent.click(screen.getByRole("tab", { name: "Schedule" }));

    const params = new URLSearchParams(window.location.search);
    expect(params.get("section")).toBe("schedule");
    expect(params.get("tab")).toBeNull();
  });

  it("arrow keys move the active tab and focus", async () => {
    render(<Tabs tabs={TABS} />);
    const overview = screen.getByRole("tab", { name: "Overview" });
    overview.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Schedule" })).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Prompts" })).toHaveAttribute("aria-selected", "true");
    // Wraps from end back to start.
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    // Left from first wraps to last.
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Prompts" })).toHaveAttribute("aria-selected", "true");
  });

  it("Home and End jump to first and last tabs", async () => {
    render(<Tabs tabs={TABS} />);
    screen.getByRole("tab", { name: "Overview" }).focus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Prompts" })).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  });

  it("wires aria-controls / aria-labelledby between tab and panel", () => {
    render(<Tabs tabs={TABS} />);
    const tab = screen.getByRole("tab", { name: "Overview" });
    const panel = screen.getByRole("tabpanel");
    const panelId = tab.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(panel).toHaveAttribute("id", panelId);
    expect(panel).toHaveAttribute("aria-labelledby", tab.id);
  });
});
