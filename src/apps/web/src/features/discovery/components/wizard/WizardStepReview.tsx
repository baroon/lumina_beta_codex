import { Badge } from "@/components/atoms/badge";
import { DISCOVERY_COPY } from "@/content/discovery";
import type { CandidateDto, BrandProfileDto } from "@/types/api";

type SectionKey = "products" | "audiences" | "markets" | "topics" | "competitors" | "trustSignals";

interface WizardStepReviewProps {
  brandProfile: BrandProfileDto | null;
  sections: Record<SectionKey, { candidates: CandidateDto[]; selectedIds: Set<string> }>;
}

const SECTION_ORDER: { key: SectionKey; label: string }[] = [
  { key: "products", label: DISCOVERY_COPY.sections.products.title },
  { key: "audiences", label: DISCOVERY_COPY.sections.audiences.title },
  { key: "markets", label: DISCOVERY_COPY.sections.markets.title },
  { key: "topics", label: DISCOVERY_COPY.sections.topics.title },
  { key: "competitors", label: DISCOVERY_COPY.sections.competitors.title },
  { key: "trustSignals", label: DISCOVERY_COPY.sections.trustSignals.title },
];

export function WizardStepReview({ brandProfile, sections }: WizardStepReviewProps) {
  return (
    <div className="space-y-4">
      {/* Brand profile summary */}
      {brandProfile && (
        <div className="rounded-lg border border-neutral-200 bg-surface-card p-4">
          <h4 className="text-sm font-semibold text-neutral-900">
            {DISCOVERY_COPY.sections.brandProfile.title}
          </h4>
          <p className="mt-1 text-sm text-neutral-600">
            {brandProfile.shortDescription || brandProfile.industry || "—"}
          </p>
        </div>
      )}

      {/* Section summaries */}
      {SECTION_ORDER.map(({ key, label }) => {
        const { candidates, selectedIds } = sections[key];
        const selected = candidates.filter((c) => selectedIds.has(c.id));

        return (
          <div key={key} className="rounded-lg border border-neutral-200 bg-surface-card p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-neutral-900">{label}</h4>
              <span className="text-xs text-neutral-500">
                {selected.length} / {candidates.length} selected
              </span>
            </div>
            {selected.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.map((c) => (
                  <Badge key={c.id} variant="secondary">
                    {c.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-neutral-400">None selected</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
