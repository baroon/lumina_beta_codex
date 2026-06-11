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
  useAddBrandTopic,
  useBrand,
  useBrandDiscoveryResults,
  useRemoveBrandTopic,
  useUpdateBrandAliases,
  useUpdateBrandProfile,
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
            brandId={brandId}
            websiteUrl={brand.websiteUrl}
            shortDescription={profile?.shortDescription ?? null}
            industry={profile?.industry ?? null}
            category={profile?.category ?? null}
            positioning={profile?.positioning ?? null}
            hasProfile={!!profile}
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
          <TopicsSection brandId={brandId} topics={discovery.topics} />
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
  brandId: string;
  websiteUrl: string;
  shortDescription: string | null;
  industry: string | null;
  category: string | null;
  positioning: string | null;
  /**
   * True when a BrandProfile row exists for this brand. When false (a
   * fresh brand whose discovery hasn't completed) the section shows
   * read-only "—" placeholders rather than editable inputs, since the
   * BE rejects the PUT until a row exists.
   */
  hasProfile: boolean;
}

/**
 * Editable identity section. Same dirty-gated Save / Discard model as
 * the alias picker — three single-line inputs (industry, category,
 * positioning) and one textarea (description). Empty / whitespace-only
 * input persists as null on the BE so we round-trip the same emptiness
 * the FE renders as "Not set".
 */
function ProfileIdentitySection({
  brandId,
  websiteUrl,
  shortDescription,
  industry,
  category,
  positioning,
  hasProfile,
}: ProfileIdentitySectionProps) {
  const copy = BRANDS_COPY.profile;
  const update = useUpdateBrandProfile(brandId);

  const [draftDescription, setDraftDescription] = useState(shortDescription ?? "");
  const [draftIndustry, setDraftIndustry] = useState(industry ?? "");
  const [draftCategory, setDraftCategory] = useState(category ?? "");
  const [draftPositioning, setDraftPositioning] = useState(positioning ?? "");

  // Sync the local drafts whenever the server values change (initial
  // load or post-save invalidation).
  useEffect(() => {
    setDraftDescription(shortDescription ?? "");
    setDraftIndustry(industry ?? "");
    setDraftCategory(category ?? "");
    setDraftPositioning(positioning ?? "");
  }, [shortDescription, industry, category, positioning]);

  const dirty = useMemo(() => {
    return (
      draftDescription.trim() !== (shortDescription ?? "") ||
      draftIndustry.trim() !== (industry ?? "") ||
      draftCategory.trim() !== (category ?? "") ||
      draftPositioning.trim() !== (positioning ?? "")
    );
  }, [
    draftDescription,
    draftIndustry,
    draftCategory,
    draftPositioning,
    shortDescription,
    industry,
    category,
    positioning,
  ]);

  function save() {
    update.mutate({
      shortDescription: draftDescription.trim() || null,
      industry: draftIndustry.trim() || null,
      category: draftCategory.trim() || null,
      positioning: draftPositioning.trim() || null,
    });
  }

  function discard() {
    setDraftDescription(shortDescription ?? "");
    setDraftIndustry(industry ?? "");
    setDraftCategory(category ?? "");
    setDraftPositioning(positioning ?? "");
  }

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
          <Field label={copy.fields.industry}>
            {hasProfile ? (
              <Input
                inputSize="sm"
                value={draftIndustry}
                onChange={(e) => setDraftIndustry(e.target.value)}
                placeholder={copy.empty.notSet}
                aria-label={copy.fields.industry}
              />
            ) : (
              <span>{industry || copy.empty.notSet}</span>
            )}
          </Field>
          <Field label={copy.fields.category}>
            {hasProfile ? (
              <Input
                inputSize="sm"
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                placeholder={copy.empty.notSet}
                aria-label={copy.fields.category}
              />
            ) : (
              <span>{category || copy.empty.notSet}</span>
            )}
          </Field>
          <Field label={copy.fields.positioning}>
            {hasProfile ? (
              <Input
                inputSize="sm"
                value={draftPositioning}
                onChange={(e) => setDraftPositioning(e.target.value)}
                placeholder={copy.empty.notSet}
                aria-label={copy.fields.positioning}
              />
            ) : (
              <span>{positioning || copy.empty.notSet}</span>
            )}
          </Field>
          <div className="sm:col-span-2">
            <Field label={copy.fields.description}>
              {hasProfile ? (
                <textarea
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  rows={3}
                  placeholder={copy.empty.notSet}
                  aria-label={copy.fields.description}
                  className="w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                />
              ) : (
                <span>{shortDescription || copy.empty.notSet}</span>
              )}
            </Field>
          </div>
        </div>

        {hasProfile && (
          <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
            <span className="text-[11px] text-neutral-500">
              {update.isError ? (
                <span className="text-semantic-error-600">Save failed — try again.</span>
              ) : update.isSuccess && !dirty ? (
                <span className="text-semantic-success-600">Saved.</span>
              ) : dirty ? (
                "Unsaved changes."
              ) : (
                "Identity fields are kept in sync across reports."
              )}
            </span>
            <div className="flex items-center gap-2">
              {dirty && (
                <Button variant="outline" size="sm" onClick={discard} disabled={update.isPending}>
                  Discard
                </Button>
              )}
              <Button size="sm" onClick={save} disabled={!dirty || update.isPending}>
                {update.isPending ? "Saving…" : "Save identity"}
              </Button>
            </div>
          </div>
        )}
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
            Add alias
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

interface TopicsSectionProps {
  brandId: string;
  topics: readonly CandidateDto[];
}

/**
 * Editable topic chip list. Each chip carries an X to remove the
 * topic immediately; the bottom row has an input + Add button to
 * stage a new topic. Unlike aliases/identity (which batch into one
 * Save), topic add and remove are individual mutations — there's no
 * "dirty" state to gate, so each click hits the BE directly.
 *
 * Mutation pending states disable the relevant buttons; cache
 * invalidation refreshes the chip list. Inline error surfaces server
 * messages (e.g. case-insensitive duplicate) and client-side
 * validation (empty, duplicate in current list).
 */
function TopicsSection({ brandId, topics }: TopicsSectionProps) {
  const copy = BRANDS_COPY.profile;
  const add = useAddBrandTopic(brandId);
  const remove = useRemoveBrandTopic(brandId);
  const [input, setInput] = useState("");
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (topics.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setClientError(`"${trimmed}" is already in the list.`);
      return;
    }
    setClientError(null);
    add.mutate(
      { name: trimmed },
      {
        onSuccess: () => setInput(""),
      },
    );
  }

  function handleInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  function handleRemove(topicId: string) {
    setPendingRemoveId(topicId);
    remove.mutate(topicId, {
      onSettled: () => setPendingRemoveId(null),
    });
  }

  const serverError = add.isError || remove.isError;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <SectionHeader
          icon={SECTION_ICON.topics}
          title={DISCOVERY_COPY.sections.topics.title}
          meta={
            <span className="text-xs text-neutral-500" aria-label={`${topics.length} items`}>
              {topics.length}
            </span>
          }
        />

        {topics.length === 0 ? (
          <p className="text-xs text-neutral-500">{copy.empty.noItems}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5" role="list">
            {topics.map((topic) => (
              <li key={topic.id}>
                <Badge variant="secondary" className="inline-flex items-center gap-1 pr-1 text-xs">
                  <span>{topic.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(topic.id)}
                    disabled={pendingRemoveId === topic.id}
                    aria-label={`Remove topic ${topic.name}`}
                    className="rounded-sm p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 disabled:opacity-50"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
          <Input
            inputSize="sm"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (clientError) setClientError(null);
            }}
            onKeyDown={handleInputKey}
            placeholder="Add a topic…"
            aria-label="Add a topic"
            className="max-w-xs"
            disabled={add.isPending}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={input.trim() === "" || add.isPending}
          >
            {add.isPending ? "Adding…" : "Add topic"}
          </Button>
          {clientError && <span className="text-xs text-semantic-error-600">{clientError}</span>}
          {!clientError && serverError && (
            <span className="text-xs text-semantic-error-600">
              {add.isError ? "Add failed — try again." : "Remove failed — try again."}
            </span>
          )}
        </div>
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
