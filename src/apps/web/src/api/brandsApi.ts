import { apiClient } from "./apiClient";
import type { BrandDto, CreateBrandRequest, CreateBrandResponse } from "@/types/api";

export const brandsApi = {
  create: (data: CreateBrandRequest) =>
    apiClient.post<CreateBrandResponse>("/api/brands", data),

  getById: (id: string) =>
    apiClient.get<BrandDto>(`/api/brands/${id}`),
};
