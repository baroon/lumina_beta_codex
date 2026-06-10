import { Link } from "@tanstack/react-router";
import {
  ExternalLink,
  Globe,
  type LucideIcon,
  MessageSquare,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";
import { ApiError } from "@/api/apiClient";
import { Badge } from "@/components/atoms/badge";
import { Card, CardContent } from "@/components/atoms/card";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SectionHeader } from "@/components/molecules/SectionHeader";
import { BRANDS_COPY } from "@/content/brands";
import { DISCOVERY_COPY } from "@/content/discovery";
import { useBrand, useBrandDiscoveryResults } from "@/features/brands/hooks/useBrands";
import type { CandidateDto } from "@/types/api";

// Section icons inlined here (rather than imported from
// `@/features/discovery/sectionIcons`) because the cross-feature lint
// rule bans `brands` from importing `discovery`. Mirror the discovery
// feature's SECTION_ICON — keep in sync if either changes.
const SECTION_ICON: Record<string, LucideIcon> = {
  brandProfile: Sparkles,
  products: Package,
  audiences: Users,
  markets: Globe,
  topics: MessageSquare,
  competitors: Swords,
  trustSignals: ShieldCheck,
};

interface BrandProfileScreenProps {
  brandId: string;
}

/**
 * Read-only brand profile view. Renders identity fields, aliases, and
 * each dimension's confirmed items. Edits route through the existing
 * discovery wizard (Re-run discovery CTA) until proper PATCH endpoints
 * land — this screen ships as the canonical landing page for a brand,
 * removing the awkward "brand row → discovery wizard" jump.
 */
export function BrandProfileScreen({ brandId }: BrandProfileScreenProps) {
  const brandQuery = useBrand(brandId);
  const discoveryQuery = useBrandDiscoveryResults(brandId);

  if (brandQuery.isLoading) return <LoadingPage />;

  if (brandQuery.isError) {
    if (brandQuery.error instanceof ApiError && brandQuery.error.status === 404) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-sm text-neutral-600">
            Brand not found.
          </CardContent>
        </Card>
      );
    }
    return (
      <ErrorPage
        error={brandQuery.error instanceof Error ? brandQuery.error : undefined}
        onReset={() => void brandQuery.refetch()}
      />
    );
  }

  if (!brandQuery.data) return null;

  const brand = brandQuery.data;
  const discovery = discoveryQuery.data;
  const profile = discovery?.brandProfile;
  const copy = BRANDS_COPY.profile;

  return (
    <div className="space-y-6">
      <PageHeader title={brand.name} description={copy.description}>
        <Link
          to="/brands/$brandId/discovery"
          params={{ brandId }}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          {copy.rerunDiscovery}
        </Link>
      </PageHeader>

      {!discovery && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-neutral-600">
            {copy.empty.noDiscovery}
          </CardContent>
        </Card>
      )}

      {discovery && (
        <>
          <p className="text-xs text-neutral-500">{copy.editNotice}</p>

          <ProfileIdentitySection
            brandName={brand.name}
            websiteUrl={brand.websiteUrl}
            shortDescription={profile?.shortDescription ?? null}
            industry={profile?.industry ?? null}
            category={profile?.category ?? null}
            positioning={profile?.positioning ?? null}
          />

          <AliasesSection aliases={discovery.aliases} />

          <DimensionSection
            title={DISCOVERY_COPY.sections.products.title}
            icon={SECTION_ICON.products}
            items={discovery.products}
          />
          <DimensionSection
            title={DISCOVERY_COPY.sections.audiences.title}
            icon={SECTION_ICON.audiences}
            items={discovery.audiences}
          />
          <DimensionSection
            title={DISCOVERY_COPY.sections.markets.title}
            icon={SECTION_ICON.markets}
            items={discovery.markets}
          />
          <DimensionSection
            title={DISCOVERY_COPY.sections.topics.title}
            icon={SECTION_ICON.topics}
            items={discovery.topics}
          />
          <DimensionSection
            title={DISCOVERY_COPY.sections.competitors.title}
            icon={SECTION_ICON.competitors}
            items={discovery.competitors}
          />
          <DimensionSection
            title={DISCOVERY_COPY.sections.trustSignals.title}
            icon={SECTION_ICON.trustSignals}
            items={discovery.trustSignals}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section subcomponents
// ---------------------------------------------------------------------------

interface ProfileIdentitySectionProps {
  brandName: string;
  websiteUrl: string;
  shortDescription: string | null;
  industry: string | null;
  category: string | null;
  positioning: string | null;
}

function ProfileIdentitySection({
  websiteUrl,
  shortDescription,
  industry,
  category,
  positioning,
}: ProfileIdentitySectionProps) {
  const copy = BRANDS_COPY.profile;
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <SectionHeader icon={SECTION_ICON.brandProfile} title={copy.sections.identity} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={copy.fields.websiteUrl}>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-primary-600 hover:underline"
            >
              {websiteUrl}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </Field>
          <Field label={copy.fields.industry}>{industry || copy.empty.notSet}</Field>
          <Field label={copy.fields.category}>{category || copy.empty.notSet}</Field>
          <Field label={copy.fields.positioning}>{positioning || copy.empty.notSet}</Field>
          <div className="sm:col-span-2">
            <Field label={copy.fields.description}>{shortDescription || copy.empty.notSet}</Field>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AliasesSection({ aliases }: { aliases: readonly string[] }) {
  const copy = BRANDS_COPY.profile;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <SectionHeader icon={SECTION_ICON.brandProfile} title={copy.sections.aliases} />
        {aliases.length === 0 ? (
          <p className="text-xs text-neutral-500">{copy.empty.noAliases}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5" role="list">
            {aliases.map((alias) => (
              <li key={alias}>
                <Badge variant="secondary" className="text-xs">
                  {alias}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface DimensionSectionProps {
  title: string;
  icon: (typeof SECTION_ICON)[keyof typeof SECTION_ICON];
  items: readonly CandidateDto[];
}

function DimensionSection({ title, icon, items }: DimensionSectionProps) {
  const copy = BRANDS_COPY.profile;
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <SectionHeader
          icon={icon}
          title={title}
          meta={
            <span className="text-xs text-neutral-500" aria-label={`${items.length} items`}>
              {items.length}
            </span>
          }
        />
        {items.length === 0 ? (
          <p className="text-xs text-neutral-500">{copy.empty.noItems}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5" role="list">
            {items.map((item) => (
              <li key={item.id}>
                <Badge variant="secondary" className="text-xs">
                  {item.name}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="text-sm text-neutral-900">{children}</div>
    </div>
  );
}
