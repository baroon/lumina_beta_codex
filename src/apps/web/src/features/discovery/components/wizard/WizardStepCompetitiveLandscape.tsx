import { DiscoverySection } from "../DiscoverySection";
import { DISCOVERY_COPY } from "@/content/discovery";
import type { CandidateDto } from "@/types/api";

interface SectionData {
  candidates: CandidateDto[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddCustom: (name: string) => void;
  onRefresh?: () => void;
  refreshesRemaining?: number;
  isRefreshing?: boolean;
}

interface WizardStepCompetitiveLandscapeProps {
  topics: SectionData;
  competitors: SectionData;
  trustSignals: SectionData;
  isLoading?: boolean;
}

export function WizardStepCompetitiveLandscape({
  topics,
  competitors,
  trustSignals,
  isLoading,
}: WizardStepCompetitiveLandscapeProps) {
  return (
    <div className="relative space-y-4">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <p className="text-sm text-neutral-600">{DISCOVERY_COPY.wizard.resuggestingMessage}</p>
          </div>
        </div>
      )}
      <DiscoverySection
        title={DISCOVERY_COPY.sections.topics.title}
        description={DISCOVERY_COPY.sections.topics.description}
        emptyMessage={DISCOVERY_COPY.sections.topics.emptyMessage}
        candidates={topics.candidates}
        selectedIds={topics.selectedIds}
        onToggle={topics.onToggle}
        onSelectAll={topics.onSelectAll}
        onDeselectAll={topics.onDeselectAll}
        onAddCustom={topics.onAddCustom}
        onRefresh={topics.onRefresh}
        refreshesRemaining={topics.refreshesRemaining}
        isRefreshing={topics.isRefreshing}
      />
      <DiscoverySection
        title={DISCOVERY_COPY.sections.competitors.title}
        description={DISCOVERY_COPY.sections.competitors.description}
        emptyMessage={DISCOVERY_COPY.sections.competitors.emptyMessage}
        candidates={competitors.candidates}
        selectedIds={competitors.selectedIds}
        onToggle={competitors.onToggle}
        onSelectAll={competitors.onSelectAll}
        onDeselectAll={competitors.onDeselectAll}
        onAddCustom={competitors.onAddCustom}
        onRefresh={competitors.onRefresh}
        refreshesRemaining={competitors.refreshesRemaining}
        isRefreshing={competitors.isRefreshing}
      />
      <DiscoverySection
        title={DISCOVERY_COPY.sections.trustSignals.title}
        description={DISCOVERY_COPY.sections.trustSignals.description}
        emptyMessage={DISCOVERY_COPY.sections.trustSignals.emptyMessage}
        candidates={trustSignals.candidates}
        selectedIds={trustSignals.selectedIds}
        onToggle={trustSignals.onToggle}
        onSelectAll={trustSignals.onSelectAll}
        onDeselectAll={trustSignals.onDeselectAll}
        onAddCustom={trustSignals.onAddCustom}
        onRefresh={trustSignals.onRefresh}
        refreshesRemaining={trustSignals.refreshesRemaining}
        isRefreshing={trustSignals.isRefreshing}
      />
    </div>
  );
}
