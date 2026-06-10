import { useEffect, useId, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabItem {
  /** URL slug used for `?tab=<id>`. Must be unique within a Tabs instance. */
  id: string;
  /** Visible label. */
  label: string;
  /** Optional leading icon. */
  icon?: LucideIcon;
  /** Panel content. Rendered only when this tab is active. */
  children: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  /** Tab to focus on first mount when no `?tab=` is in the URL. Defaults to the first tab. */
  defaultTab?: string;
  /** URL search param name. Defaults to `"tab"`. */
  paramName?: string;
  /** Wrapper className. */
  className?: string;
  /** Tab-list (the row of buttons) className. */
  tabListClassName?: string;
}

/**
 * Underlined tab strip + a single visible panel. Active tab is mirrored in
 * the URL `?tab=` query param so refresh and shared links land on the same
 * tab. Other query params (e.g. `?trackers=` analytics scope) are preserved
 * when the tab changes — we mutate only the configured param.
 *
 * Distinct from `MetricCategoryLayout`, which renders all sections stacked
 * with scroll-spy. Tabs hide inactive panels entirely — the right pattern
 * for hubs (Tracker hub) where only one panel makes sense at a time.
 */
export function Tabs({
  tabs,
  defaultTab,
  paramName = "tab",
  className,
  tabListClassName,
}: TabsProps) {
  const baseId = useId();

  const resolveInitial = (): string => {
    if (typeof window === "undefined") return defaultTab ?? tabs[0]?.id ?? "";
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get(paramName);
    if (fromUrl && tabs.some((t) => t.id === fromUrl)) return fromUrl;
    return defaultTab ?? tabs[0]?.id ?? "";
  };

  const [activeId, setActiveId] = useState<string>(resolveInitial);

  // Mirror active tab to the URL via replaceState — preserves history-back
  // semantics (user can press Back to leave the hub, not unwind tab clicks)
  // and preserves any other query params (notably `?trackers=`).
  useEffect(() => {
    if (typeof window === "undefined" || !activeId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get(paramName) === activeId) return;
    params.set(paramName, activeId);
    const url = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [activeId, paramName]);

  // Browser back/forward — re-read the param so the active tab follows the
  // history entry the user navigated to.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onPopState() {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get(paramName);
      if (fromUrl && tabs.some((t) => t.id === fromUrl)) {
        setActiveId(fromUrl);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [tabs, paramName]);

  if (tabs.length === 0) return null;

  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") {
      return;
    }
    e.preventDefault();
    let nextIndex: number;
    if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = tabs.length - 1;
    else if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    setActiveId(tabs[nextIndex].id);
    const nextEl = document.getElementById(`${baseId}-tab-${tabs[nextIndex].id}`);
    nextEl?.focus();
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div
        role="tablist"
        className={cn("flex flex-wrap gap-1 border-b border-neutral-200", tabListClassName)}
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1",
                isActive
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900",
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${activeTab.id}`}
        aria-labelledby={`${baseId}-tab-${activeTab.id}`}
      >
        {activeTab.children}
      </div>
    </div>
  );
}
