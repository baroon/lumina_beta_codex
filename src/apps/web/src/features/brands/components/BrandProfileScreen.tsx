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
  Trash2,
  Users,
  X,
} from "lucide-react";
import { ApiError } from "@/api/apiClient";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Card, CardContent } from "@/components/atoms/card";
import { InlineEdit } from "@/components/atoms/inline-edit";
import { Input } from "@/components/atoms/input";
import { ConfirmDeleteDialog } from "@/components/molecules/ConfirmDeleteDialog";
import { EditableChipList } from "@/components/molecules/EditableChipList";
import { ErrorPage } from "@/components/molecules/ErrorPage";
import { LoadingPage } from "@/components/molecules/LoadingPage";
import { SectionHeader } from "@/components/molecules/SectionHeader";
import { BRANDS_COPY } from "@/content/brands";
import { DISCOVERY_COPY } from "@/content/discovery";
import {
  useAddBrandAudience,
  useAddBrandCompetitor,
  useAddBrandMarket,
  useAddBrandProduct,
  useAddBrandTopic,
  useAddBrandTrustSignal,
  useBrand,
  useBrandDiscoveryResults,
  useDeleteBrand,
  useRemoveBrandAudience,
  useRemoveBrandCompetitor,
  useRemoveBrandMarket,
  useRemoveBrandProduct,
  useRemoveBrandTopic,
  useRemoveBrandTrustSignal,
  useRenameBrand,
  useUpdateBrandAliases,
  useUpdateBrandProfile,
  useUpdateBrandWebsiteUrl,
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
 * Canonical landing page for a brand. Every section is editable inline:
 * identity fields, aliases, and every dimension chip list (products,
 * audiences, markets, topics, competitors, trust signals). The "Re-run
 * discovery" CTA remains as the path back into the discovery wizard
 * when the user wants the LLM to repopulate everything; the danger
 * zone at the bottom hard-deletes the brand and its entire subtree.
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
      <BrandNameHeader brandId={brandId} brandName={brand.name} description={copy.description}>
        <Link
          to="/brands/$brandId/discovery"
          params={{ brandId }}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          {copy.rerunDiscovery}
        </Link>
      </BrandNameHeader>

      {!discovery && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-neutral-600">
            {copy.empty.noDiscovery}
          </CardContent>
        </Card>
      )}

      {discovery && (
        <>
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

          <ProductsSection brandId={brandId} products={discovery.products} />
          <AudiencesSection brandId={brandId} audiences={discovery.audiences} />
          <MarketsSection brandId={brandId} markets={discovery.markets} />
          <TopicsSection brandId={brandId} topics={discovery.topics} />
          <CompetitorsSection brandId={brandId} competitors={discovery.competitors} />
          <TrustSignalsSection brandId={brandId} trustSignals={discovery.trustSignals} />

          <BrandDangerZoneSection brandId={brandId} brandName={brand.name} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page header with inline-editable brand name
// ---------------------------------------------------------------------------

function BrandNameHeader({
  brandId,
  brandName,
  description,
  children,
}: {
  brandId: string;
  brandName: string;
  description?: string;
  children?: React.ReactNode;
}) {
  const rename = useRenameBrand(brandId);
  const errorMessage =
    rename.isError && rename.error instanceof Error
      ? rename.error.message
      : rename.isError
        ? "Rename failed — try again."
        : null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            <InlineEdit
              value={brandName}
              onChange={(next) => {
                if (next.trim().length > 0) {
                  rename.mutate({ name: next });
                }
              }}
              placeholder="Brand name"
            />
          </h1>
          {description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}
          {errorMessage && (
            <p className="mt-1 text-xs text-semantic-error-600" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Danger zone — hard delete, type-to-confirm
// ---------------------------------------------------------------------------

function BrandDangerZoneSection({ brandId, brandName }: { brandId: string; brandName: string }) {
  const [open, setOpen] = useState(false);
  const del = useDeleteBrand(brandId);

  return (
    <Card className="border-semantic-error-200">
      <CardContent className="space-y-3 p-4">
        <SectionHeader icon={Trash2} title="Danger zone" />
        <p className="text-xs text-neutral-600">
          Deleting this brand permanently removes every tracker, every scan, every prompt run, every
          recorded answer, and every dimension row associated with it. This cannot be undone.
        </p>
        <div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
            disabled={del.isPending}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Delete brand
          </Button>
        </div>
        <ConfirmDeleteDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete brand"
          description="This permanently deletes the brand, every tracker, every scan, every prompt run, every answer, and every dimension row associated with it."
          expectedConfirmText={brandName}
          confirmLabel="Delete brand"
          onConfirm={() => del.mutate()}
          isDeleting={del.isPending}
        />
      </CardContent>
    </Card>
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
            <WebsiteUrlEditor brandId={brandId} websiteUrl={websiteUrl} />
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

/**
 * Generic editable-dimension card. Wraps a SectionHeader + the shared
 * EditableChipList molecule. Each callsite passes a mutation pair +
 * the dimension-specific labels. The mutation hooks themselves still
 * own React Query cache invalidation (the molecule never touches the
 * cache); this component only adapts pending state + error messaging
 * into the molecule's presentational props.
 */
function DimensionEditCard({
  icon,
  title,
  items,
  addPlaceholder,
  addLabel,
  removeAriaSingular,
  add,
  remove,
}: {
  icon: (typeof SECTION_ICON)[keyof typeof SECTION_ICON];
  title: string;
  items: readonly CandidateDto[];
  addPlaceholder: string;
  addLabel: string;
  removeAriaSingular: string;
  add: {
    mutate: (args: { name: string }) => void;
    isPending: boolean;
    isError: boolean;
  };
  remove: {
    mutate: (id: string) => void;
    isPending: boolean;
    isError: boolean;
  };
}) {
  const copy = BRANDS_COPY.profile;
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const serverError = add.isError
    ? "Add failed — try again."
    : remove.isError
      ? "Remove failed — try again."
      : null;

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
        <EditableChipList
          items={items}
          addPlaceholder={addPlaceholder}
          addLabel={addLabel}
          emptyLabel={copy.empty.noItems}
          removeAriaSingular={removeAriaSingular}
          isAdding={add.isPending}
          pendingRemoveId={pendingRemoveId}
          serverError={serverError}
          onAdd={(name) => add.mutate({ name })}
          onRemove={(id) => {
            setPendingRemoveId(id);
            // Reset pending id on the next tick — the row vanishes
            // when the cache invalidates so a settled callback is
            // unnecessary, and the pending id is only used until the
            // FE state re-renders.
            remove.mutate(id);
            setTimeout(() => setPendingRemoveId(null), 0);
          }}
        />
      </CardContent>
    </Card>
  );
}

function TopicsSection({ brandId, topics }: { brandId: string; topics: readonly CandidateDto[] }) {
  return (
    <DimensionEditCard
      icon={SECTION_ICON.topics}
      title={DISCOVERY_COPY.sections.topics.title}
      items={topics}
      addPlaceholder="Add a topic…"
      addLabel="Add topic"
      removeAriaSingular="topic"
      add={useAddBrandTopic(brandId)}
      remove={useRemoveBrandTopic(brandId)}
    />
  );
}

function CompetitorsSection({
  brandId,
  competitors,
}: {
  brandId: string;
  competitors: readonly CandidateDto[];
}) {
  return (
    <DimensionEditCard
      icon={SECTION_ICON.competitors}
      title={DISCOVERY_COPY.sections.competitors.title}
      items={competitors}
      addPlaceholder="Add a competitor…"
      addLabel="Add competitor"
      removeAriaSingular="competitor"
      add={useAddBrandCompetitor(brandId)}
      remove={useRemoveBrandCompetitor(brandId)}
    />
  );
}

function AudiencesSection({
  brandId,
  audiences,
}: {
  brandId: string;
  audiences: readonly CandidateDto[];
}) {
  return (
    <DimensionEditCard
      icon={SECTION_ICON.audiences}
      title={DISCOVERY_COPY.sections.audiences.title}
      items={audiences}
      addPlaceholder="Add an audience…"
      addLabel="Add audience"
      removeAriaSingular="audience"
      add={useAddBrandAudience(brandId)}
      remove={useRemoveBrandAudience(brandId)}
    />
  );
}

function MarketsSection({
  brandId,
  markets,
}: {
  brandId: string;
  markets: readonly CandidateDto[];
}) {
  return (
    <DimensionEditCard
      icon={SECTION_ICON.markets}
      title={DISCOVERY_COPY.sections.markets.title}
      items={markets}
      addPlaceholder="Add a market…"
      addLabel="Add market"
      removeAriaSingular="market"
      add={useAddBrandMarket(brandId)}
      remove={useRemoveBrandMarket(brandId)}
    />
  );
}

function ProductsSection({
  brandId,
  products,
}: {
  brandId: string;
  products: readonly CandidateDto[];
}) {
  return (
    <DimensionEditCard
      icon={SECTION_ICON.products}
      title={DISCOVERY_COPY.sections.products.title}
      items={products}
      addPlaceholder="Add a product…"
      addLabel="Add product"
      removeAriaSingular="product"
      add={useAddBrandProduct(brandId)}
      remove={useRemoveBrandProduct(brandId)}
    />
  );
}

function TrustSignalsSection({
  brandId,
  trustSignals,
}: {
  brandId: string;
  trustSignals: readonly CandidateDto[];
}) {
  return (
    <DimensionEditCard
      icon={SECTION_ICON.trustSignals}
      title={DISCOVERY_COPY.sections.trustSignals.title}
      items={trustSignals}
      addPlaceholder="Add a trust signal…"
      addLabel="Add trust signal"
      removeAriaSingular="trust signal"
      add={useAddBrandTrustSignal(brandId)}
      remove={useRemoveBrandTrustSignal(brandId)}
    />
  );
}

/**
 * Editable website URL paired with an external-link icon. The inline
 * editor lets the user fix typos; the icon opens the current saved URL
 * in a new tab so the click-through path stays one tap. Validation is
 * trim + absolute-http(s) on the BE — if the user types something
 * malformed the mutation 400s and the error renders below the field.
 */
function WebsiteUrlEditor({ brandId, websiteUrl }: { brandId: string; websiteUrl: string }) {
  const update = useUpdateBrandWebsiteUrl(brandId);
  const errorMessage =
    update.isError && update.error instanceof Error
      ? update.error.message
      : update.isError
        ? "Update failed — try again."
        : null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1">
        <div className="flex-1">
          <InlineEdit
            value={websiteUrl}
            onChange={(next) => {
              if (next.trim().length > 0) {
                update.mutate({ websiteUrl: next });
              }
            }}
            placeholder="https://example.com"
          />
        </div>
        <a
          href={websiteUrl}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`Open ${websiteUrl} in a new tab`}
          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-primary-600"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
      {errorMessage && (
        <p className="mt-1 text-[11px] text-semantic-error-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
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
