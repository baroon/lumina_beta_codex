import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Briefcase,
  Globe,
  LayoutGrid,
  type LucideIcon,
  MessageSquare,
  PieChart,
  Settings,
  Swords,
  TrendingUp,
  User,
} from "lucide-react";
import { TrackerSelector } from "@/components/molecules/TrackerSelector";
import { APP_COPY } from "@/content/app";
import { useBrandsWithTrackers } from "@/hooks/useBrandsWithTrackers";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { cn } from "@/lib/utils";

/**
 * App-shell left sidebar. Top: app name + tracker scope selector. Below:
 * three categorized sections — ANALYTICS (scope-aware surfaces), MANAGE
 * (brand + tracker editing surfaces), SETTINGS.
 *
 * The TrackerSelector pulls its brand-grouped tracker tree from
 * `useBrandsWithTrackers`, which wraps the workspace tracker list
 * endpoint and reshapes it. Empty / loading / error states all degrade
 * to the selector's built-in "No trackers yet" state.
 */
export function Sidebar() {
  const { scope, setScope } = useTrackerScope();
  const { brands } = useBrandsWithTrackers();
  const navigate = useNavigate();

  return (
    <aside className="flex w-64 flex-col border-r border-neutral-200 bg-surface-sidebar">
      <div className="flex h-14 items-center border-b border-neutral-200 px-4">
        <span className="text-base font-semibold text-primary-700">{APP_COPY.name}</span>
      </div>

      <div className="border-b border-neutral-200 p-3">
        <TrackerSelector
          brands={brands}
          scope={scope}
          onScopeChange={setScope}
          onAddBrand={() => navigate({ to: "/brands/new" })}
        />
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        <SidebarSection label={APP_COPY.navSections.analytics}>
          <NavItem to="/overview" icon={PieChart} label={APP_COPY.nav.overview} />
          <NavItem to="/prompts" icon={MessageSquare} label={APP_COPY.nav.prompts} />
          <NavItem to="/sources" icon={Globe} label={APP_COPY.nav.sources} />
          <NavItem to="/competitors" icon={Swords} label={APP_COPY.nav.competitors} />
          <NavItem to="/insights" icon={TrendingUp} label={APP_COPY.nav.insights} beta />
          <NavItem to="/scans" icon={Activity} label={APP_COPY.nav.scans} />
        </SidebarSection>

        <SidebarSection label={APP_COPY.navSections.manage}>
          <NavItem to="/brands" icon={Briefcase} label={APP_COPY.nav.brands} />
          {/* Trackers reaches the same Brands list with the per-brand
              tracker rows expanded — the expansion behavior lands when
              the brand list grows expandable per-brand tracker rows. */}
          <NavItem to="/brands" icon={LayoutGrid} label={APP_COPY.nav.trackers} hash="trackers" />
        </SidebarSection>

        <SidebarSection label={APP_COPY.navSections.settings}>
          <NavItem
            to="/settings/workspace"
            icon={Settings}
            label={APP_COPY.nav.settingsWorkspace}
          />
          <NavItem to="/settings/profile" icon={User} label={APP_COPY.nav.settingsProfile} />
        </SidebarSection>
      </nav>
    </aside>
  );
}

function SidebarSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  /** Pass through to TanStack `Link.activeOptions.exact` for index-route disambiguation. */
  exact?: boolean;
  /** Pin a small BETA pill after the label. */
  beta?: boolean;
  /** Optional URL hash for in-page anchoring (e.g. "trackers"). */
  hash?: string;
}

function NavItem({ to, icon: Icon, label, exact, beta, hash }: NavItemProps) {
  return (
    <Link
      to={to as never}
      hash={hash}
      activeOptions={exact ? { exact: true } : undefined}
      activeProps={{ className: "bg-neutral-100 text-neutral-900" }}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {beta && (
        <span className="shrink-0 rounded bg-neutral-100 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-500">
          BETA
        </span>
      )}
    </Link>
  );
}
