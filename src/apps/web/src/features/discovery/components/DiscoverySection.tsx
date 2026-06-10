import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { SectionHeader } from "@/components/molecules/SectionHeader";
import { cn } from "@/lib/utils";
import { DISCOVERY_COPY } from "@/content/discovery";
import { SuggestionCard } from "./SuggestionCard";
import { AddCustomItemForm } from "./AddCustomItemForm";
import { ManualFallbackPrompt } from "./ManualFallbackPrompt";
import type { CandidateDto } from "@/types/api";
import type { TypeOption } from "./AddCustomItemForm";

interface DiscoverySectionProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  emptyMessage: string;
  candidates: CandidateDto[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddCustom: (name: string, metadata?: Record<string, string>) => void;
  onRefresh?: () => void;
  refreshesRemaining?: number;
  isRefreshing?: boolean;
  typeOptions?: TypeOption[];
  typeMetadataKey?: string;
  typeRequired?: boolean;
  captureDomain?: boolean;
  /**
   * Optional per-candidate alias map (id → aliases). Only passed for
   * Product + Competitor sections. Undefined hides the chip editor.
   */
  aliasesById?: Record<string, string[]>;
  onCandidateAliasesChange?: (id: string, aliases: string[]) => void;
}

export function DiscoverySection({
  icon,
  title,
  description,
  emptyMessage,
  candidates,
  selectedIds,
  onToggle,
  onRemove,
  onSelectAll,
  onDeselectAll,
  onAddCustom,
  onRefresh,
  refreshesRemaining,
  isRefreshing,
  typeOptions,
  typeMetadataKey,
  typeRequired,
  captureDomain,
  aliasesById,
  onCandidateAliasesChange,
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
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
        )}
        <SectionHeader
          icon={icon}
          title={title}
          description={description}
          className="flex-1"
          meta={
            <span className="text-sm tabular-nums text-neutral-500">
              {DISCOVERY_COPY.confirmation.selectedCount
                .replace("{selected}", String(selectedCount))
                .replace("{total}", String(candidates.length))}
            </span>
          }
          actions={
            onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                disabled={refreshesRemaining === 0 || isRefreshing}
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                className="gap-1 text-xs"
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
            )
          }
        />
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
                {candidates.map((candidate) => {
                  const aliasesProps =
                    aliasesById && onCandidateAliasesChange
                      ? {
                          aliases: aliasesById[candidate.id] ?? candidate.aliases ?? [],
                          onAliasesChange: (next: string[]) =>
                            onCandidateAliasesChange(candidate.id, next),
                        }
                      : {};
                  return (
                    <SuggestionCard
                      key={candidate.id}
                      candidate={candidate}
                      selected={selectedIds.has(candidate.id)}
                      onToggle={onToggle}
                      onRemove={onRemove}
                      typeMetadataKey={typeMetadataKey}
                      typeLabels={typeLabels}
                      {...aliasesProps}
                    />
                  );
                })}
              </div>
            </>
          )}
          <AddCustomItemForm
            placeholder={DISCOVERY_COPY.customItem.addPlaceholder.replace(
              "{item}",
              title.toLowerCase().replace(/s$/, ""),
            )}
            onAdd={onAddCustom}
            typeOptions={typeOptions}
            metadataKey={typeMetadataKey}
            typeRequired={typeRequired}
            captureDomain={captureDomain}
          />
        </div>
      )}
    </div>
  );
}
