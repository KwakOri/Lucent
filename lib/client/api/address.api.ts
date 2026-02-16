import { apiClient } from '@/lib/client/utils/api-client';
import type { ApiResponse } from '@/types';
import type { AddressSearchResult } from '@/types/address';

interface AddressSearchMeta {
  total_count: number;
  pageable_count: number;
  is_end: boolean;
}

interface AddressSearchResponse {
  results: AddressSearchResult[];
  meta: AddressSearchMeta;
}

export const AddressAPI = {
  async search(query: string, page = 1, size = 10): Promise<ApiResponse<AddressSearchResponse>> {
    const params = new URLSearchParams({
      query,
      page: String(page),
      size: String(size),
    });

    return apiClient.get(`/api/address/search?${params.toString()}`, {
      requiresAuth: false,
    });
  },
};
