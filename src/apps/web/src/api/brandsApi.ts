import { apiClient } from "./apiClient";
import type {
  AddBrandAudienceRequest,
  AddBrandAudienceResult,
  AddBrandCompetitorRequest,
  AddBrandCompetitorResult,
  AddBrandMarketRequest,
  AddBrandMarketResult,
  AddBrandProductRequest,
  AddBrandProductResult,
  AddBrandTopicRequest,
  AddBrandTopicResult,
  AddBrandTrustSignalRequest,
  AddBrandTrustSignalResult,
  BrandDto,
  CreateBrandRequest,
  CreateBrandResponse,
  RenameBrandDimensionRequest,
  RenameBrandDimensionResult,
  RenameBrandRequest,
  RenameBrandResult,
  UpdateBrandAliasesRequest,
  UpdateBrandAliasesResult,
  UpdateBrandProfileRequest,
  UpdateBrandProfileResult,
  UpdateBrandWebsiteUrlRequest,
  UpdateBrandWebsiteUrlResult,
} from "@/types/api";

export const brandsApi = {
  list: () => apiClient.get<BrandDto[]>("/api/brands"),

  create: (data: CreateBrandRequest) => apiClient.post<CreateBrandResponse>("/api/brands", data),

  getById: (id: string) => apiClient.get<BrandDto>(`/api/brands/${id}`),

  updateAliases: (id: string, data: UpdateBrandAliasesRequest) =>
    apiClient.put<UpdateBrandAliasesResult>(`/api/brands/${id}/aliases`, data),

  updateProfile: (id: string, data: UpdateBrandProfileRequest) =>
    apiClient.put<UpdateBrandProfileResult>(`/api/brands/${id}/profile`, data),

  addTopic: (id: string, data: AddBrandTopicRequest) =>
    apiClient.post<AddBrandTopicResult>(`/api/brands/${id}/topics`, data),

  removeTopic: (id: string, topicId: string) =>
    apiClient.delete<void>(`/api/brands/${id}/topics/${topicId}`),

  addCompetitor: (id: string, data: AddBrandCompetitorRequest) =>
    apiClient.post<AddBrandCompetitorResult>(`/api/brands/${id}/competitors`, data),

  removeCompetitor: (id: string, competitorId: string) =>
    apiClient.delete<void>(`/api/brands/${id}/competitors/${competitorId}`),

  addAudience: (id: string, data: AddBrandAudienceRequest) =>
    apiClient.post<AddBrandAudienceResult>(`/api/brands/${id}/audiences`, data),

  removeAudience: (id: string, audienceId: string) =>
    apiClient.delete<void>(`/api/brands/${id}/audiences/${audienceId}`),

  addMarket: (id: string, data: AddBrandMarketRequest) =>
    apiClient.post<AddBrandMarketResult>(`/api/brands/${id}/markets`, data),

  removeMarket: (id: string, marketId: string) =>
    apiClient.delete<void>(`/api/brands/${id}/markets/${marketId}`),

  addProduct: (id: string, data: AddBrandProductRequest) =>
    apiClient.post<AddBrandProductResult>(`/api/brands/${id}/products`, data),

  removeProduct: (id: string, productId: string) =>
    apiClient.delete<void>(`/api/brands/${id}/products/${productId}`),

  addTrustSignal: (id: string, data: AddBrandTrustSignalRequest) =>
    apiClient.post<AddBrandTrustSignalResult>(`/api/brands/${id}/trust-signals`, data),

  removeTrustSignal: (id: string, trustSignalId: string) =>
    apiClient.delete<void>(`/api/brands/${id}/trust-signals/${trustSignalId}`),

  delete: (id: string) => apiClient.delete<void>(`/api/brands/${id}`),

  rename: (id: string, data: RenameBrandRequest) =>
    apiClient.put<RenameBrandResult>(`/api/brands/${id}/name`, data),

  updateWebsiteUrl: (id: string, data: UpdateBrandWebsiteUrlRequest) =>
    apiClient.put<UpdateBrandWebsiteUrlResult>(`/api/brands/${id}/website-url`, data),

  renameTopic: (id: string, topicId: string, data: RenameBrandDimensionRequest) =>
    apiClient.put<RenameBrandDimensionResult>(`/api/brands/${id}/topics/${topicId}`, data),

  renameCompetitor: (id: string, competitorId: string, data: RenameBrandDimensionRequest) =>
    apiClient.put<RenameBrandDimensionResult>(
      `/api/brands/${id}/competitors/${competitorId}`,
      data,
    ),

  renameAudience: (id: string, audienceId: string, data: RenameBrandDimensionRequest) =>
    apiClient.put<RenameBrandDimensionResult>(`/api/brands/${id}/audiences/${audienceId}`, data),

  renameMarket: (id: string, marketId: string, data: RenameBrandDimensionRequest) =>
    apiClient.put<RenameBrandDimensionResult>(`/api/brands/${id}/markets/${marketId}`, data),

  renameProduct: (id: string, productId: string, data: RenameBrandDimensionRequest) =>
    apiClient.put<RenameBrandDimensionResult>(`/api/brands/${id}/products/${productId}`, data),

  renameTrustSignal: (id: string, trustSignalId: string, data: RenameBrandDimensionRequest) =>
    apiClient.put<RenameBrandDimensionResult>(
      `/api/brands/${id}/trust-signals/${trustSignalId}`,
      data,
    ),
};
