import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { brandsApi } from "@/api/brandsApi";
import { discoveryApi } from "@/api/discoveryApi";
import type {
  AddBrandAudienceRequest,
  AddBrandCompetitorRequest,
  AddBrandMarketRequest,
  AddBrandProductRequest,
  AddBrandTopicRequest,
  AddBrandTrustSignalRequest,
  CreateBrandRequest,
  RenameBrandDimensionRequest,
  RenameBrandRequest,
  UpdateBrandAliasesRequest,
  UpdateBrandProfileRequest,
  UpdateBrandWebsiteUrlRequest,
} from "@/types/api";

/**
 * Build a mutation hook pair (add + remove) for a brand dimension that
 * follows the topic / competitor shape. Each pair invalidates the
 * `["discovery", brandId]` cache so the chip list re-renders. The
 * factory eliminates 8 nearly-identical hook bodies for audiences,
 * markets, products, and trust signals.
 */
function makeDimensionHooks<TAddReq>(
  addFn: (brandId: string, data: TAddReq) => Promise<unknown>,
  removeFn: (brandId: string, id: string) => Promise<unknown>,
  renameFn: (brandId: string, id: string, data: RenameBrandDimensionRequest) => Promise<unknown>,
) {
  return {
    useAdd(brandId: string) {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (data: TAddReq) => addFn(brandId, data),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
        },
      });
    },
    useRemove(brandId: string) {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (id: string) => removeFn(brandId, id),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
        },
      });
    },
    useRename(brandId: string) {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: (vars: { id: string; name: string }) =>
          renameFn(brandId, vars.id, { name: vars.name }),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
        },
      });
    },
  };
}

const audienceHooks = makeDimensionHooks<AddBrandAudienceRequest>(
  brandsApi.addAudience,
  brandsApi.removeAudience,
  brandsApi.renameAudience,
);
const marketHooks = makeDimensionHooks<AddBrandMarketRequest>(
  brandsApi.addMarket,
  brandsApi.removeMarket,
  brandsApi.renameMarket,
);
const productHooks = makeDimensionHooks<AddBrandProductRequest>(
  brandsApi.addProduct,
  brandsApi.removeProduct,
  brandsApi.renameProduct,
);
const trustSignalHooks = makeDimensionHooks<AddBrandTrustSignalRequest>(
  brandsApi.addTrustSignal,
  brandsApi.removeTrustSignal,
  brandsApi.renameTrustSignal,
);

export const useAddBrandAudience = audienceHooks.useAdd;
export const useRemoveBrandAudience = audienceHooks.useRemove;
export const useRenameBrandAudience = audienceHooks.useRename;
export const useAddBrandMarket = marketHooks.useAdd;
export const useRemoveBrandMarket = marketHooks.useRemove;
export const useRenameBrandMarket = marketHooks.useRename;
export const useAddBrandProduct = productHooks.useAdd;
export const useRemoveBrandProduct = productHooks.useRemove;
export const useRenameBrandProduct = productHooks.useRename;
export const useAddBrandTrustSignal = trustSignalHooks.useAdd;
export const useRemoveBrandTrustSignal = trustSignalHooks.useRemove;
export const useRenameBrandTrustSignal = trustSignalHooks.useRename;

export function useBrandsList() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: () => brandsApi.list(),
  });
}

export function useBrand(brandId: string) {
  return useQuery({
    queryKey: ["brands", brandId],
    queryFn: () => brandsApi.getById(brandId),
    enabled: !!brandId,
  });
}

/**
 * Brand-feature wrapper around the discovery results endpoint. Shares the
 * `["discovery", brandId]` query key with the discovery feature's own
 * hook so React Query keeps a single cache entry — this hook exists only
 * because the cross-feature lint rule bans `brands` from importing
 * `@/features/discovery/*`. Identical fetch + cache semantics either way.
 */
export function useBrandDiscoveryResults(brandId: string) {
  return useQuery({
    queryKey: ["discovery", brandId],
    queryFn: () => discoveryApi.getResults(brandId),
    enabled: !!brandId,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: CreateBrandRequest) => brandsApi.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      navigate({ to: "/brands/$brandId/discovery", params: { brandId: result.brandId } });
    },
  });
}

/**
 * Mutates the brand's alias list. Aliases live on Brand.Aliases but
 * surface to the FE through the discovery results DTO, so the
 * `["discovery", brandId]` cache is invalidated on success.
 */
export function useUpdateBrandAliases(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBrandAliasesRequest) => brandsApi.updateAliases(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Mutates the brand's identity fields (shortDescription / industry /
 * category / positioning). Like aliases, these surface to the FE via
 * the discovery results DTO so the discovery cache is invalidated on
 * success.
 */
export function useUpdateBrandProfile(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBrandProfileRequest) => brandsApi.updateProfile(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Adds a user-authored Topic to the brand. The BE anchors the new row
 * to the brand's most recent DiscoveryRun and stamps Source = UserAdded.
 * Invalidates the discovery cache so the chip list re-renders.
 */
export function useAddBrandTopic(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddBrandTopicRequest) => brandsApi.addTopic(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Removes a Topic from the brand. Cascade FKs handle prompt_topics
 * and tracker_topics junction cleanup; we only need to invalidate
 * the discovery cache.
 */
export function useRemoveBrandTopic(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (topicId: string) => brandsApi.removeTopic(brandId, topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Adds a user-authored Competitor to the brand. Mirrors
 * <c>useAddBrandTopic</c> — anchors to the latest DiscoveryRun on the
 * BE; invalidates the discovery cache here.
 */
export function useAddBrandCompetitor(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddBrandCompetitorRequest) => brandsApi.addCompetitor(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/** Removes a Competitor from the brand. Cascade FKs handle junctions. */
export function useRemoveBrandCompetitor(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (competitorId: string) => brandsApi.removeCompetitor(brandId, competitorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/** Renames a Topic on the brand. Mirrors the dimension rename shape. */
export function useRenameBrandTopic(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; name: string }) =>
      brandsApi.renameTopic(brandId, vars.id, { name: vars.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Replaces the alias list on a single brand competitor. Competitor
 * aliases are downstream input to mention detection — a deeper edit
 * surface than the chip-level rename. Invalidates the discovery cache
 * so the chip metadata refreshes.
 */
export function useUpdateBrandCompetitorAliases(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { competitorId: string; aliases: string[] }) =>
      brandsApi.updateCompetitorAliases(brandId, vars.competitorId, {
        aliases: vars.aliases,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Mutates a single competitor's canonical domain. Empty/null clears
 * the field; the BE normalizes hostname/URL inputs down to lowercase
 * host with "www." stripped, matching the citation classifier's
 * NormalizeDomain shape — wrong domains silently mis-route citation
 * classification, so this lives behind the same dialog as aliases.
 */
export function useUpdateBrandCompetitorDomain(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { competitorId: string; domain: string | null }) =>
      brandsApi.updateCompetitorDomain(brandId, vars.competitorId, {
        domain: vars.domain,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Mutates a product's alias list. Mirror of the competitor-aliases
 * hook — same pipeline downstream (mention detection treats name +
 * aliases as one set), same trim/dedup/empty-filter shape on the BE,
 * same per-brand ownership check.
 */
export function useUpdateBrandProductAliases(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { productId: string; aliases: string[] }) =>
      brandsApi.updateProductAliases(brandId, vars.productId, {
        aliases: vars.aliases,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Mutates a single market's ISO 3166-1 alpha-2 country code. Drives
 * flag display on discovery cards — empty value is valid (regional /
 * global markets have no code) but anything that isn't a two-letter
 * code triggers a 400 with an inline error.
 */
export function useUpdateBrandMarketCountryCode(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { marketId: string; countryCode: string | null }) =>
      brandsApi.updateMarketCountryCode(brandId, vars.marketId, {
        countryCode: vars.countryCode,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Recategorizes a trust signal into one of the seven TrustSignalType
 * buckets. The Discovery wizard's AddBrandTrustSignal handler always
 * starts user-added rows in <c>AwardsAndRecognitions</c>, so this is
 * the canonical way to move them out of the default bucket.
 */
export function useUpdateBrandTrustSignalType(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { trustSignalId: string; signalType: string }) =>
      brandsApi.updateTrustSignalType(brandId, vars.trustSignalId, {
        signalType: vars.signalType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Mutates a trust signal's prose description. Mirror of the
 * competitor/product description hooks — user-facing note, BE
 * trims, null-coerces empty, and caps at 2000 chars.
 */
export function useUpdateBrandTrustSignalDescription(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { trustSignalId: string; description: string | null }) =>
      brandsApi.updateTrustSignalDescription(brandId, vars.trustSignalId, {
        description: vars.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Recategorizes a product into one of the six ProductType buckets.
 * Discovery and AddBrandProduct both default user-added rows to
 * <c>Product</c>, so this is the canonical way to move them out.
 */
export function useUpdateBrandProductType(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { productId: string; productType: string }) =>
      brandsApi.updateProductType(brandId, vars.productId, {
        productType: vars.productType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Mutates a product's prose description. Mirror of the competitor
 * description hook — user-facing note, BE trims, null-coerces empty,
 * and caps at 2000 chars.
 */
export function useUpdateBrandProductDescription(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { productId: string; description: string | null }) =>
      brandsApi.updateProductDescription(brandId, vars.productId, {
        description: vars.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Mutates a single competitor's prose description. User-facing note —
 * not a signal-extraction input — so the BE just trims, null-coerces
 * empty, and caps length. Invalidates the discovery cache so the
 * dialog re-renders with the persisted shape.
 */
export function useUpdateBrandCompetitorDescription(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { competitorId: string; description: string | null }) =>
      brandsApi.updateCompetitorDescription(brandId, vars.competitorId, {
        description: vars.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/** Renames a Competitor on the brand. Mirrors the dimension rename shape. */
export function useRenameBrandCompetitor(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; name: string }) =>
      brandsApi.renameCompetitor(brandId, vars.id, { name: vars.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Renames a brand. The brand name flows through several caches —
 * the brands list (sidebar selector, brand row list), the per-brand
 * cache (page header), the discovery results DTO (brandName field),
 * and every workspace overview that surfaces brand labels. We
 * invalidate the lot rather than enumerate; brand renames are rare
 * enough that a wholesale refresh is cheap and avoids a stale label.
 */
export function useRenameBrand(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RenameBrandRequest) => brandsApi.rename(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
      queryClient.invalidateQueries({ queryKey: ["all-trackers"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-overview"] });
    },
  });
}

/**
 * Updates the brand's website URL. Only the per-brand + discovery
 * caches need refreshing; the URL doesn't appear in workspace-level
 * aggregations.
 */
export function useUpdateBrandWebsiteUrl(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBrandWebsiteUrlRequest) => brandsApi.updateWebsiteUrl(brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands", brandId] });
      queryClient.invalidateQueries({ queryKey: ["discovery", brandId] });
    },
  });
}

/**
 * Hard-deletes the brand and its entire subtree. Navigates to /brands
 * on success since the current screen (/brands/$brandId/profile) no
 * longer points to anything. Invalidates the brands list cache so the
 * deleted row stops appearing immediately.
 */
export function useDeleteBrand(brandId: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => brandsApi.delete(brandId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.removeQueries({ queryKey: ["brands", brandId] });
      queryClient.removeQueries({ queryKey: ["discovery", brandId] });
      navigate({ to: "/brands" });
    },
  });
}
