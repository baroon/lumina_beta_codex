import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { ScrollArea } from "@/components/atoms/scroll-area";
import { Skeleton } from "@/components/atoms/skeleton";
import type { DateRangeSelection } from "@/components/molecules/DateRangePicker";
import { REPORTS_COPY } from "@/content/reports";
import { usePromptAnswerHistory } from "@/features/reports/hooks/usePromptAnswerHistory";
import { cn } from "@/lib/utils";
import type { PromptAnswerRowDto } from "@/types/api";

interface PromptAnswerHistoryDrawerProps {
  /** Prompt id whose history to show. null = drawer closed. */
  promptId: string | null;
  /** Same window as the parent page so the answer list matches what the row was aggregated from. */
  range: DateRangeSelection;
  onClose: () => void;
}

/**
 * Right-side drawer that drills from a /prompts row into the AI answers
 * that produced its metrics. Same shape as
 * {@link import('./SourceCitationsDrawer').SourceCitationsDrawer} so the
 * two analytical drill-downs read as the same affordance — Radix Dialog
 * positioned right, header + ScrollArea body, animated slide-in.
 *
 * The "not in scope" branch fires when the BE returns a 200 with an
 * empty PromptText (foreign workspace / unknown id) — the BE chose 200
 * + empty body over 404 specifically so the FE here renders a clean,
 * non-error empty state.
 */
export function PromptAnswerHistoryDrawer({
  promptId,
  range,
  onClose,
}: PromptAnswerHistoryDrawerProps) {
  const open = promptId !== null;
  const { data, isLoading, isError } = usePromptAnswerHistory(promptId, range);
  const copy = REPORTS_COPY.prompts.answerDrawer;

  const notInScope = data !== undefined && data.promptText === "" && data.answers.length === 0;
  const title = data?.promptText ? `${copy.title}: ${data.promptText}` : copy.title;
  const subtitle = data?.promptText ? answerHistorySubtitle(data.answers) : copy.noPromptSubtitle;

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-modal bg-neutral-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed right-0 top-0 z-modal flex h-full w-full max-w-2xl flex-col bg-surface-card shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold text-neutral-900">
                {title}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-neutral-500">
                {subtitle}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={copy.close}
                className="rounded p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </header>

          <ScrollArea className="flex-1">
            <div className="px-6 py-4">
              {isLoading && <DrawerSkeleton />}
              {isError && (
                <div className="rounded-md border border-semantic-error-200 bg-semantic-error-50 p-3 text-sm text-semantic-error-700">
                  {copy.error}
                </div>
              )}
              {!isLoading && !isError && notInScope && (
                <p className="text-sm text-neutral-500">{copy.notInScope}</p>
              )}
              {!isLoading && !isError && !notInScope && data && data.answers.length === 0 && (
                <p className="text-sm text-neutral-500">{copy.empty}</p>
              )}
              {data && data.answers.length > 0 && (
                <ul className="space-y-4">
                  {data.answers.map((answer) => (
                    <AnswerCard key={answer.answerId} answer={answer} />
                  ))}
                </ul>
              )}
            </div>
          </ScrollArea>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AnswerCard({ answer }: { answer: PromptAnswerRowDto }) {
  const copy = REPORTS_COPY.prompts.answerDrawer;
  const mentioned = answer.brandMentionCount > 0;
  const mentionLabel =
    answer.brandMentionCount === 1
      ? copy.mentionedCountLabelOne
      : copy.mentionedCountLabel.replace("{count}", answer.brandMentionCount.toString());

  return (
    <li className="rounded-md border border-neutral-200 p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          {answer.platformName}
        </Badge>
        <span className="text-[11px] text-neutral-500">{formatScannedAt(answer.scannedAt)}</span>
        {mentioned ? (
          <>
            <Badge variant="success" className="text-[10px]">
              Brand mentioned
            </Badge>
            <Badge variant={sentimentVariant(answer.dominantSentiment)} className="text-[10px]">
              {answer.dominantSentiment ?? "Unknown"}
            </Badge>
            <span className="text-[11px] tabular-nums text-neutral-500">{mentionLabel}</span>
            {answer.firstMentionPosition != null && (
              <span className="text-[11px] tabular-nums text-neutral-500">
                {copy.positionLabel.replace("{position}", answer.firstMentionPosition.toFixed(2))}
              </span>
            )}
          </>
        ) : (
          <span className="text-[11px] italic text-neutral-400">{copy.notMentioned}</span>
        )}
      </div>

      {mentioned && answer.evidenceSnippet && (
        <>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            {copy.sectionEvidence}
          </p>
          <p className="mt-1 rounded bg-neutral-50 p-2 text-sm text-neutral-800">
            {answer.evidenceSnippet}
          </p>
        </>
      )}

      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {copy.sectionAnswer}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">
        {answer.answerText || <span className="italic text-neutral-400">(empty body)</span>}
      </p>
    </li>
  );
}

function answerHistorySubtitle(answers: readonly PromptAnswerRowDto[]): string {
  const answerCount = answers.length;
  const platformCount = new Set(answers.map((answer) => answer.platformCode)).size;
  const mentionCount = answers.reduce((sum, answer) => sum + answer.brandMentionCount, 0);

  return [
    `${answerCount.toLocaleString()} ${answerCount === 1 ? "answer" : "answers"}`,
    `${platformCount.toLocaleString()} ${platformCount === 1 ? "platform" : "platforms"}`,
    `${mentionCount.toLocaleString()} brand ${mentionCount === 1 ? "mention" : "mentions"}`,
  ].join(" · ");
}

function DrawerSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function sentimentVariant(
  value: string | null,
): "default" | "secondary" | "outline" | "success" | "warning" {
  switch (value) {
    case "Positive":
      return "success";
    case "Negative":
    case "Mixed":
      return "warning";
    default:
      return "secondary";
  }
}

/** Compact "2d ago" / "3h ago" / "just now" — same shape as the row's Activity cell. */
function formatScannedAt(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 0) return "in future";
    const minutes = Math.round(diffMs / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.round(days / 30);
    return `${months}mo ago`;
  } catch {
    return iso;
  }
}
