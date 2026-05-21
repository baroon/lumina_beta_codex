import { Package, Wrench, Puzzle, Lightbulb, Box, BookOpen } from "lucide-react";
import { DiscoverySection } from "../DiscoverySection";
import { DISCOVERY_COPY } from "@/content/discovery";
import type { CandidateDto } from "@/types/api";

const ICON_CLASS = "h-3.5 w-3.5";

const PRODUCT_TYPE_ICONS: Record<string, React.ReactNode> = {
  Product: <Package className={ICON_CLASS} />,
  Service: <Wrench className={ICON_CLASS} />,
  Feature: <Puzzle className={ICON_CLASS} />,
  Solution: <Lightbulb className={ICON_CLASS} />,
  Tool: <Box className={ICON_CLASS} />,
  Resource: <BookOpen className={ICON_CLASS} />,
};

const PRODUCT_TYPE_OPTIONS = Object.entries(DISCOVERY_COPY.productTypes).map(([value, label]) => ({
  value,
  label,
  icon: PRODUCT_TYPE_ICONS[value],
}));

interface WizardStepProductsProps {
  candidates: CandidateDto[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddCustom: (name: string, metadata?: Record<string, string>) => void;
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
      typeOptions={PRODUCT_TYPE_OPTIONS}
      typeMetadataKey="productType"
      typeRequired
    />
  );
}
