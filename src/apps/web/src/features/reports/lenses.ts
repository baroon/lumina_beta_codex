import { VISIBILITY_LENSES } from "@/content/lenses";
import type { LensCountDto, WorkspaceOverviewDto, WorkspaceTopEntityRowDto } from "@/types/api";

export type LensStatus = "Healthy" | "Sparse" | "No evidence";
export type EntitySentimentFilter = "Positive" | "Neutral" | "Negative" | "Unknown";
export type LensDiagnosisCode = "NeedsData" | "HighAbsence" | "LowMention" | "Healthy";

export interface LensRow {
  code: string;
  slug: string;
  name: string;
  description: string;
  primaryMetric: string;
  mentionCount: number;
  share: number;
  status: LensStatus;
}

export interface LensAttentionItem {
  code: string;
  slug: string;
  name: string;
  status: LensStatus;
  action: "Add evidence" | "Strengthen coverage";
  priority: "High" | "Medium";
  reason: string;
}

export interface LensDiagnosis {
  code: LensDiagnosisCode;
  priority: "High" | "Medium" | "Low";
  signal: string;
}

const LENS_SLUGS: Record<string, string> = {
  Discovery: "discovery",
  BuyingIntent: "buying-intent",
  CompetitorComparison: "competitive",
  SentimentAndTrust: "sentiment",
  CitationVisibility: "citations",
  ContentGaps: "content-gaps",
};

const PRIMARY_METRICS: Record<string, string> = {
  Discovery: "Mention rate",
  BuyingIntent: "Recommendation rate",
  CompetitorComparison: "Share of voice",
  SentimentAndTrust: "Sentiment share",
  CitationVisibility: "Owned citation share",
  ContentGaps: "Content opportunities",
};

export function buildLensRows(counts: readonly LensCountDto[]): LensRow[] {
  const countsByCode = Object.fromEntries(
    counts.map((count) => [count.lensCode, count.mentionCount]),
  );
  const total = counts.reduce((sum, count) => sum + count.mentionCount, 0);
  return VISIBILITY_LENSES.map((lens) => {
    const mentionCount = countsByCode[lens.code] ?? 0;
    const share = total > 0 ? mentionCount / total : 0;
    return {
      code: lens.code,
      slug: LENS_SLUGS[lens.code] ?? lens.code,
      name: lens.name,
      description: lens.description,
      primaryMetric: PRIMARY_METRICS[lens.code] ?? "Mention rate",
      mentionCount,
      share,
      status: lensStatus(mentionCount, share),
    };
  });
}

export function filterLensRows(
  rows: readonly LensRow[],
  statusFilter: LensStatus | null,
): readonly LensRow[] {
  if (statusFilter == null) return rows;
  return rows.filter((row) => row.status === statusFilter);
}

export function countLensRowsByStatus(rows: readonly LensRow[]): Record<LensStatus, number> {
  return {
    Healthy: rows.filter((row) => row.status === "Healthy").length,
    Sparse: rows.filter((row) => row.status === "Sparse").length,
    "No evidence": rows.filter((row) => row.status === "No evidence").length,
  };
}

export function deriveLensAttentionItems(rows: readonly LensRow[]): LensAttentionItem[] {
  return rows
    .filter((row) => row.status !== "Healthy")
    .map((row): LensAttentionItem => {
      const needsEvidence = row.status === "No evidence";
      return {
        code: row.code,
        slug: row.slug,
        name: row.name,
        status: row.status,
        action: needsEvidence ? "Add evidence" : "Strengthen coverage",
        priority: needsEvidence ? "High" : "Medium",
        reason: needsEvidence
          ? "No AI answers currently land in this lens for the selected range."
          : "This lens has evidence, but its share is too low to treat as durable coverage.",
      };
    })
    .sort((a, b) => {
      const priority = priorityRank(a.priority) - priorityRank(b.priority);
      if (priority !== 0) return priority;
      return a.name.localeCompare(b.name);
    });
}

export function deriveLensDiagnosis(overview: WorkspaceOverviewDto): LensDiagnosis {
  if (overview.hero.queries === 0) {
    return {
      code: "NeedsData",
      priority: "High",
      signal: "0 AI questions",
    };
  }

  if ((overview.hero.brandAbsenceRate ?? 0) >= 0.5) {
    return {
      code: "HighAbsence",
      priority: "High",
      signal: `${Math.round((overview.hero.brandAbsenceRate ?? 0) * 100)}% absence`,
    };
  }

  if ((overview.hero.brandMentionRate ?? 0) < 0.35) {
    return {
      code: "LowMention",
      priority: "Medium",
      signal: `${Math.round((overview.hero.brandMentionRate ?? 0) * 100)}% mention rate`,
    };
  }

  return {
    code: "Healthy",
    priority: "Low",
    signal: `${Math.round((overview.hero.brandMentionRate ?? 0) * 100)}% mention rate`,
  };
}

export function filterLensEntities(
  rows: readonly WorkspaceTopEntityRowDto[],
  typeFilter: string | null,
  sentimentFilter: EntitySentimentFilter | null,
): readonly WorkspaceTopEntityRowDto[] {
  return rows.filter((row) => {
    if (typeFilter && row.entityType !== typeFilter) return false;
    if (sentimentFilter && sentimentLabel(row.sentiment) !== sentimentFilter) return false;
    return true;
  });
}

export function countLensEntitiesByType(
  rows: readonly WorkspaceTopEntityRowDto[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    out[row.entityType] = (out[row.entityType] ?? 0) + 1;
  }
  return out;
}

export function countLensEntitiesBySentiment(
  rows: readonly WorkspaceTopEntityRowDto[],
): Record<EntitySentimentFilter, number> {
  return {
    Positive: rows.filter((row) => sentimentLabel(row.sentiment) === "Positive").length,
    Neutral: rows.filter((row) => sentimentLabel(row.sentiment) === "Neutral").length,
    Negative: rows.filter((row) => sentimentLabel(row.sentiment) === "Negative").length,
    Unknown: rows.filter((row) => sentimentLabel(row.sentiment) === "Unknown").length,
  };
}

function priorityRank(priority: LensAttentionItem["priority"]): number {
  return priority === "High" ? 0 : 1;
}

function sentimentLabel(sentiment: string | null): EntitySentimentFilter {
  if (sentiment === "Positive" || sentiment === "Neutral" || sentiment === "Negative") {
    return sentiment;
  }
  return "Unknown";
}

function lensStatus(mentionCount: number, share: number): LensStatus {
  if (mentionCount === 0) return "No evidence";
  if (share < 0.1) return "Sparse";
  return "Healthy";
}
