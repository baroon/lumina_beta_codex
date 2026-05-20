import { useState, useCallback, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/atoms/alert";
import { Stepper } from "@/components/molecules/Stepper";
import { PageHeader } from "@/components/molecules/PageHeader";
import { DISCOVERY_COPY } from "@/content/discovery";
import {
  useConfirmDiscovery,
  useResuggestDiscovery,
  useRegenerateLens,
} from "../hooks/useDiscovery";
import {
  WizardStepBrandIdentity,
  WizardStepProducts,
  WizardStepAudiencesMarkets,
  WizardStepCompetitiveLandscape,
  WizardStepReview,
} from "./wizard";
import type {
  DiscoveryResultsDto,
  BrandProfileDto,
  CandidateDto,
  ResuggestCandidateDto,
  VisibilityLens,
} from "@/types/api";
import { preselectCandidates, isHighConfidence } from "../confidence";

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

const MAX_LENS_REFRESHES = 3;

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
  const regenerateLensMutation = useRegenerateLens(results.brandId);

  const [currentStep, setCurrentStep] = useState(0);
  const [brandProfileOverrides, setBrandProfileOverrides] = useState<
    Partial<Pick<BrandProfileDto, "industry" | "category" | "positioning">>
  >({});

  const handleProfileChange = useCallback((field: string, value: string) => {
    setBrandProfileOverrides((prev) => ({ ...prev, [field]: value }));
  }, []);

  const effectiveBrandProfile = useMemo<BrandProfileDto | null>(() => {
    if (!results.brandProfile) return null;
    return { ...results.brandProfile, ...brandProfileOverrides };
  }, [results.brandProfile, brandProfileOverrides]);

  const [refreshedSections, setRefreshedSections] = useState<
    Partial<Record<SectionKey, CandidateDto[]>>
  >({});
  const [lensRefreshCounts, setLensRefreshCounts] = useState<Map<SectionKey, number>>(
    () => new Map(ALL_SECTIONS.map((key) => [key, 0])),
  );
  const [refreshingLens, setRefreshingLens] = useState<SectionKey | null>(null);

  // Initialize selections: preselect high-confidence items
  const initialSelections = useMemo(() => {
    const selections = new Map<string, Set<string>>();
    for (const key of ALL_SECTIONS) {
      const candidates = results[key] as CandidateDto[];
      selections.set(key, preselectCandidates(candidates));
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

  const addCustomItem = useCallback(
    (sectionKey: string, name: string, metadata?: Record<string, string>) => {
      const newItem: CandidateDto = {
        id: `custom-${Date.now()}`,
        name,
        description: null,
        confidence: 1.0,
        source: "UserAdded",
        status: "Suggested",
        metadata: metadata ?? {},
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
    },
    [],
  );

  const getCombinedCandidates = useCallback(
    (key: SectionKey): CandidateDto[] => {
      let original = (results[key] as CandidateDto[]) || [];

      // Use refreshed data when available for any lens
      if (refreshedSections[key]) {
        original = refreshedSections[key];
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

  const getSelectedNames = useCallback(
    (key: SectionKey): string[] => {
      const candidates = getCombinedCandidates(key);
      const selected = selections.get(key) || new Set<string>();
      return candidates.filter((c) => selected.has(c.id)).map((c) => c.name);
    },
    [getCombinedCandidates, selections],
  );

  const handleResuggest = () => {
    resuggestMutation.mutate(
      {
        industry: effectiveBrandProfile?.industry ?? null,
        category: effectiveBrandProfile?.category ?? null,
        products: getSelectedNames("products"),
        audiences: getSelectedNames("audiences"),
        markets: getSelectedNames("markets"),
      },
      {
        onSuccess: (data) => {
          const newTopics = data.topics.map(toCandidate);
          const newCompetitors = data.competitors.map(toCandidate);

          setRefreshedSections((prev) => ({
            ...prev,
            topics: newTopics,
            competitors: newCompetitors,
          }));

          // Pre-select refreshed items with high confidence
          setSelections((prev) => {
            const next = new Map(prev);
            const topicCustom = customItems.get("topics") || [];
            const compCustom = customItems.get("competitors") || [];

            next.set(
              "topics",
              new Set([
                ...newTopics.filter((t) => isHighConfidence(t.confidence)).map((t) => t.id),
                ...topicCustom.map((c) => c.id),
              ]),
            );
            next.set(
              "competitors",
              new Set([
                ...newCompetitors.filter((c) => isHighConfidence(c.confidence)).map((c) => c.id),
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

  const handleRefreshLens = useCallback(
    (lens: SectionKey) => {
      const count = lensRefreshCounts.get(lens) ?? 0;
      if (count >= MAX_LENS_REFRESHES) return;

      setRefreshingLens(lens);
      regenerateLensMutation.mutate(
        {
          lens: lens as VisibilityLens,
          industry: effectiveBrandProfile?.industry ?? null,
          category: effectiveBrandProfile?.category ?? null,
          products: getSelectedNames("products"),
          audiences: getSelectedNames("audiences"),
          markets: getSelectedNames("markets"),
        },
        {
          onSuccess: (data) => {
            const newCandidates = data.candidates.map(toCandidate);
            setRefreshedSections((prev) => ({ ...prev, [lens]: newCandidates }));

            // Pre-select items with high confidence
            setSelections((prev) => {
              const next = new Map(prev);
              const custom = customItems.get(lens) || [];
              next.set(
                lens,
                new Set([
                  ...newCandidates.filter((c) => isHighConfidence(c.confidence)).map((c) => c.id),
                  ...custom.map((c) => c.id),
                ]),
              );
              return next;
            });

            setLensRefreshCounts((prev) => {
              const next = new Map(prev);
              next.set(lens, (next.get(lens) ?? 0) + 1);
              return next;
            });
            setRefreshingLens(null);
          },
          onError: () => {
            setRefreshingLens(null);
          },
        },
      );
    },
    [
      lensRefreshCounts,
      regenerateLensMutation,
      effectiveBrandProfile,
      getSelectedNames,
      customItems,
    ],
  );

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
      onAddCustom: (name: string, metadata?: Record<string, string>) =>
        addCustomItem(key, name, metadata),
      onRefresh: () => handleRefreshLens(key),
      refreshesRemaining: MAX_LENS_REFRESHES - (lensRefreshCounts.get(key) ?? 0),
      isRefreshing: refreshingLens === key,
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
        {currentStep === 0 && (
          <WizardStepBrandIdentity
            brandProfile={effectiveBrandProfile}
            onProfileChange={handleProfileChange}
          />
        )}

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
            brandProfile={effectiveBrandProfile}
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

      {regenerateLensMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>{DISCOVERY_COPY.errors.regenerateFailed}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
