export type CompetitorRelationshipFilter = "You" | "Competitor";
export type CompetitorRecommendationFilter = "Recommended" | "No recommendation data";

export interface CompetitorLeaderboardRow {
  isTrackedBrand: boolean;
  recommendationRate: number | null;
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
