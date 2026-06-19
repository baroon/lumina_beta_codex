import type { WorkspaceOverviewDto } from "@/types/api";

export type OverviewAttentionPriority = "High" | "Medium";
export type OverviewAttentionKind = "Risk" | "Claim" | "Topic" | "Citation";

export interface OverviewAttentionItem {
  id: string;
  kind: OverviewAttentionKind;
  title: string;
  reason: string;
  priority: OverviewAttentionPriority;
  action: string;
  href: string;
}

export function deriveOverviewAttentionItems(data: WorkspaceOverviewDto): OverviewAttentionItem[] {
  const items: OverviewAttentionItem[] = [];
  const highRisk = data.topBrandRiskFlags.find((flag) => flag.severity === "High");
  if (highRisk) {
    items.push({
      id: `risk-${highRisk.flagType}`,
      kind: "Risk",
      title: `Review ${formatLabel(highRisk.flagType)}`,
      reason: `${highRisk.mentionCount.toLocaleString()} high-severity mention${
        highRisk.mentionCount === 1 ? "" : "s"
      } appeared in AI answers.`,
      priority: "High",
      action: "Review claims",
      href: "/claims-risks",
    });
  }

  const disputedClaim = data.recentFactualClaims.find((claim) => claim.reviewStatus === "Disputed");
  if (disputedClaim) {
    items.push({
      id: `claim-${disputedClaim.claimId}`,
      kind: "Claim",
      title: disputedClaim.claimText,
      reason: `${disputedClaim.brandName} has a disputed AI claim that should be resolved before reporting.`,
      priority: "High",
      action: "Open claim review",
      href: "/claims-risks",
    });
  }

  const pendingClaims = data.recentFactualClaims.filter(
    (claim) => claim.reviewStatus === "Pending",
  );
  if (pendingClaims.length > 0) {
    items.push({
      id: "claims-pending",
      kind: "Claim",
      title: `${pendingClaims.length.toLocaleString()} claim${
        pendingClaims.length === 1 ? "" : "s"
      } waiting for review`,
      reason: "Verify factual statements AI is making about tracked brands.",
      priority: "Medium",
      action: "Review claims",
      href: "/claims-risks",
    });
  }

  const weakTopic = data.topicOwnership
    .map((topic) => ({
      ...topic,
      visibility:
        topic.promptCount > 0 ? topic.brandMentionedPromptCount / topic.promptCount : null,
    }))
    .filter((topic) => topic.visibility != null && topic.visibility < 0.33)
    .sort((a, b) => (a.visibility ?? 0) - (b.visibility ?? 0))[0];
  if (weakTopic) {
    items.push({
      id: `topic-${weakTopic.topicName}`,
      kind: "Topic",
      title: `Improve ${weakTopic.topicName}`,
      reason: `Tracked brands appear in ${weakTopic.brandMentionedPromptCount}/${weakTopic.promptCount} AI questions for this topic.`,
      priority: "Medium",
      action: "View topics",
      href: "/topics",
    });
  }

  const ownedCitationShare = latestNumericSeriesValue(data, "OwnedCitationShare");
  if (ownedCitationShare != null && ownedCitationShare < 0.35) {
    items.push({
      id: "citation-owned-share",
      kind: "Citation",
      title: "Increase owned citation share",
      reason: `Owned sources represent ${Math.round(ownedCitationShare * 100)}% of recent citations.`,
      priority: "Medium",
      action: "Review sources",
      href: "/sources",
    });
  }

  return items.sort(compareAttentionItems).slice(0, 5);
}

function latestNumericSeriesValue(data: WorkspaceOverviewDto, metricName: string): number | null {
  const points = data.series
    .filter((series) => series.metricName === metricName)
    .flatMap((series) => series.points)
    .filter((point) => point.value != null)
    .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt));
  return points[0]?.value ?? null;
}

function compareAttentionItems(a: OverviewAttentionItem, b: OverviewAttentionItem): number {
  const priority = attentionPriorityRank(a.priority) - attentionPriorityRank(b.priority);
  if (priority !== 0) return priority;
  return attentionKindRank(a.kind) - attentionKindRank(b.kind);
}

function attentionPriorityRank(priority: OverviewAttentionPriority): number {
  return priority === "High" ? 0 : 1;
}

function attentionKindRank(kind: OverviewAttentionKind): number {
  return ["Risk", "Claim", "Topic", "Citation"].indexOf(kind);
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ");
}
