import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DiscoverySection } from "./DiscoverySection";
import { PageHeader } from "@/components/layout/PageHeader";
import { DISCOVERY_COPY } from "@/content/discovery";
import { useConfirmDiscovery } from "../hooks/useDiscovery";
import type { DiscoveryResultsDto, CandidateDto } from "@/types/api";

interface DiscoveryConfirmationScreenProps {
  results: DiscoveryResultsDto;
}

type SectionKey = "products" | "audiences" | "markets" | "topics" | "competitors" | "trustSignals";

const SECTIONS: { key: SectionKey; copy: { title: string; description: string; emptyMessage: string } }[] = [
  { key: "products", copy: DISCOVERY_COPY.sections.products },
  { key: "audiences", copy: DISCOVERY_COPY.sections.audiences },
  { key: "markets", copy: DISCOVERY_COPY.sections.markets },
  { key: "topics", copy: DISCOVERY_COPY.sections.topics },
  { key: "competitors", copy: DISCOVERY_COPY.sections.competitors },
  { key: "trustSignals", copy: DISCOVERY_COPY.sections.trustSignals },
];

export function DiscoveryConfirmationScreen({ results }: DiscoveryConfirmationScreenProps) {
  const confirmMutation = useConfirmDiscovery(results.brandId);

  // Initialize selections: preselect high-confidence items
  const initialSelections = useMemo(() => {
    const selections = new Map<string, Set<string>>();
    for (const { key } of SECTIONS) {
      const candidates = results[key] as CandidateDto[];
      const preselected = new Set(
        candidates.filter((c) => c.confidence >= 0.5).map((c) => c.id)
      );
      selections.set(key, preselected);
    }
    return selections;
  }, [results]);

  const [selections, setSelections] = useState(initialSelections);
  const [customItems, setCustomItems] = useState<Map<string, CandidateDto[]>>(new Map());

  const toggleItem = useCallback((sectionKey: string, id: string) => {
    setSelections((prev) => {
      const next = new Map(prev);
      const sectionSet = new Set(next.get(sectionKey) || []);
      if (sectionSet.has(id)) {
        sectionSet.delete(id);
      } else {
        sectionSet.add(id);
      }
      next.set(sectionKey, sectionSet);
      return next;
    });
  }, []);

  const selectAll = useCallback((sectionKey: string, candidates: CandidateDto[]) => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(sectionKey, new Set(candidates.map((c) => c.id)));
      return next;
    });
  }, []);

  const deselectAll = useCallback((sectionKey: string) => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(sectionKey, new Set<string>());
      return next;
    });
  }, []);

  const addCustomItem = useCallback((sectionKey: string, name: string) => {
    const newItem: CandidateDto = {
      id: `custom-${Date.now()}`,
      name,
      description: null,
      confidence: 1.0,
      source: "UserAdded",
      status: "Suggested",
      metadata: {},
    };

    setCustomItems((prev) => {
      const next = new Map(prev);
      const items = [...(next.get(sectionKey) || []), newItem];
      next.set(sectionKey, items);
      return next;
    });

    setSelections((prev) => {
      const next = new Map(prev);
      const sectionSet = new Set(next.get(sectionKey) || []);
      sectionSet.add(newItem.id);
      next.set(sectionKey, sectionSet);
      return next;
    });
  }, []);

  const handleConfirm = () => {
    const confirmedIds: string[] = [];
    const dismissedIds: string[] = [];

    for (const { key } of SECTIONS) {
      const candidates = results[key] as CandidateDto[];
      const selected = selections.get(key) || new Set<string>();
      for (const c of candidates) {
        if (selected.has(c.id)) {
          confirmedIds.push(c.id);
        } else {
          dismissedIds.push(c.id);
        }
      }
    }

    confirmMutation.mutate({ confirmedIds, dismissedIds });
  };

  const getCombinedCandidates = (key: string): CandidateDto[] => {
    const original = (results[key as SectionKey] as CandidateDto[]) || [];
    const custom = customItems.get(key) || [];
    return [...original, ...custom];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Confirm Discovery: ${results.brandName}`}
        description={DISCOVERY_COPY.progress.awaitingConfirmation}
      />

      {results.brandProfile && (
        <div className="rounded-lg border border-neutral-200 bg-surface-card p-4">
          <h3 className="font-semibold text-neutral-900">{DISCOVERY_COPY.sections.brandProfile.title}</h3>
          <p className="mt-1 text-sm text-neutral-500">{results.brandProfile.shortDescription}</p>
          {results.brandProfile.industry && (
            <p className="mt-1 text-xs text-neutral-400">Industry: {results.brandProfile.industry}</p>
          )}
        </div>
      )}

      {SECTIONS.map(({ key, copy }) => {
        const candidates = getCombinedCandidates(key);
        const selected = selections.get(key) || new Set<string>();
        return (
          <DiscoverySection
            key={key}
            title={copy.title}
            description={copy.description}
            emptyMessage={copy.emptyMessage}
            candidates={candidates}
            selectedIds={selected}
            onToggle={(id) => toggleItem(key, id)}
            onSelectAll={() => selectAll(key, candidates)}
            onDeselectAll={() => deselectAll(key)}
            onAddCustom={(name) => addCustomItem(key, name)}
          />
        );
      })}

      {confirmMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {confirmMutation.error instanceof Error ? confirmMutation.error.message : "Failed to confirm"}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button onClick={handleConfirm} disabled={confirmMutation.isPending} size="lg">
          {confirmMutation.isPending ? "Confirming..." : DISCOVERY_COPY.buttons.confirm}
        </Button>
      </div>
    </div>
  );
}
