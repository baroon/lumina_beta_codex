import * as Dialog from "@radix-ui/react-dialog";
import { Badge } from "@/components/atoms/badge";
import { ScrollArea } from "@/components/atoms/scroll-area";
import { Skeleton } from "@/components/atoms/skeleton";
import { REPORTS_COPY } from "@/content/reports";
import { cn } from "@/lib/utils";
import { ExternalLink, X } from "lucide-react";
import { useScanSourceCitations } from "@/features/reports/hooks/useScanSourceCitations";

interface SourceCitationsDrawerProps {
  scanRunId: string;
  /** SourceId of the row whose drawer should open. null = drawer closed. */
  sourceId: string | null;
  onClose: () => void;
}

/**
 * Right-side drawer that drills from a row in the Sources table into the
 * prompts + AI answers that produced each citation of that source
 * (Phase 4 v1 plan §D15). Lighter-weight than the full Prompt Evidence
 * view from ADR-004 §"Prompt Evidence view" — that view is anchored on
 * Findings and ships in a later phase.
 */
export function SourceCitationsDrawer({
  scanRunId,
  sourceId,
  onClose,
}: SourceCitationsDrawerProps) {
  const open = sourceId !== null;
  const { data, isLoading, isError } = useScanSourceCitations(scanRunId, sourceId);
  const copy = REPORTS_COPY.sources.drawer;

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
            <div>
              <Dialog.Title className="text-base font-semibold text-neutral-900">
                {data?.sourceName ?? copy.title}
              </Dialog.Title>
              {data?.domain && (
                <Dialog.Description className="mt-0.5 text-xs text-neutral-500">
                  {data.domain}
                </Dialog.Description>
              )}
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
              {data && data.citations.length === 0 && (
                <p className="text-sm text-neutral-500">{copy.empty}</p>
              )}
              {data && data.citations.length > 0 && (
                <ul className="space-y-4">
                  {data.citations.map((citation) => (
                    <li
                      key={citation.citationId}
                      className="rounded-md border border-neutral-200 p-4"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {citation.platformName}
                        </Badge>
                        {citation.lensName && (
                          <Badge variant="outline" className="text-xs">
                            {citation.lensName}
                          </Badge>
                        )}
                        {citation.url && (
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {copy.openUrl}
                          </a>
                        )}
                      </div>
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        {copy.prompt}
                      </p>
                      <p className="mt-1 text-sm text-neutral-800">{citation.promptText}</p>
                      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                        {copy.answerSnippet}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">
                        {citation.answerSnippet}
                      </p>
                    </li>
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

function DrawerSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
