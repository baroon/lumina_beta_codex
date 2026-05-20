import { DiscoverySection } from "../DiscoverySection";
import { DISCOVERY_COPY } from "@/content/discovery";
import type { CandidateDto } from "@/types/api";

interface WizardStepProductsProps {
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

export function WizardStepProducts({
  candidates,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onAddCustom,
  onRefresh,
  refreshesRemaining,
  isRefreshing,
}: WizardStepProductsProps) {
  return (
    <DiscoverySection
      title={DISCOVERY_COPY.sections.products.title}
      description={DISCOVERY_COPY.sections.products.description}
      emptyMessage={DISCOVERY_COPY.sections.products.emptyMessage}
      candidates={candidates}
      selectedIds={selectedIds}
      onToggle={onToggle}
      onSelectAll={onSelectAll}
      onDeselectAll={onDeselectAll}
      onAddCustom={onAddCustom}
      onRefresh={onRefresh}
      refreshesRemaining={refreshesRemaining}
      isRefreshing={isRefreshing}
    />
  );
}
