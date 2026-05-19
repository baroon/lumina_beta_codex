import { useState, useCallback, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/atoms/alert";
import { Stepper } from "@/components/molecules/Stepper";
import { PageHeader } from "@/components/molecules/PageHeader";
import { DISCOVERY_COPY } from "@/content/discovery";
import { useConfirmDiscovery, useResuggestDiscovery } from "../hooks/useDiscovery";
import {
  WizardStepBrandIdentity,
  WizardStepProducts,
  WizardStepAudiencesMarkets,
  WizardStepCompetitiveLandscape,
  WizardStepReview,
} from "./wizard";
import type { DiscoveryResultsDto, CandidateDto, ResuggestCandidateDto } from "@/types/api";

interface DiscoveryConfirmationScreenProps {
  results: DiscoveryResultsDto;
}

type SectionKey = "products" | "audiences" | "markets" | "topics" | "competitors" | "trustSignals";

const ALL_SECTIONS: SectionKey[] = [
  "products",
  "audiences",
  "markets",
  "topics",
  "competitors",
  "trustSignals",
];

const WIZARD_STEPS = DISCOVERY_COPY.wizard.steps;

function toCandidate(dto: ResuggestCandidateDto): CandidateDto {
  return {
    id: `resuggest-${dto.name}-${Math.random().toString(36).slice(2, 8)}`,
    name: dto.name,
    description: dto.description,
    confidence: dto.confidence,
    source: dto.source,
    status: "Suggested",
    metadata: dto.metadata,
  };
}

export function DiscoveryConfirmationScreen({ results }: DiscoveryConfirmationScreenProps) {
  const confirmMutation = useConfirmDiscovery(results.brandId);
  const resuggestMutation = useResuggestDiscovery(results.brandId);

  const [currentStep, setCurrentStep] = useState(0);
  const [refreshedSections, setRefreshedSections] = useState<{
    topics?: CandidateDto[];
    competitors?: CandidateDto[];
  } | null>(null);

  // Initialize selections: preselect high-confidence items
  const initialSelections = useMemo(() => {
    const selections = new Map<string, Set<string>>();
    for (const key of ALL_SECTIONS) {
      const candidates = results[key] as CandidateDto[];
      const preselected = new Set(candidates.filter((c) => c.confidence >= 0.5).map((c) => c.id));
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

  const getCombinedCandidates = useCallback(
    (key: SectionKey): CandidateDto[] => {
      let original = (results[key] as CandidateDto[]) || [];

      // Use refreshed data for topics and competitors when available
      if (key === "topics" && refreshedSections?.topics) {
        original = refreshedSections.topics;
      } else if (key === "competitors" && refreshedSections?.competitors) {
        original = refreshedSections.competitors;
      }

      const custom = customItems.get(key) || [];
      return [...original, ...custom];
    },
    [results, customItems, refreshedSections],
  );

  const handleConfirm = () => {
    const confirmedIds: string[] = [];
    const dismissedIds: string[] = [];

    if (results.brandProfile) {
      confirmedIds.push(results.brandProfile.id);
    }

    for (const key of ALL_SECTIONS) {
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

  const getSelectedNames = (key: SectionKey): string[] => {
    const candidates = getCombinedCandidates(key);
    const selected = selections.get(key) || new Set<string>();
    return candidates.filter((c) => selected.has(c.id)).map((c) => c.name);
  };

  const handleResuggest = () => {
    resuggestMutation.mutate(
      {
        industry: results.brandProfile?.industry ?? null,
        category: results.brandProfile?.category ?? null,
        products: getSelectedNames("products"),
        audiences: getSelectedNames("audiences"),
        markets: getSelectedNames("markets"),
      },
      {
        onSuccess: (data) => {
          const newTopics = data.topics.map(toCandidate);
          const newCompetitors = data.competitors.map(toCandidate);

          setRefreshedSections({ topics: newTopics, competitors: newCompetitors });

          // Pre-select refreshed items with confidence >= 0.5
          setSelections((prev) => {
            const next = new Map(prev);
            const topicCustom = customItems.get("topics") || [];
            const compCustom = customItems.get("competitors") || [];

            next.set(
              "topics",
              new Set([
                ...newTopics.filter((t) => t.confidence >= 0.5).map((t) => t.id),
                ...topicCustom.map((c) => c.id),
              ]),
            );
            next.set(
              "competitors",
              new Set([
                ...newCompetitors.filter((c) => c.confidence >= 0.5).map((c) => c.id),
                ...compCustom.map((c) => c.id),
              ]),
            );
            return next;
          });

          setCurrentStep(3);
        },
        onError: () => {
          // Advance even on error — use original data
          setCurrentStep(3);
        },
      },
    );
  };

  const handleNext = () => {
    if (currentStep === 2) {
      // Step 3 -> Step 4: trigger resuggest
      handleResuggest();
      return;
    }
    if (currentStep === 4) {
      handleConfirm();
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const makeSectionProps = (key: SectionKey) => {
    const candidates = getCombinedCandidates(key);
    const selectedIds = selections.get(key) || new Set<string>();
    return {
      candidates,
      selectedIds,
      onToggle: (id: string) => toggleItem(key, id),
      onSelectAll: () => selectAll(key, candidates),
      onDeselectAll: () => deselectAll(key),
      onAddCustom: (name: string) => addCustomItem(key, name),
    };
  };

  const nextLabel =
    currentStep === 4 ? DISCOVERY_COPY.wizard.confirmAndFinish : DISCOVERY_COPY.wizard.next;

  const isNextLoading =
    (currentStep === 2 && resuggestMutation.isPending) ||
    (currentStep === 4 && confirmMutation.isPending);

  return (
    <div className="space-y-6">
      <PageHeader
        title={DISCOVERY_COPY.confirmation.title.replace("{brandName}", results.brandName)}
        description={DISCOVERY_COPY.progress.awaitingConfirmation}
      />

      <Stepper
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onNext={handleNext}
        onBack={handleBack}
        nextLabel={nextLabel}
        backLabel={DISCOVERY_COPY.wizard.back}
        isNextLoading={isNextLoading}
        isNextDisabled={confirmMutation.isPending}
      >
        {currentStep === 0 && <WizardStepBrandIdentity brandProfile={results.brandProfile} />}

        {currentStep === 1 && <WizardStepProducts {...makeSectionProps("products")} />}

        {currentStep === 2 && (
          <WizardStepAudiencesMarkets
            audiences={makeSectionProps("audiences")}
            markets={makeSectionProps("markets")}
          />
        )}

        {currentStep === 3 && (
          <WizardStepCompetitiveLandscape
            topics={makeSectionProps("topics")}
            competitors={makeSectionProps("competitors")}
            trustSignals={makeSectionProps("trustSignals")}
            isLoading={resuggestMutation.isPending}
          />
        )}

        {currentStep === 4 && (
          <WizardStepReview
            brandProfile={results.brandProfile}
            sections={{
              products: {
                candidates: getCombinedCandidates("products"),
                selectedIds: selections.get("products") || new Set(),
              },
              audiences: {
                candidates: getCombinedCandidates("audiences"),
                selectedIds: selections.get("audiences") || new Set(),
              },
              markets: {
                candidates: getCombinedCandidates("markets"),
                selectedIds: selections.get("markets") || new Set(),
              },
              topics: {
                candidates: getCombinedCandidates("topics"),
                selectedIds: selections.get("topics") || new Set(),
              },
              competitors: {
                candidates: getCombinedCandidates("competitors"),
                selectedIds: selections.get("competitors") || new Set(),
              },
              trustSignals: {
                candidates: getCombinedCandidates("trustSignals"),
                selectedIds: selections.get("trustSignals") || new Set(),
              },
            }}
          />
        )}
      </Stepper>

      {confirmMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {confirmMutation.error instanceof Error
              ? confirmMutation.error.message
              : DISCOVERY_COPY.errors.confirmFailed}
          </AlertDescription>
        </Alert>
      )}

      {resuggestMutation.isError && currentStep === 3 && (
        <Alert variant="destructive">
          <AlertDescription>Re-suggestion failed. Showing original suggestions.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
