import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Alert, AlertDescription } from "@/components/atoms/alert";
import { Stepper } from "@/components/molecules/Stepper";
import { PageHeader } from "@/components/molecules/PageHeader";
import { Sparkles, Package, Users, Swords, ClipboardCheck } from "lucide-react";
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
  ConfirmCandidateInput,
  ResuggestCandidateDto,
  VisibilityLens,
} from "@/types/api";
import { preselectCandidates, isHighConfidence } from "../confidence";
import { resolveCountryCode } from "../country";

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

const SECTION_STEP_MAP: Record<SectionKey | "brandProfile", number> = {
  brandProfile: 0,
  products: 1,
  audiences: 2,
  markets: 2,
  topics: 3,
  competitors: 3,
  trustSignals: 3,
};

const STEP_ICONS = [Sparkles, Package, Users, Swords, ClipboardCheck];
const WIZARD_STEPS = DISCOVERY_COPY.wizard.steps.map((step, i) => ({
  ...step,
  icon: STEP_ICONS[i],
}));

function toCandidate(dto: ResuggestCandidateDto): CandidateDto {
  return {
    id: `resuggest-${dto.name}-${Math.random().toString(36).slice(2, 8)}`,
    name: dto.name,
    description: dto.description,
    confidence: dto.confidence,
    source: dto.source,
    metadata: dto.metadata,
  };
}

export function DiscoveryConfirmationScreen({ results }: DiscoveryConfirmationScreenProps) {
  const confirmMutation = useConfirmDiscovery(results.brandId);
  const resuggestMutation = useResuggestDiscovery(results.brandId);
  const regenerateLensMutation = useRegenerateLens(results.brandId);

  const [currentStep, setCurrentStep] = useState(0);
  const [returnToStep, setReturnToStep] = useState<number | null>(null);
  const [brandProfileOverrides, setBrandProfileOverrides] = useState<
    Partial<
      Pick<
        BrandProfileDto,
        | "shortDescription"
        | "industry"
        | "category"
        | "positioning"
        | "shortDescriptionSource"
        | "industrySource"
        | "categorySource"
        | "positioningSource"
      >
    >
  >({});

  const FIELD_SOURCE_MAP: Record<string, keyof BrandProfileDto> = {
    shortDescription: "shortDescriptionSource",
    industry: "industrySource",
    category: "categorySource",
    positioning: "positioningSource",
  };

  const handleProfileChange = useCallback((field: string, value: string) => {
    setBrandProfileOverrides((prev) => ({
      ...prev,
      [field]: value,
      [FIELD_SOURCE_MAP[field]]: "UserAdded" as const,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveBrandProfile = useMemo<BrandProfileDto | null>(() => {
    if (!results.brandProfile) return null;
    return {
      ...results.brandProfile,
      ...brandProfileOverrides,
    };
  }, [results.brandProfile, brandProfileOverrides]);

  const [refreshedSections, setRefreshedSections] = useState<
    Partial<Record<SectionKey, CandidateDto[]>>
  >({});
  // Accumulated names already shown/removed/added per lens, so each refresh excludes them.
  const [excludedNames, setExcludedNames] = useState<Map<SectionKey, Set<string>>>(new Map());
  const [lensRefreshCounts, setLensRefreshCounts] = useState<Map<SectionKey, number>>(
    () => new Map(ALL_SECTIONS.map((key) => [key, 0])),
  );
  const [refreshingLens, setRefreshingLens] = useState<SectionKey | null>(null);
  const [hasResuggested, setHasResuggested] = useState(false);

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
  const [removedIds, setRemovedIds] = useState<Map<string, Set<string>>>(new Map());
  const [aliases, setAliases] = useState<string[]>(results.aliases ?? []);

  // Safety net: if the results prop delivers new candidate data after mount
  // (e.g., component mounted with stale cache, then query refetched), re-sync
  // the preselection for sections the user hasn't modified yet.
  const candidateIdKey = useMemo(
    () => ALL_SECTIONS.flatMap((k) => (results[k] as CandidateDto[]).map((c) => c.id)).join(","),
    [results],
  );
  const prevCandidateIdKeyRef = useRef(candidateIdKey);
  useEffect(() => {
    if (candidateIdKey !== prevCandidateIdKeyRef.current) {
      prevCandidateIdKeyRef.current = candidateIdKey;
      setSelections(initialSelections);
    }
  }, [candidateIdKey, initialSelections]);

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
      let resolvedMetadata = metadata ?? {};
      // Markets added by hand carry no country code; infer one from the typed
      // name so the flag can render (best-effort — regions/cities won't match).
      if (sectionKey === "markets" && !resolvedMetadata.countryCode) {
        const code = resolveCountryCode(name);
        if (code) resolvedMetadata = { ...resolvedMetadata, countryCode: code };
      }
      const newItem: CandidateDto = {
        id: `custom-${Date.now()}`,
        name,
        description: null,
        confidence: 1.0,
        source: "UserAdded",
        metadata: resolvedMetadata,
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

  // Hard-dismiss a suggestion so it no longer shows (distinct from unselecting).
  const removeItem = useCallback((sectionKey: string, id: string) => {
    setRemovedIds((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(sectionKey) || []);
      set.add(id);
      next.set(sectionKey, set);
      return next;
    });
    setSelections((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(sectionKey) || []);
      set.delete(id);
      next.set(sectionKey, set);
      return next;
    });
  }, []);

  const handleEditSection = useCallback((sectionKey: SectionKey | "brandProfile") => {
    setReturnToStep(4);
    setCurrentStep(SECTION_STEP_MAP[sectionKey]);
  }, []);

  const getCombinedCandidates = useCallback(
    (key: SectionKey): CandidateDto[] => {
      let original = (results[key] as CandidateDto[]) || [];

      // Use refreshed data when available for any lens
      if (refreshedSections[key]) {
        original = refreshedSections[key];
      }

      const custom = customItems.get(key) || [];
      const combined = [...original, ...custom];
      const removed = removedIds.get(key);
      return removed ? combined.filter((c) => !removed.has(c.id)) : combined;
    },
    [results, customItems, refreshedSections, removedIds],
  );

  const handleConfirm = () => {
    const toInput = (c: CandidateDto): ConfirmCandidateInput => ({
      name: c.name,
      description: c.description,
      confidence: c.confidence,
      source: c.source,
      metadata: c.metadata,
    });

    const selectedInputs = (key: SectionKey): ConfirmCandidateInput[] => {
      const candidates = getCombinedCandidates(key);
      const selected = selections.get(key) || new Set<string>();
      return candidates.filter((c) => selected.has(c.id)).map(toInput);
    };

    confirmMutation.mutate({
      brandProfile: effectiveBrandProfile
        ? {
            shortDescription: effectiveBrandProfile.shortDescription,
            industry: effectiveBrandProfile.industry,
            category: effectiveBrandProfile.category,
            positioning: effectiveBrandProfile.positioning,
            confidence: effectiveBrandProfile.confidence,
            source: effectiveBrandProfile.source,
          }
        : null,
      products: selectedInputs("products"),
      audiences: selectedInputs("audiences"),
      markets: selectedInputs("markets"),
      topics: selectedInputs("topics"),
      competitors: selectedInputs("competitors"),
      trustSignals: selectedInputs("trustSignals"),
      aliases,
    });
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

          setHasResuggested(true);
          setCurrentStep(3);
        },
        onError: () => {
          // Advance even on error — use original data
          setHasResuggested(true);
          setCurrentStep(3);
        },
      },
    );
  };

  const handleRefreshLens = useCallback(
    (lens: SectionKey) => {
      const count = lensRefreshCounts.get(lens) ?? 0;
      if (count >= MAX_LENS_REFRESHES) return;

      // Build the exclusion list: everything the user has already seen for this
      // lens — current suggestions, user-added items, removed items (the raw
      // source lists still hold removed ones), and names from prior refreshes.
      const currentNames = [
        ...(refreshedSections[lens] ?? (results[lens] as CandidateDto[]) ?? []),
        ...(customItems.get(lens) ?? []),
      ].map((c) => c.name);
      const exclude = Array.from(new Set([...(excludedNames.get(lens) ?? []), ...currentNames]));

      setRefreshingLens(lens);
      regenerateLensMutation.mutate(
        {
          lens: lens as VisibilityLens,
          industry: effectiveBrandProfile?.industry ?? null,
          category: effectiveBrandProfile?.category ?? null,
          products: getSelectedNames("products"),
          audiences: getSelectedNames("audiences"),
          markets: getSelectedNames("markets"),
          exclude,
        },
        {
          onSuccess: (data) => {
            const incoming = data.candidates.map(toCandidate);
            const base = refreshedSections[lens] ?? (results[lens] as CandidateDto[]) ?? [];
            const seen = new Set(base.map((c) => c.name.toLowerCase()));
            const appended = incoming.filter((c) => !seen.has(c.name.toLowerCase()));

            // Append the new suggestions to what's already displayed (don't replace).
            // Removed items stay in the raw list and remain hidden via removedIds.
            setRefreshedSections((prev) => ({ ...prev, [lens]: [...base, ...appended] }));

            // Remember what we excluded so subsequent refreshes keep avoiding it.
            setExcludedNames((prev) => {
              const next = new Map(prev);
              next.set(lens, new Set(exclude));
              return next;
            });

            // Keep prior selections; additionally preselect the new high-confidence items.
            setSelections((prev) => {
              const next = new Map(prev);
              const merged = new Set(next.get(lens) ?? []);
              for (const c of appended) {
                if (isHighConfidence(c.confidence)) merged.add(c.id);
              }
              next.set(lens, merged);
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
      refreshedSections,
      results,
      excludedNames,
    ],
  );

  const handleNext = () => {
    if (returnToStep !== null) {
      const target = returnToStep;
      setReturnToStep(null);
      setCurrentStep(target);
      return;
    }
    if (currentStep === 2) {
      if (!hasResuggested) {
        handleResuggest();
      } else {
        setCurrentStep(3);
      }
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
      onRemove: (id: string) => removeItem(key, id),
      onSelectAll: () => selectAll(key, candidates),
      onDeselectAll: () => deselectAll(key),
      onAddCustom: (name: string, metadata?: Record<string, string>) =>
        addCustomItem(key, name, metadata),
      onRefresh: () => handleRefreshLens(key),
      refreshesRemaining: MAX_LENS_REFRESHES - (lensRefreshCounts.get(key) ?? 0),
      isRefreshing: refreshingLens === key,
    };
  };

  const completion = useMemo(() => {
    const hasSelection = (key: SectionKey) => (selections.get(key)?.size ?? 0) > 0;
    const missing: string[] = [];
    if (!hasSelection("markets")) missing.push(DISCOVERY_COPY.completion.missingMarket);
    if (!hasSelection("topics")) missing.push(DISCOVERY_COPY.completion.missingTopic);
    if (!hasSelection("products") && !effectiveBrandProfile?.category?.trim())
      missing.push(DISCOVERY_COPY.completion.missingProduct);
    return { isComplete: missing.length === 0, missing };
  }, [selections, effectiveBrandProfile]);

  const nextLabel =
    returnToStep !== null
      ? DISCOVERY_COPY.review.returnToReview
      : currentStep === 4
        ? DISCOVERY_COPY.wizard.confirmAndFinish
        : DISCOVERY_COPY.wizard.next;

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
        isNextDisabled={confirmMutation.isPending || (currentStep === 4 && !completion.isComplete)}
      >
        {currentStep === 0 && (
          <WizardStepBrandIdentity
            brandProfile={effectiveBrandProfile}
            onProfileChange={handleProfileChange}
            aliases={aliases}
            onAliasesChange={setAliases}
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
            onToggle={toggleItem}
            onEditSection={handleEditSection}
            aliases={aliases}
            onRemoveAlias={(alias) => setAliases((prev) => prev.filter((a) => a !== alias))}
          />
        )}
      </Stepper>

      {currentStep === 4 && !completion.isComplete && (
        <Alert>
          <AlertDescription>
            <p className="font-medium">{DISCOVERY_COPY.completion.title}</p>
            <ul className="mt-1 list-disc pl-5">
              {completion.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

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
