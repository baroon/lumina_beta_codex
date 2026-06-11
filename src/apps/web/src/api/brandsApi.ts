import { apiClient } from "./apiClient";
import type {
  AddBrandTopicRequest,
  AddBrandTopicResult,
  BrandDto,
  CreateBrandRequest,
  CreateBrandResponse,
  UpdateBrandAliasesRequest,
  UpdateBrandAliasesResult,
  UpdateBrandProfileRequest,
  UpdateBrandProfileResult,
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
};
