import { DiscoverySection } from "../DiscoverySection";
import { DISCOVERY_COPY } from "@/content/discovery";
import { SECTION_ICONS } from "../../sectionIcons";
import type { CandidateDto } from "@/types/api";

interface SectionData {
  candidates: CandidateDto[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddCustom: (name: string) => void;
  onRefresh?: () => void;
  refreshesRemaining?: number;
  isRefreshing?: boolean;
}

interface WizardStepAudiencesMarketsProps {
  audiences: SectionData;
  markets: SectionData;
}

export function WizardStepAudiencesMarkets({
  audiences,
  markets,
}: WizardStepAudiencesMarketsProps) {
  return (
    <div className="space-y-4">
      <DiscoverySection
        icon={SECTION_ICONS.audiences}
        title={DISCOVERY_COPY.sections.audiences.title}
        description={DISCOVERY_COPY.sections.audiences.description}
        emptyMessage={DISCOVERY_COPY.sections.audiences.emptyMessage}
        candidates={audiences.candidates}
        selectedIds={audiences.selectedIds}
        onToggle={audiences.onToggle}
        onRemove={audiences.onRemove}
        onSelectAll={audiences.onSelectAll}
        onDeselectAll={audiences.onDeselectAll}
        onAddCustom={audiences.onAddCustom}
        onRefresh={audiences.onRefresh}
        refreshesRemaining={audiences.refreshesRemaining}
        isRefreshing={audiences.isRefreshing}
      />
      <DiscoverySection
        icon={SECTION_ICONS.markets}
        title={DISCOVERY_COPY.sections.markets.title}
        description={DISCOVERY_COPY.sections.markets.description}
        emptyMessage={DISCOVERY_COPY.sections.markets.emptyMessage}
        candidates={markets.candidates}
        selectedIds={markets.selectedIds}
        onToggle={markets.onToggle}
        onRemove={markets.onRemove}
        onSelectAll={markets.onSelectAll}
        onDeselectAll={markets.onDeselectAll}
        onAddCustom={markets.onAddCustom}
        onRefresh={markets.onRefresh}
        refreshesRemaining={markets.refreshesRemaining}
        isRefreshing={markets.isRefreshing}
      />
    </div>
  );
}
