import { Link } from "@tanstack/react-router";
import { Briefcase, LayoutDashboard, Plus } from "lucide-react";
import { APP_COPY } from "@/content/app";

export function Sidebar() {
  return (
    <aside className="flex w-64 flex-col border-r border-neutral-200 bg-surface-sidebar">
      <div className="flex h-14 items-center border-b border-neutral-200 px-4">
        <span className="text-lg font-semibold text-primary-700">{APP_COPY.name}</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <Link
          to="/"
          activeOptions={{ exact: true }}
          activeProps={{ className: "bg-neutral-100 text-neutral-900" }}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          <Briefcase className="h-4 w-4" />
          {APP_COPY.nav.brands}
        </Link>
        <Link
          to="/trackers"
          activeProps={{ className: "bg-neutral-100 text-neutral-900" }}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          <LayoutDashboard className="h-4 w-4" />
          {APP_COPY.nav.trackers}
        </Link>
        <Link
          to="/brands/new"
          activeProps={{ className: "bg-neutral-100 text-neutral-900" }}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          <Plus className="h-4 w-4" />
          {APP_COPY.nav.addBrand}
        </Link>
      </nav>
    </aside>
  );
}
