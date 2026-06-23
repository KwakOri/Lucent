import { apiClient } from "@/lib/client/utils/api-client";
import type { ApiResponse, PaginatedResponse } from "@/types";
import type {
  TiptapJsonNode,
  V2ContentMediaAsset,
  V2ContentPostSort,
  V2ContentPostStatus,
  V2ContentPostType,
} from "./v2-content.api";

export interface V2ContentAdminPost {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body_json: TiptapJsonNode;
  body_text: string;
  post_type: V2ContentPostType;
  status: V2ContentPostStatus;
  cover_media_asset_id: string | null;
  cover_alt_text: string | null;
  cta_label: string | null;
  cta_url: string | null;
  featured_on_home: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  cover_media_asset: V2ContentMediaAsset | null;
}

export interface ListV2ContentAdminPostsParams {
  page?: number;
  limit?: number;
  post_type?: V2ContentPostType;
  status?: V2ContentPostStatus;
  search?: string;
  featured_on_home?: boolean;
  sort?: V2ContentPostSort;
}

export interface UpsertV2ContentAdminPostData {
  slug?: string;
  title?: string;
  summary?: string | null;
  body_json?: TiptapJsonNode;
  body_text?: string | null;
  post_type?: V2ContentPostType;
  status?: V2ContentPostStatus;
  cover_media_asset_id?: string | null;
  cover_alt_text?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  featured_on_home?: boolean;
  sort_order?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  published_at?: string | null;
  metadata?: Record<string, unknown>;
}

function buildSearchParams(
  values: Record<string, string | number | boolean | undefined>,
): string {
  const searchParams = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const V2ContentAdminAPI = {
  async listPosts(
    params: ListV2ContentAdminPostsParams = {},
  ): Promise<PaginatedResponse<V2ContentAdminPost>> {
    return apiClient.get(
      `/api/v2/content/admin/posts${buildSearchParams({
        page: params.page,
        limit: params.limit,
        post_type: params.post_type,
        status: params.status,
        search: params.search,
        featured_on_home: params.featured_on_home,
        sort: params.sort,
      })}`,
    );
  },

  async getPost(id: string): Promise<ApiResponse<V2ContentAdminPost>> {
    return apiClient.get(`/api/v2/content/admin/posts/${encodeURIComponent(id)}`);
  },

  async createPost(
    data: UpsertV2ContentAdminPostData,
  ): Promise<ApiResponse<V2ContentAdminPost>> {
    return apiClient.post("/api/v2/content/admin/posts", data);
  },

  async updatePost(
    id: string,
    data: UpsertV2ContentAdminPostData,
  ): Promise<ApiResponse<V2ContentAdminPost>> {
    return apiClient.patch(
      `/api/v2/content/admin/posts/${encodeURIComponent(id)}`,
      data,
    );
  },

  async publishPost(id: string): Promise<ApiResponse<V2ContentAdminPost>> {
    return apiClient.post(
      `/api/v2/content/admin/posts/${encodeURIComponent(id)}/publish`,
      {},
    );
  },

  async archivePost(id: string): Promise<ApiResponse<V2ContentAdminPost>> {
    return apiClient.post(
      `/api/v2/content/admin/posts/${encodeURIComponent(id)}/archive`,
      {},
    );
  },
};
