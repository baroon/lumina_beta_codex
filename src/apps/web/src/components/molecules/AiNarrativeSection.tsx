import { Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { type DateRangeSelection } from "@/components/molecules/DateRangePicker";
import { useGenerateAiNarrative } from "@/hooks/useAiNarrative";

/**
 * On-demand LLM-authored narrative panel. Shared between the Insights
 * workspace surface and the per-tracker hub overview tab. Renders a
 * single Generate button first; once fired, the narrative + "via
 * {platform}" byline render with a Regenerate affordance. The hook
 * keeps its mutation result in memory so dependent filter changes
 * don't blow it away — the user has to click Regenerate to refresh
 * after a scope change.
 *
 * `hasData` gates rendering entirely: when the underlying overview
 * has no scans yet, the section is hidden so the user doesn't pay
 * for a model call that has nothing to say.
 */
export function AiNarrativeSection({
  selection,
  trackerIds,
  hasData,
}: {
  selection: DateRangeSelection;
  trackerIds: readonly string[];
  hasData: boolean;
}) {
  const generate = useGenerateAiNarrative();

  if (!hasData) return null;

  function fire() {
    generate.mutate({ selection, trackerIds });
  }

  const errorMessage =
    generate.isError && generate.error instanceof Error
      ? generate.error.message
      : generate.isError
        ? "Could not generate the AI summary. Try again."
        : null;

  if (!generate.data && !generate.isPending && !generate.isError) {
    return (
      <div className="border-t border-neutral-100 pt-3">
        <Button variant="outline" size="sm" onClick={fire}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Generate AI summary
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-neutral-100 pt-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-neutral-500">
        <Sparkles className="h-3 w-3" aria-hidden />
        AI summary
        {generate.data && (
          <Badge variant="outline" className="text-[10px]">
            via {generate.data.platformCode}
          </Badge>
        )}
      </div>

      {generate.isPending && (
        <div
          className="flex items-center gap-2 text-xs text-neutral-500"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Asking the model…
        </div>
      )}

      {generate.data && !generate.isPending && (
        <p className="whitespace-pre-wrap text-sm text-neutral-700">{generate.data.narrative}</p>
      )}

      {errorMessage && (
        <p className="text-xs text-semantic-error-600" role="alert">
          {errorMessage}
        </p>
      )}

      <div>
        <Button variant="outline" size="sm" onClick={fire} disabled={generate.isPending}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {generate.data || generate.isError ? "Regenerate" : "Generate AI summary"}
        </Button>
      </div>
    </div>
  );
}
