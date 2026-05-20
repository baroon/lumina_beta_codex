import { InlineEdit } from "@/components/atoms/inline-edit";
import { ConfidenceTag } from "../ConfidenceTag";
import { DISCOVERY_COPY } from "@/content/discovery";
import type { BrandProfileDto } from "@/types/api";

interface WizardStepBrandIdentityProps {
  brandProfile: BrandProfileDto | null;
  onProfileChange?: (field: string, value: string) => void;
}

export function WizardStepBrandIdentity({
  brandProfile,
  onProfileChange,
}: WizardStepBrandIdentityProps) {
  if (!brandProfile) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-surface-card p-6 text-center text-neutral-500">
        No brand profile detected.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-surface-card p-4">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-neutral-900">
          {DISCOVERY_COPY.sections.brandProfile.title}
        </h3>
        <ConfidenceTag confidence={brandProfile.confidence} />
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        {brandProfile.shortDescription && (
          <div>
            <dt className="text-xs font-medium text-neutral-400">
              {DISCOVERY_COPY.confirmation.descriptionLabel}
            </dt>
            <dd className="text-neutral-700">{brandProfile.shortDescription}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-medium text-neutral-400">
            {DISCOVERY_COPY.confirmation.industryLabel}
          </dt>
          <dd>
            <InlineEdit
              value={brandProfile.industry ?? ""}
              onChange={(v) => onProfileChange?.("industry", v)}
              placeholder="Click to edit"
            />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-neutral-400">
            {DISCOVERY_COPY.confirmation.categoryLabel}
          </dt>
          <dd>
            <InlineEdit
              value={brandProfile.category ?? ""}
              onChange={(v) => onProfileChange?.("category", v)}
              placeholder="Click to edit"
            />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-neutral-400">
            {DISCOVERY_COPY.confirmation.positioningLabel}
          </dt>
          <dd>
            <InlineEdit
              value={brandProfile.positioning ?? ""}
              onChange={(v) => onProfileChange?.("positioning", v)}
              placeholder="Click to edit"
            />
          </dd>
        </div>
      </dl>
    </div>
  );
}
