import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TrackerSelector } from "@/components/molecules/TrackerSelector";
import { APP_COPY } from "@/content/app";
import { navSections, type NavItemConfig } from "@/content/navigation";
import { useBrandsWithTrackers } from "@/hooks/useBrandsWithTrackers";
import { useTrackerScope } from "@/hooks/useTrackerScope";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { scope, setScope } = useTrackerScope();
  const { brands } = useBrandsWithTrackers();
  const navigate = useNavigate();
  const location = useLocation();

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
        {navSections.map((section) => (
          <SidebarSection key={section.label} label={section.label}>
            {section.items.map((item) => (
              <NavItem key={item.href} item={item} pathname={location.pathname} />
            ))}
          </SidebarSection>
        ))}
      </nav>
    </aside>
  );
}

function SidebarSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavItem({ item, pathname }: { item: NavItemConfig; pathname: string }) {
  const Icon = item.icon;
  const hasChildren = Boolean(item.children?.length);
  const isParentActive = hasChildren && pathname.startsWith(`${item.href}/`);
  const isExpanded = hasChildren && (pathname === item.href || isParentActive);
  const Chevron = isExpanded ? ChevronDown : ChevronRight;

  return (
    <div>
      <Link
        to={item.href as never}
        activeOptions={{ exact: !hasChildren }}
        activeProps={{ className: "bg-primary-50 text-primary-700" }}
        className={cn(
          "flex h-9 items-center gap-2 rounded-md px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-100",
          isParentActive && "bg-primary-50/70 text-primary-700",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {hasChildren && <Chevron className="h-3.5 w-3.5 shrink-0 text-neutral-400" />}
      </Link>
      {isExpanded && item.children && (
        <div className="ml-5 mt-1 space-y-0.5 border-l border-neutral-200 pl-2">
          {item.children.map((child) => (
            <ChildNavItem key={child.href} item={child} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChildNavItem({ item }: { item: NavItemConfig }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.href as never}
      activeOptions={{ exact: true }}
      activeProps={{ className: "bg-primary-50 text-primary-700" }}
      className="flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
