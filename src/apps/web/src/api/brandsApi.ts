import { apiClient } from "./apiClient";
import type {
  BrandDto,
  CreateBrandRequest,
  CreateBrandResponse,
  UpdateBrandAliasesRequest,
  UpdateBrandAliasesResult,
} from "@/types/api";

export const brandsApi = {
  list: () => apiClient.get<BrandDto[]>("/api/brands"),

  create: (data: CreateBrandRequest) => apiClient.post<CreateBrandResponse>("/api/brands", data),

  getById: (id: string) => apiClient.get<BrandDto>(`/api/brands/${id}`),

  updateAliases: (id: string, data: UpdateBrandAliasesRequest) =>
    apiClient.put<UpdateBrandAliasesResult>(`/api/brands/${id}/aliases`, data),
};
