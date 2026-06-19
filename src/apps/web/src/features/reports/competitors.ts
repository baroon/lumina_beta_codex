import type { BrandCompetitiveGapGroupDto } from "@/types/api";

export type CompetitorRelationshipFilter = "You" | "Competitor";
export type CompetitorRecommendationFilter = "Recommended" | "No recommendation data";
export type CompetitorLeadType = "More mentions" | "Higher recommendation rate";

export interface CompetitorLeaderboardRow {
  isTrackedBrand: boolean;
  recommendationRate: number | null;
}

export interface CompetitorLeadRow {
  id: string;
  trackedBrandName: string;
  competitorId: string;
  competitorName: string;
  leadType: CompetitorLeadType;
  gap: number;
  brandValue: number;
  competitorValue: number;
  recommendedAction: string;
}

export function filterCompetitorRows<T extends CompetitorLeaderboardRow>(
  rows: readonly T[],
  relationshipFilter: CompetitorRelationshipFilter | null,
  recommendationFilter: CompetitorRecommendationFilter | null,
): readonly T[] {
  return rows.filter((row) => {
    if (relationshipFilter === "You" && !row.isTrackedBrand) return false;
    if (relationshipFilter === "Competitor" && row.isTrackedBrand) return false;
    if (recommendationFilter === "Recommended" && row.recommendationRate == null) return false;
    if (recommendationFilter === "No recommendation data" && row.recommendationRate != null) {
      return false;
    }
    return true;
  });
}

export function countCompetitorsByRelationship<T extends CompetitorLeaderboardRow>(
  rows: readonly T[],
): Record<CompetitorRelationshipFilter, number> {
  return {
    You: rows.filter((row) => row.isTrackedBrand).length,
    Competitor: rows.filter((row) => !row.isTrackedBrand).length,
  };
}

export function countCompetitorsByRecommendation<T extends CompetitorLeaderboardRow>(
  rows: readonly T[],
): Record<CompetitorRecommendationFilter, number> {
  return {
    Recommended: rows.filter((row) => row.recommendationRate != null).length,
    "No recommendation data": rows.filter((row) => row.recommendationRate == null).length,
  };
}

export function deriveCompetitorLeadRows(
  groups: readonly BrandCompetitiveGapGroupDto[],
): CompetitorLeadRow[] {
  const rows: CompetitorLeadRow[] = [];

  for (const group of groups) {
    for (const gap of group.gaps) {
      if (gap.mentionsGap < 0) {
        rows.push({
          id: `${group.trackedBrandId}:${gap.competitorId}:mentions`,
          trackedBrandName: group.trackedBrandName,
          competitorId: gap.competitorId,
          competitorName: gap.competitorName,
          leadType: "More mentions",
          gap: Math.abs(gap.mentionsGap),
          brandValue: gap.brandMentions,
          competitorValue: gap.competitorMentions,
          recommendedAction: "Review competitor evidence and strengthen answer coverage.",
        });
      }
      if (gap.recommendationsGap < 0) {
        rows.push({
          id: `${group.trackedBrandId}:${gap.competitorId}:recommendations`,
          trackedBrandName: group.trackedBrandName,
          competitorId: gap.competitorId,
          competitorName: gap.competitorName,
          leadType: "Higher recommendation rate",
          gap: Math.abs(gap.recommendationsGap),
          brandValue: gap.brandRecommendations,
          competitorValue: gap.competitorRecommendations,
          recommendedAction: "Audit recommendation-triggering answers and close proof gaps.",
        });
      }
    }
  }

  return rows
    .sort((a, b) => {
      if (b.gap !== a.gap) return b.gap - a.gap;
      return a.competitorName.localeCompare(b.competitorName);
    })
    .slice(0, 5);
}
