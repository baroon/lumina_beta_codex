import { ConfidenceTag } from "../ConfidenceTag";
import { DISCOVERY_COPY } from "@/content/discovery";
import type { BrandProfileDto } from "@/types/api";

interface WizardStepBrandIdentityProps {
  brandProfile: BrandProfileDto | null;
}

export function WizardStepBrandIdentity({ brandProfile }: WizardStepBrandIdentityProps) {
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
        {brandProfile.industry && (
          <div>
            <dt className="text-xs font-medium text-neutral-400">
              {DISCOVERY_COPY.confirmation.industryLabel}
            </dt>
            <dd className="text-neutral-700">{brandProfile.industry}</dd>
          </div>
        )}
        {brandProfile.category && (
          <div>
            <dt className="text-xs font-medium text-neutral-400">
              {DISCOVERY_COPY.confirmation.categoryLabel}
            </dt>
            <dd className="text-neutral-700">{brandProfile.category}</dd>
          </div>
        )}
        {brandProfile.positioning && (
          <div>
            <dt className="text-xs font-medium text-neutral-400">
              {DISCOVERY_COPY.confirmation.positioningLabel}
            </dt>
            <dd className="text-neutral-700">{brandProfile.positioning}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
