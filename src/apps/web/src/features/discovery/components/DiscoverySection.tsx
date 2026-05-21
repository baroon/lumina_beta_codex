import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, CheckSquare, Square, RefreshCw } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { cn } from "@/lib/utils";
import { DISCOVERY_COPY } from "@/content/discovery";
import { SuggestionCard } from "./SuggestionCard";
import { AddCustomItemForm } from "./AddCustomItemForm";
import { ManualFallbackPrompt } from "./ManualFallbackPrompt";
import type { CandidateDto } from "@/types/api";
import type { TypeOption } from "./AddCustomItemForm";

interface DiscoverySectionProps {
  title: string;
  description: string;
  emptyMessage: string;
  candidates: CandidateDto[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddCustom: (name: string, metadata?: Record<string, string>) => void;
  onRefresh?: () => void;
  refreshesRemaining?: number;
  isRefreshing?: boolean;
  typeOptions?: TypeOption[];
  typeMetadataKey?: string;
  typeRequired?: boolean;
}

export function DiscoverySection({
  title,
  description,
  emptyMessage,
  candidates,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onAddCustom,
  onRefresh,
  refreshesRemaining,
  isRefreshing,
  typeOptions,
  typeMetadataKey,
  typeRequired,
}: DiscoverySectionProps) {
  const [expanded, setExpanded] = useState(true);
  const allSelected = candidates.length > 0 && candidates.every((c) => selectedIds.has(c.id));
  const selectedCount = candidates.filter((c) => selectedIds.has(c.id)).length;
  const typeLabels = useMemo(
    () =>
      typeOptions ? Object.fromEntries(typeOptions.map((o) => [o.value, o.label])) : undefined,
    [typeOptions],
  );

  return (
    <div className="rounded-lg border border-neutral-200 bg-surface-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-500" />
          )}
          <div>
            <h3 className="font-semibold text-neutral-900">{title}</h3>
            <p className="text-xs text-neutral-500">{description}</p>
          </div>
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              disabled={refreshesRemaining === 0 || isRefreshing}
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              className="ml-2 gap-1 text-xs"
              title={DISCOVERY_COPY.buttons.refreshLens}
            >
              <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
              {refreshesRemaining !== undefined && (
                <span className="text-neutral-400">
                  {DISCOVERY_COPY.buttons.refreshLensRemaining.replace(
                    "{count}",
                    String(refreshesRemaining),
                  )}
                </span>
              )}
            </Button>
          )}
        </div>
        <span className="text-sm text-neutral-500">
          {DISCOVERY_COPY.confirmation.selectedCount
            .replace("{selected}", String(selectedCount))
            .replace("{total}", String(candidates.length))}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-neutral-100 p-4 space-y-3">
          {candidates.length === 0 ? (
            <ManualFallbackPrompt message={emptyMessage} />
          ) : (
            <>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={allSelected ? onDeselectAll : onSelectAll}
                  className="gap-1 text-xs"
                >
                  {allSelected ? (
                    <>
                      <Square className="h-3 w-3" /> {DISCOVERY_COPY.buttons.deselectAll}
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-3 w-3" /> {DISCOVERY_COPY.buttons.selectAll}
                    </>
                  )}
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {candidates.map((candidate) => (
                  <SuggestionCard
                    key={candidate.id}
                    candidate={candidate}
                    selected={selectedIds.has(candidate.id)}
                    onToggle={onToggle}
                    typeMetadataKey={typeMetadataKey}
                    typeLabels={typeLabels}
                  />
                ))}
              </div>
            </>
          )}
          <AddCustomItemForm
            placeholder={`Add a ${title.toLowerCase().replace(/s$/, "")}...`}
            onAdd={onAddCustom}
            typeOptions={typeOptions}
            metadataKey={typeMetadataKey}
            typeRequired={typeRequired}
          />
        </div>
      )}
    </div>
  );
}
