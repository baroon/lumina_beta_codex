import type { WorkspaceOverviewDto } from "@/types/api";

export interface SignalHighlight {
  id: string;
  text: string;
}

/**
 * Picks one short sentence per measurement-model signal that has
 * something meaningful to say in the current scope. Signals with no
 * data are skipped silently — the bullet list is the union of what
 * the workspace actually has. Order is fixed so the FE reads the
 * same way every refresh.
 *
 * Lives in `lib/` (not a feature) because both the workspace Insights
 * screen and the per-tracker hub consume it. Pure + side-effect-free.
 */
export function buildSignalHighlights(data: WorkspaceOverviewDto): readonly SignalHighlight[] {
  const out: SignalHighlight[] = [];

  // Absence rate — only surface when at least a quarter of answers
  // are missing the brand, otherwise it reads as noise.
  const absence = data.hero.brandAbsenceRate;
  if (absence != null && absence >= 0.25) {
    out.push({
      id: "absence",
      text: `Your brand is absent from ${formatPct(absence)} of in-scope answers.`,
    });
  }

  // Top brand attributes — first 2-3 attributes the AI ascribes,
  // tagged by polarity so the reader knows whether it's praise or
  // criticism.
  if (data.topBrandAttributes.length > 0) {
    const picks = data.topBrandAttributes.slice(0, 3);
    const phrase = picks.map((a) => `"${a.name}" (${a.polarity.toLowerCase()})`).join(", ");
    out.push({
      id: "attributes",
      text: `AI describes your brand as ${phrase}.`,
    });
  }

  // Risk flags — counts only, since the surface card has the detail.
  if (data.topBrandRiskFlags.length > 0) {
    const total = data.topBrandRiskFlags.reduce((sum, f) => sum + f.mentionCount, 0);
    const topTypes = data.topBrandRiskFlags
      .slice(0, 2)
      .map((f) => f.flagType)
      .join(", ");
    out.push({
      id: "risk",
      text: `${total} risk ${total === 1 ? "flag" : "flags"} raised — most often: ${topTypes}.`,
    });
  }

  // Head-to-head — first win and first loss when both exist; one or
  // the other when one side is empty.
  const wins = data.topBrandComparisons.filter((c) => c.winCount > c.lossCount);
  const losses = data.topBrandComparisons.filter((c) => c.lossCount > c.winCount);
  if (wins.length > 0 || losses.length > 0) {
    const parts: string[] = [];
    if (wins.length > 0) parts.push(`win on ${wins[0].aspect}`);
    if (losses.length > 0) parts.push(`lose on ${losses[0].aspect}`);
    out.push({
      id: "comparisons",
      text: `Head-to-head: AI judges you ${parts.join(", ")}.`,
    });
  }

  // Topic ownership — first dominant topic (≥66%) and first weak
  // topic (≤33%) — the "you own X, you lose Y" framing.
  const owned = data.topicOwnership.find(
    (t) => t.promptCount > 0 && t.brandMentionedPromptCount / t.promptCount >= 2 / 3,
  );
  const lost = data.topicOwnership.find(
    (t) => t.promptCount > 0 && t.brandMentionedPromptCount / t.promptCount <= 1 / 3,
  );
  if (owned || lost) {
    const parts: string[] = [];
    if (owned) {
      const rate = Math.round((owned.brandMentionedPromptCount / owned.promptCount) * 100);
      parts.push(`own "${owned.topicName}" (${rate}%)`);
    }
    if (lost) {
      const rate = Math.round((lost.brandMentionedPromptCount / lost.promptCount) * 100);
      parts.push(`lose "${lost.topicName}" (${rate}%)`);
    }
    out.push({
      id: "topics",
      text: `Topic mix: you ${parts.join(", ")}.`,
    });
  }

  // Factual claims — count the disputed ones (the actionable signal)
  // and the pending ones (the queue).
  if (data.recentFactualClaims.length > 0) {
    const disputed = data.recentFactualClaims.filter((c) => c.reviewStatus === "Disputed").length;
    const pending = data.recentFactualClaims.filter((c) => c.reviewStatus === "Pending").length;
    if (disputed > 0 || pending > 0) {
      const parts: string[] = [];
      if (disputed > 0) parts.push(`${disputed} disputed`);
      if (pending > 0) parts.push(`${pending} pending review`);
      out.push({
        id: "claims",
        text: `Factual claims: ${parts.join(", ")}.`,
      });
    }
  }

  return out;
}

function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}
