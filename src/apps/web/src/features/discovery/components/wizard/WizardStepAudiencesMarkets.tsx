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
        title={DISCOVERY_COPY.sections.audiences.title}
        description={DISCOVERY_COPY.sections.audiences.description}
        emptyMessage={DISCOVERY_COPY.sections.audiences.emptyMessage}
        candidates={audiences.candidates}
        selectedIds={audiences.selectedIds}
        onToggle={audiences.onToggle}
        onSelectAll={audiences.onSelectAll}
        onDeselectAll={audiences.onDeselectAll}
        onAddCustom={audiences.onAddCustom}
      />
      <DiscoverySection
        title={DISCOVERY_COPY.sections.markets.title}
        description={DISCOVERY_COPY.sections.markets.description}
        emptyMessage={DISCOVERY_COPY.sections.markets.emptyMessage}
        candidates={markets.candidates}
        selectedIds={markets.selectedIds}
        onToggle={markets.onToggle}
        onSelectAll={markets.onSelectAll}
        onDeselectAll={markets.onDeselectAll}
        onAddCustom={markets.onAddCustom}
      />
    </div>
  );
}
