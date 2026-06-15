import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricCategorySection {
  /** URL-hash slug identifying the section (e.g. "visibility"). Must be unique within the layout. */
  id: string;
  /** Pill nav label (e.g. "Visibility"). */
  label: string;
  /** Optional pill icon. */
  icon?: LucideIcon;
  /** Section body content. */
  children: ReactNode;
}

interface MetricCategoryLayoutProps {
  /** Status / meta strip rendered above the sticky stack — scrolls away normally. */
  statusStrip?: ReactNode;
  /**
   * Filter controls strip. When provided, it sticks together with the pill
   * nav as a single block so both stay visible while scrolling. The host
   * page must NOT add its own `sticky` wrapper around the controls — the
   * layout owns the sticky behavior.
   */
  controlsStrip?: ReactNode;
  /** Sections rendered top-to-bottom. */
  sections: MetricCategorySection[];
  /**
   * Escape hatch for replacing the default pill nav. When provided, the
   * layout renders this instead of the underline pills. Called with the
   * currently active section id (driven by scroll-spy) plus a scrollTo
   * helper so the custom nav can navigate. The default nav is also
   * suppressed when a renderNav is given.
   */
  renderNav?: (activeId: string, scrollTo: (id: string) => void) => ReactNode;
  /** Section to focus initially when no hash is set. Defaults to the first section. */
  defaultSection?: string;
  /** Whether the pill nav (and controls strip, if present) pin to the top while scrolling. Default true. */
  stickyNav?: boolean;
  /** Whether to render the per-section heading above each section body. Defaults to true. */
  showSectionHeadings?: boolean;
  className?: string;
}

/**
 * Categorized dashboard scaffold: status strip + controls strip + sticky pill nav
 * + stacked sections. Pill nav highlights the section in view via
 * IntersectionObserver and syncs the URL hash so deep links work.
 */
export function MetricCategoryLayout({
  statusStrip,
  controlsStrip,
  sections,
  renderNav,
  defaultSection,
  stickyNav = true,
  showSectionHeadings = true,
  className,
}: MetricCategoryLayoutProps) {
  const [activeId, setActiveId] = useState<string>(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (hash && sections.some((s) => s.id === hash)) return hash;
    return defaultSection ?? sections[0]?.id ?? "";
  });

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const stickyRef = useRef<HTMLDivElement | null>(null);
  // Measured height of the sticky stack (controls strip + pill nav). Drives
  // both the IntersectionObserver top inset and the per-section scroll-mt so
  // a section's heading lands just below the sticky bar regardless of how
  // many rows the controls strip wraps to.
  const [stickyHeight, setStickyHeight] = useState(48);

  useEffect(() => {
    if (!stickyNav || !stickyRef.current || typeof ResizeObserver === "undefined") return;
    const el = stickyRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setStickyHeight(Math.ceil(e.contentRect.height));
    });
    ro.observe(el);
    setStickyHeight(Math.ceil(el.getBoundingClientRect().height));
    return () => ro.disconnect();
  }, [stickyNav]);

  // Scroll-spy: highlight the section currently anchored just below the sticky stack.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const topInset = stickyNav ? stickyHeight + 8 : 16;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = (visible[0].target as HTMLElement).id;
          setActiveId(id);
        }
      },
      // Top inset = measured sticky height + 8px breathing room; bottom inset
      // -50% makes the active section the one anchored in the top half of the
      // viewport.
      { rootMargin: `-${topInset}px 0px -50% 0px` },
    );
    for (const s of sections) {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections, stickyHeight, stickyNav]);

  // Mirror the active section in the URL hash for shareable deep links.
  // The first section is treated as "effectively top of page" — when it's
  // active we strip any hash from the URL instead of pinning it. That way:
  //   - Initial load lands on /prompts, not /prompts#Discovery.
  //   - Scrolling to the second section pins #BuyingIntent.
  //   - Scrolling back to the first section clears the hash again.
  // Inbound deep links still resolve because useState's lazy init has
  // already consumed the inbound hash before this effect runs.
  useEffect(() => {
    if (!activeId || typeof window === "undefined") return;
    const isFirstSection = sections[0]?.id === activeId;
    const currentHash = window.location.hash.slice(1);
    if (isFirstSection) {
      if (currentHash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      return;
    }
    if (currentHash !== activeId) {
      window.history.replaceState(null, "", `#${activeId}`);
    }
  }, [activeId, sections]);

  // Stable identity so callers passing this into props (e.g. `renderNav`)
  // don't trip the "ref access during render" lint when their callback is
  // passed by reference.
  const scrollToSection = useCallback((id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  }, []);

  return (
    <div className={cn("space-y-5", className)}>
      {statusStrip}
      {/* Sticky stack — controlsStrip (if any) + pill nav move together so
          both stay pinned to the top while the user scrolls through
          sections. `-mx-4 px-4` bleeds the white backdrop to the page
          gutters so content scrolling underneath is fully masked. The
          measured height of this div feeds the scroll-spy inset + each
          section's scroll-mt so headings clear it cleanly regardless of
          whether the controls strip wraps. */}
      <div
        ref={stickyRef}
        className={cn("-mx-4 px-4", stickyNav && "sticky top-0 z-20 bg-white/95 backdrop-blur")}
      >
        {controlsStrip && <div className="py-2">{controlsStrip}</div>}
        {renderNav ? (
          // renderNav is a render-prop: it returns JSX synchronously and
          // wires `scrollTo` into its own click handlers. The function is
          // passed by reference and only invoked on click, so refs are
          // not read during render despite the static analyzer warning.
          // eslint-disable-next-line react-hooks/refs
          renderNav(activeId, scrollToSection)
        ) : (
          <nav aria-label="Metric categories" className="border-b border-neutral-200">
            <ul className="-mb-px flex flex-wrap gap-1">
              {sections.map((s) => {
                const Icon = s.icon;
                const isActive = activeId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(s.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                        isActive
                          ? "border-primary-500 text-primary-700"
                          : "border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900",
                      )}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
      <div className="space-y-8">
        {sections.map((s) => (
          <section
            key={s.id}
            id={s.id}
            ref={(el) => {
              sectionRefs.current[s.id] = el;
            }}
            // Inline scroll-margin-top matches the measured sticky-stack
            // height + 8px gap so scrollIntoView lands the heading just
            // below the sticky bar regardless of how the controls wrap.
            style={stickyNav ? { scrollMarginTop: stickyHeight + 8 } : undefined}
          >
            {showSectionHeadings && (
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {s.label}
              </h2>
            )}
            {s.children}
          </section>
        ))}
      </div>
    </div>
  );
}
