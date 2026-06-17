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
