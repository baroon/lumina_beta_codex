import type { DateGranularity } from "@/components/molecules/DateGranularityToggle";
import type { EntityTrendPointDto } from "@/types/api";

/**
 * Buckets trend points by the requested chart granularity.
 *
 * - "day"   → returns the input unchanged (BE already emits per-scan points).
 * - "week"  → groups by ISO week (Monday start). Numeric: mean of non-null
 *             values. Categorical: mode (most common) category, ties broken
 *             by insertion order.
 * - "month" → groups by calendar month. Same aggregation rules as week.
 *
 * Bucketed points use the bucket-start ISO as both `capturedAt` and a
 * synthetic `scanRunId` (prefixed `bucket:`) so React keys stay stable.
 */
export function bucketTrendPoints(
  points: readonly EntityTrendPointDto[],
  granularity: DateGranularity,
): EntityTrendPointDto[] {
  if (granularity === "day" || points.length === 0) {
    return [...points];
  }

  const groups = new Map<string, EntityTrendPointDto[]>();
  for (const p of points) {
    const key = bucketKey(p.capturedAt, granularity);
    const arr = groups.get(key);
    if (arr) arr.push(p);
    else groups.set(key, [p]);
  }

  const out: EntityTrendPointDto[] = [];
  for (const [key, bucket] of groups) {
    out.push(reduceBucket(key, bucket));
  }
  out.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  return out;
}

// UTC-based bucketing so that ISO timestamps land in the same bucket
// regardless of the renderer's local timezone — chart axes label by UTC
// month/week, which matches the BE's per-scan capturedAt values.
function bucketKey(iso: string, granularity: "week" | "month"): string {
  const d = new Date(iso);
  if (granularity === "month") {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
  }
  // ISO week: shift so Monday=0 ... Sunday=6, then back up to Monday.
  const dow = (d.getUTCDay() + 6) % 7;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow),
  ).toISOString();
}

function reduceBucket(key: string, bucket: EntityTrendPointDto[]): EntityTrendPointDto {
  const numericValues = bucket.map((p) => p.value).filter((v): v is number => v !== null);
  const value =
    numericValues.length === 0
      ? null
      : numericValues.reduce((acc, v) => acc + v, 0) / numericValues.length;

  const category = modeCategory(bucket);

  return {
    scanRunId: `bucket:${key}`,
    capturedAt: key,
    value,
    category,
  };
}

function modeCategory(bucket: EntityTrendPointDto[]): string | null {
  const counts = new Map<string, number>();
  for (const p of bucket) {
    if (p.category === null) continue;
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best: string | null = null;
  let bestCount = -1;
  for (const [cat, n] of counts) {
    if (n > bestCount) {
      best = cat;
      bestCount = n;
    }
  }
  return best;
}
