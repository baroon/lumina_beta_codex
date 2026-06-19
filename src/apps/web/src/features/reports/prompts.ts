import type { WorkspacePromptRowDto } from "@/types/api";

export type QuestionStatus = "No answers" | "Needs attention" | "Not visible" | "Brand visible";
export type QuestionAttentionPriority = "High" | "Medium";
export type QuestionAttentionAction =
  | "Run first scan"
  | "Improve answer coverage"
  | "Close visibility gap";

export interface VisibilityDistributionBucket {
  label: string;
  value: number;
}

export interface QuestionAttentionItem {
  promptId: string;
  text: string;
  lensName: string;
  status: Exclude<QuestionStatus, "Brand visible">;
  priority: QuestionAttentionPriority;
  action: QuestionAttentionAction;
  reason: string;
}

export const QUESTION_STATUS_ORDER: readonly QuestionStatus[] = [
  "No answers",
  "Needs attention",
  "Not visible",
  "Brand visible",
];

// Product visibility buckets from the AI Questions spec. Null visibility
// means no in-window answers and is excluded from the distribution.
const VISIBILITY_BUCKETS: ReadonlyArray<{ label: string; minExclusive: number; max: number }> = [
  { label: "Not visible", minExclusive: -1, max: 0 },
  { label: "Weak", minExclusive: 0, max: 0.25 },
  { label: "Moderate", minExclusive: 0.25, max: 0.5 },
  { label: "Strong", minExclusive: 0.5, max: 0.75 },
  { label: "Dominant", minExclusive: 0.75, max: 1 },
];

export function deriveQuestionStatus(row: WorkspacePromptRowDto): QuestionStatus {
  if (row.scanCount === 0 || row.visibilityRate == null) return "No answers";
  if (row.visibilityRate < 0.25) return "Needs attention";
  if (row.brandMentionCount === 0) return "Not visible";
  return "Brand visible";
}

export function filterQuestionsByStatus(
  rows: readonly WorkspacePromptRowDto[],
  statuses: readonly QuestionStatus[],
): WorkspacePromptRowDto[] {
  if (statuses.length === 0) return [...rows];
  const wanted = new Set(statuses);
  return rows.filter((row) => wanted.has(deriveQuestionStatus(row)));
}

export function countQuestionsByStatus(
  rows: readonly WorkspacePromptRowDto[],
): Record<QuestionStatus, number> {
  const counts = Object.fromEntries(QUESTION_STATUS_ORDER.map((status) => [status, 0])) as Record<
    QuestionStatus,
    number
  >;
  for (const row of rows) {
    const status = deriveQuestionStatus(row);
    counts[status] += 1;
  }
  return counts;
}

export function deriveVisibilityDistribution(
  prompts: readonly WorkspacePromptRowDto[],
): VisibilityDistributionBucket[] {
  return VISIBILITY_BUCKETS.map((bucket) => ({
    label: bucket.label,
    value: prompts.filter(
      (prompt) =>
        prompt.visibilityRate != null &&
        prompt.visibilityRate > bucket.minExclusive &&
        prompt.visibilityRate <= bucket.max,
    ).length,
  }));
}

export function deriveQuestionAttentionItems(
  rows: readonly WorkspacePromptRowDto[],
): QuestionAttentionItem[] {
  return rows
    .map((row): QuestionAttentionItem | null => {
      const status = deriveQuestionStatus(row);
      if (status === "Brand visible") return null;
      if (status === "No answers") {
        return {
          promptId: row.promptId,
          text: row.text,
          lensName: row.lensName,
          status,
          priority: "High",
          action: "Run first scan",
          reason: "This AI question has no answer evidence in the selected range.",
        };
      }
      if (status === "Needs attention") {
        return {
          promptId: row.promptId,
          text: row.text,
          lensName: row.lensName,
          status,
          priority: "High",
          action: "Improve answer coverage",
          reason: "Tracked brands appear, but visibility is below the healthy threshold.",
        };
      }
      return {
        promptId: row.promptId,
        text: row.text,
        lensName: row.lensName,
        status,
        priority: "Medium",
        action: "Close visibility gap",
        reason: "Answers exist, but tracked brands are not currently visible.",
      };
    })
    .filter((item): item is QuestionAttentionItem => item != null)
    .sort((a, b) => {
      const priority = attentionPriorityRank(a.priority) - attentionPriorityRank(b.priority);
      if (priority !== 0) return priority;
      return QUESTION_STATUS_ORDER.indexOf(a.status) - QUESTION_STATUS_ORDER.indexOf(b.status);
    })
    .slice(0, 5);
}

function attentionPriorityRank(priority: QuestionAttentionPriority): number {
  return priority === "High" ? 0 : 1;
}
