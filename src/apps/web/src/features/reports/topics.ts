import type { WorkspaceOverviewDto, WorkspaceTopicOwnershipDto } from "@/types/api";

export type TopicOwnershipBand = "Owned" | "Contested" | "Gap";
export type TopicAction = "Defend" | "Build authority" | "Create coverage";

export interface TopicOpportunityRow {
  id: string;
  rank: number;
  topicName: string;
  promptCount: number;
  brandMentionedPromptCount: number;
  ownershipRate: number;
  missedPromptCount: number;
  band: TopicOwnershipBand;
  action: TopicAction;
  evidence: string[];
}

export interface TopicRecommendationPreview {
  title: string;
  priority: "High" | "Medium" | "Low";
  steps: string[];
}

export function deriveTopicOpportunities(
  overview: WorkspaceOverviewDto | undefined,
): TopicOpportunityRow[] {
  if (!overview) return [];

  return (overview.topicOwnership ?? [])
    .map((topic) => toTopicOpportunity(topic))
    .sort((a, b) => {
      const bandOrder = bandPriority(a.band) - bandPriority(b.band);
      if (bandOrder !== 0) return bandOrder;
      return b.promptCount - a.promptCount;
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function filterTopicOpportunities(
  rows: readonly TopicOpportunityRow[],
  bandFilter: TopicOwnershipBand | null,
  actionFilter: TopicAction | null,
): readonly TopicOpportunityRow[] {
  return rows.filter((row) => {
    if (bandFilter && row.band !== bandFilter) return false;
    if (actionFilter && row.action !== actionFilter) return false;
    return true;
  });
}

export function countTopicsByBand(
  rows: readonly TopicOpportunityRow[],
): Record<TopicOwnershipBand, number> {
  return {
    Owned: rows.filter((row) => row.band === "Owned").length,
    Contested: rows.filter((row) => row.band === "Contested").length,
    Gap: rows.filter((row) => row.band === "Gap").length,
  };
}

export function countTopicsByAction(
  rows: readonly TopicOpportunityRow[],
): Record<TopicAction, number> {
  return {
    Defend: rows.filter((row) => row.action === "Defend").length,
    "Build authority": rows.filter((row) => row.action === "Build authority").length,
    "Create coverage": rows.filter((row) => row.action === "Create coverage").length,
  };
}

export function deriveContentOpportunityTopics(
  rows: readonly TopicOpportunityRow[],
): TopicOpportunityRow[] {
  return rows
    .filter((row) => row.action !== "Defend")
    .sort((a, b) => {
      if (b.missedPromptCount !== a.missedPromptCount) {
        return b.missedPromptCount - a.missedPromptCount;
      }
      return a.rank - b.rank;
    })
    .slice(0, 4);
}

export function deriveTopicRecommendationPreview(
  row: TopicOpportunityRow,
): TopicRecommendationPreview {
  if (row.action === "Create coverage") {
    return {
      title: `Create coverage for ${row.topicName}`,
      priority: "High",
      steps: [
        "Publish or update a page that directly answers the missing AI questions.",
        "Add concrete proof points, examples, and cited claims that AI answers can reuse.",
        "Link the page from existing high-authority topic and product pages.",
      ],
    };
  }

  if (row.action === "Build authority") {
    return {
      title: `Strengthen authority for ${row.topicName}`,
      priority: "Medium",
      steps: [
        "Refresh the strongest existing topic page with clearer claims and evidence.",
        "Add comparisons, FAQs, and third-party citations that support the brand position.",
        "Close the highest-volume missed AI questions before expanding the topic cluster.",
      ],
    };
  }

  return {
    title: `Defend coverage for ${row.topicName}`,
    priority: "Low",
    steps: [
      "Keep proof points current and easy for AI answers to cite.",
      "Monitor ownership rate movement after new scans land.",
      "Refresh examples when competitors start appearing in the same topic answers.",
    ],
  };
}

function toTopicOpportunity(topic: WorkspaceTopicOwnershipDto): TopicOpportunityRow {
  const ownershipRate =
    topic.promptCount > 0 ? topic.brandMentionedPromptCount / topic.promptCount : 0;
  const band = ownershipRate >= 0.6 ? "Owned" : ownershipRate >= 0.3 ? "Contested" : "Gap";
  const missedPromptCount = Math.max(0, topic.promptCount - topic.brandMentionedPromptCount);

  return {
    id: topic.topicName,
    rank: topic.rank,
    topicName: topic.topicName,
    promptCount: topic.promptCount,
    brandMentionedPromptCount: topic.brandMentionedPromptCount,
    ownershipRate,
    missedPromptCount,
    band,
    action:
      band === "Owned" ? "Defend" : band === "Contested" ? "Build authority" : "Create coverage",
    evidence: [
      `${topic.promptCount.toLocaleString()} tracked AI questions in scope`,
      `${topic.brandMentionedPromptCount.toLocaleString()} AI questions mentioned a tracked brand`,
      `${missedPromptCount.toLocaleString()} AI questions did not mention a tracked brand`,
    ],
  };
}

function bandPriority(band: TopicOwnershipBand): number {
  switch (band) {
    case "Gap":
      return 0;
    case "Contested":
      return 1;
    case "Owned":
      return 2;
  }
}
