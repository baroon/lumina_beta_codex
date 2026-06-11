import { useEffect, useMemo, useState } from "react";
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
  X,
} from "lucide-react";
import { ApiError } from "@/api/apiClient";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { Input } from "@/components/atoms/input";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { PageHeader } from "@/components/molecules/PageHeader";
import { SectionHeader } from "@/components/molecules/SectionHeader";
import { BRANDS_COPY } from "@/content/brands";
import { DISCOVERY_COPY } from "@/content/discovery";
import {
  useBrand,
  useBrandDiscoveryResults,
  useUpdateBrandAliases,
} from "@/features/brands/hooks/useBrands";
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

          <AliasesSection brandId={brandId} brandName={brand.name} aliases={discovery.aliases} />

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

interface AliasesSectionProps {
  brandId: string;
  brandName: string;
  aliases: readonly string[];
}

/**
 * Editable alias chip list. Inline edits (X to remove a chip, input
 * to add) are staged locally and committed via
 * <c>useUpdateBrandAliases</c>. Save is dirty-gated; client-side
 * validation rejects empty entries, case-insensitive duplicates of
 * an existing alias, and any alias that collides with the brand's
 * primary name (mirrors the BE handler's invariant so the user
 * gets immediate feedback instead of a server round-trip).
 */
function AliasesSection({ brandId, brandName, aliases }: AliasesSectionProps) {
  const copy = BRANDS_COPY.profile;
  const update = useUpdateBrandAliases(brandId);
  const [draft, setDraft] = useState<string[]>(() => [...aliases]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sync the local draft when the server data changes (initial load
  // or post-save invalidation). Without this the chip list would
  // freeze at whatever the first render saw.
  useEffect(() => {
    setDraft([...aliases]);
    setInput("");
    setError(null);
  }, [aliases]);

  const dirty = useMemo(() => {
    if (draft.length !== aliases.length) return true;
    for (let i = 0; i < draft.length; i++) {
      if (draft[i] !== aliases[i]) return true;
    }
    return false;
  }, [draft, aliases]);

  function remove(alias: string) {
    setDraft((prev) => prev.filter((a) => a !== alias));
    setError(null);
  }

  function add() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === brandName.toLowerCase()) {
      setError(`"${trimmed}" matches the brand name. Pick a different alias.`);
      return;
    }
    if (draft.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" is already in the list.`);
      return;
    }
    setDraft((prev) => [...prev, trimmed]);
    setInput("");
    setError(null);
  }

  function handleInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  function discard() {
    setDraft([...aliases]);
    setInput("");
    setError(null);
  }

  function save() {
    setError(null);
    update.mutate({ aliases: draft });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <SectionHeader icon={SECTION_ICON.brandProfile} title={copy.sections.aliases} />

        {draft.length === 0 ? (
          <p className="text-xs text-neutral-500">{copy.empty.noAliases}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5" role="list">
            {draft.map((alias) => (
              <li key={alias}>
                <Badge variant="secondary" className="inline-flex items-center gap-1 pr-1 text-xs">
                  <span>{alias}</span>
                  <button
                    type="button"
                    onClick={() => remove(alias)}
                    aria-label={`Remove alias ${alias}`}
                    className="rounded-sm p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            inputSize="sm"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={handleInputKey}
            placeholder="Add an alias (also-known-as)…"
            aria-label="Add an alias"
            className="max-w-xs"
          />
          <Button variant="outline" size="sm" onClick={add} disabled={input.trim() === ""}>
            Add
          </Button>
        </div>

        {error && <p className="text-xs text-semantic-error-600">{error}</p>}

        <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
          <span className="text-[11px] text-neutral-500">
            {update.isError ? (
              <span className="text-semantic-error-600">Save failed — try again.</span>
            ) : update.isSuccess && !dirty ? (
              <span className="text-semantic-success-600">Saved.</span>
            ) : (
              `${draft.length} alias${draft.length === 1 ? "" : "es"}`
            )}
          </span>
          <div className="flex items-center gap-2">
            {dirty && (
              <Button variant="outline" size="sm" onClick={discard} disabled={update.isPending}>
                Discard
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={!dirty || update.isPending}>
              {update.isPending ? "Saving…" : "Save aliases"}
            </Button>
          </div>
        </div>
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
