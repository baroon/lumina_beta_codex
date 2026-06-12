import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/atoms/card";
import { cn } from "@/lib/utils";
import type { WorkspaceHeroDto } from "@/types/api";

/**
 * Compact 4-tile KPI row: Queries / Mentions / Citations / Brand
 * mention rate. Each tile shows the current value plus a percent
 * delta vs the previous-period hero snapshot when one is available.
 *
 * Shared between the per-tracker hub overview tab and the workspace
 * Insights surface so both surfaces lead with the same at-a-glance
 * KPI row. Larger / multi-row hero treatments live in
 * WorkspaceOverviewScreen.
 */
export function HeroRowCompact({
  hero,
  previousHero,
}: {
  hero: WorkspaceHeroDto;
  previousHero: WorkspaceHeroDto | null;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <HeroTile
        label="Queries"
        value={hero.queries.toLocaleString()}
        current={hero.queries}
        previous={previousHero?.queries ?? null}
      />
      <HeroTile
        label="Mentions"
        value={hero.mentions.toLocaleString()}
        current={hero.mentions}
        previous={previousHero?.mentions ?? null}
      />
      <HeroTile
        label="Citations"
        value={hero.citations.toLocaleString()}
        current={hero.citations}
        previous={previousHero?.citations ?? null}
      />
      <HeroTile
        label="Brand mention rate"
        value={hero.brandMentionRate == null ? "—" : `${Math.round(hero.brandMentionRate * 100)}%`}
        current={hero.brandMentionRate}
        previous={previousHero?.brandMentionRate ?? null}
      />
    </div>
  );
}

function HeroTile({
  label,
  value,
  current,
  previous,
}: {
  label: string;
  value: string;
  current: number | null;
  previous: number | null;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-xl font-semibold text-neutral-900">{value}</p>
          <HeroDelta current={current} previous={previous} />
        </div>
      </CardContent>
    </Card>
  );
}

function HeroDelta({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return null;
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-semantic-success-600">
        <ArrowUp size={10} aria-hidden /> New
      </span>
    );
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct);
  if (rounded === 0) return null;
  const isUp = rounded > 0;
  return (
    <span
      aria-label={`${isUp ? "Up" : "Down"} ${Math.abs(rounded)} percent vs previous period`}
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-medium",
        isUp ? "text-semantic-success-600" : "text-semantic-error-600",
      )}
    >
      {isUp ? <ArrowUp size={10} aria-hidden /> : <ArrowDown size={10} aria-hidden />}
      {Math.abs(rounded)}%
    </span>
  );
}
