import type { WorkspaceCompetitiveDto, WorkspaceOverviewDto } from "@/types/api";

export type RecommendationImpact = "High" | "Medium" | "Low";
export type RecommendationEffort = "Low" | "Medium" | "High";
export type RecommendationStatus = "Open" | "Planned" | "Done";
export type RecommendationCategory =
  | "Claim correction"
  | "Content improvement"
  | "New content opportunity"
  | "Citation improvement"
  | "Competitive positioning"
  | "Trust signal improvement";

export interface RecommendationItem {
  id: string;
  priority: number;
  title: string;
  summary: string;
  lens: string;
  impact: RecommendationImpact;
  effort: RecommendationEffort;
  evidenceCount: number;
  evidenceLabel: string;
  status: RecommendationStatus;
  action: string;
  why: string;
  evidence: readonly string[];
}

export interface RecommendationCategorySummary {
  category: RecommendationCategory;
  count: number;
  highImpactCount: number;
}

export function deriveRecommendations(
  overview: WorkspaceOverviewDto | undefined,
  competitive: WorkspaceCompetitiveDto | undefined,
): RecommendationItem[] {
  if (!overview) return [];

  const items: RecommendationItem[] = [];

  for (const claim of overview.recentFactualClaims.filter((c) => c.reviewStatus !== "Verified")) {
    items.push({
      id: `claim-${claim.claimId}`,
      priority: 0,
      title: `Review claim about ${claim.subject}`,
      summary: claim.claimText,
      lens: "Claims & Risks",
      impact: claim.reviewStatus === "Disputed" ? "High" : "Medium",
      effort: "Low",
      evidenceCount: 1,
      evidenceLabel: "claim",
      status: "Open",
      action: "Review claim",
      why: "Unreviewed or disputed factual claims can create brand accuracy and reputation risk.",
      evidence: [claim.evidenceSnippet || claim.claimText],
    });
  }

  for (const risk of overview.topBrandRiskFlags.slice(0, 3)) {
    items.push({
      id: `risk-${risk.flagType}`,
      priority: 0,
      title: `Address ${humanize(risk.flagType)} risk theme`,
      summary: `${risk.mentionCount} AI answer mentions include this risk theme.`,
      lens: "Sentiment",
      impact: risk.severity === "High" ? "High" : "Medium",
      effort: "Medium",
      evidenceCount: risk.mentionCount,
      evidenceLabel: risk.mentionCount === 1 ? "mention" : "mentions",
      status: "Open",
      action: "Create mitigation brief",
      why: "Repeated risk language should be reviewed and countered with clearer owned content and proof points.",
      evidence: [`Severity: ${risk.severity}`, `${risk.mentionCount} mentions`],
    });
  }

  const weakTopics = overview.topicOwnership
    .map((topic) => ({
      ...topic,
      visibility: topic.promptCount === 0 ? 0 : topic.brandMentionedPromptCount / topic.promptCount,
    }))
    .filter((topic) => topic.promptCount > 0 && topic.visibility < 0.5)
    .slice(0, 3);

  for (const topic of weakTopics) {
    items.push({
      id: `topic-${topic.topicName}`,
      priority: 0,
      title: `Improve topic visibility for ${topic.topicName}`,
      summary: `Your brand appeared in ${topic.brandMentionedPromptCount} of ${topic.promptCount} tracked AI questions for this topic.`,
      lens: "Content Gaps",
      impact: "Medium",
      effort: "Medium",
      evidenceCount: topic.promptCount,
      evidenceLabel: topic.promptCount === 1 ? "question" : "questions",
      status: "Open",
      action: "Build content brief",
      why: "Weak topic visibility points to content gaps, missing proof points, or insufficient citation authority.",
      evidence: [
        `${Math.round(topic.visibility * 100)}% topic visibility`,
        `${topic.brandMentionedPromptCount}/${topic.promptCount} AI questions mentioned the brand`,
      ],
    });
  }

  for (const group of competitive?.competitiveGaps ?? []) {
    const negativeGap = group.gaps.find((gap) => gap.mentionsGap < 0 || gap.recommendationsGap < 0);
    if (!negativeGap) continue;
    items.push({
      id: `gap-${group.trackedBrandId}-${negativeGap.competitorId}`,
      priority: 0,
      title: `Close the gap with ${negativeGap.competitorName}`,
      summary: `${negativeGap.competitorName} is ahead on ${negativeGap.mentionsGap < 0 ? "mentions" : "recommendations"} for ${group.trackedBrandName}.`,
      lens: "Competitive",
      impact: "High",
      effort: "High",
      evidenceCount: Math.abs(negativeGap.mentionsGap) + Math.abs(negativeGap.recommendationsGap),
      evidenceLabel: "gap points",
      status: "Open",
      action: "Analyze competitor evidence",
      why: "Competitor gaps show where AI platforms prefer another entity in answers that matter to the selected tracker.",
      evidence: [
        `Mention gap: ${negativeGap.mentionsGap}`,
        `Recommendation gap: ${negativeGap.recommendationsGap}`,
      ],
    });
  }

  if (overview.hero.brandAbsenceRate != null && overview.hero.brandAbsenceRate > 0.3) {
    items.push({
      id: "absence-rate",
      priority: 0,
      title: "Reduce not-mentioned rate",
      summary: `${Math.round(overview.hero.brandAbsenceRate * 100)}% of in-scope answers did not mention or cite a tracked brand.`,
      lens: "Discovery",
      impact: "High",
      effort: "Medium",
      evidenceCount: overview.hero.queries,
      evidenceLabel: overview.hero.queries === 1 ? "answer" : "answers",
      status: "Open",
      action: "Prioritize discovery content",
      why: "A high not-mentioned rate means AI platforms are not reliably associating your brand with the tracked market and topics.",
      evidence: [`${overview.hero.queries.toLocaleString()} AI answers in scope`],
    });
  }

  if (overview.hero.brandFirstMentionRate != null && overview.hero.brandFirstMentionRate < 0.25) {
    items.push({
      id: "first-mention-rate",
      priority: 0,
      title: "Improve first-mention prominence",
      summary: `Your brand appeared first in only ${Math.round(overview.hero.brandFirstMentionRate * 100)}% of answers with entity mentions.`,
      lens: "Buying Intent",
      impact: "Medium",
      effort: "Medium",
      evidenceCount: overview.hero.mentions,
      evidenceLabel: overview.hero.mentions === 1 ? "mention" : "mentions",
      status: "Open",
      action: "Strengthen proof points",
      why: "First mention indicates prominence. Low first-mention rate often means AI understands the brand but does not lead with it.",
      evidence: [`${overview.hero.mentions.toLocaleString()} brand mentions in scope`],
    });
  }

  return items
    .sort((a, b) => {
      const impactRank = impactScore(b.impact) - impactScore(a.impact);
      if (impactRank !== 0) return impactRank;
      return b.evidenceCount - a.evidenceCount;
    })
    .map((item, index) => ({ ...item, priority: index + 1 }));
}

function impactScore(impact: RecommendationImpact): number {
  switch (impact) {
    case "High":
      return 3;
    case "Medium":
      return 2;
    case "Low":
      return 1;
  }
}

export function deriveRecommendationCategory(item: RecommendationItem): RecommendationCategory {
  if (item.lens === "Claims & Risks") return "Claim correction";
  if (item.lens === "Competitive") return "Competitive positioning";
  if (item.lens === "Content Gaps") return "New content opportunity";
  if (item.lens === "Sentiment") return "Trust signal improvement";
  if (item.lens === "Discovery") return "Content improvement";
  return "Citation improvement";
}

export function summarizeRecommendationCategories(
  items: readonly RecommendationItem[],
): RecommendationCategorySummary[] {
  const summaries = new Map<RecommendationCategory, RecommendationCategorySummary>();
  for (const item of items) {
    const category = deriveRecommendationCategory(item);
    const current = summaries.get(category) ?? { category, count: 0, highImpactCount: 0 };
    current.count += 1;
    if (item.impact === "High") current.highImpactCount += 1;
    summaries.set(category, current);
  }
  return Array.from(summaries.values()).sort((a, b) => {
    if (b.highImpactCount !== a.highImpactCount) return b.highImpactCount - a.highImpactCount;
    if (b.count !== a.count) return b.count - a.count;
    return a.category.localeCompare(b.category);
  });
}

export function deriveQuickWins(items: readonly RecommendationItem[]): RecommendationItem[] {
  return items
    .filter(
      (item) =>
        item.status !== "Done" &&
        item.effort === "Low" &&
        (item.impact === "High" || item.impact === "Medium"),
    )
    .sort((a, b) => {
      const impactRank = impactScore(b.impact) - impactScore(a.impact);
      if (impactRank !== 0) return impactRank;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.evidenceCount - a.evidenceCount;
    })
    .slice(0, 3);
}

function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
}
