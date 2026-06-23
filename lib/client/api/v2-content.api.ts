import { apiClient } from "@/lib/client/utils/api-client";
import type { ApiResponse, PaginatedResponse } from "@/types";

export type V2ContentPostType = "NEWS" | "NOTICE" | "BANNER_AD";
export type V2ContentPostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type V2ContentPostSort = "LATEST" | "OLDEST" | "SORT_ORDER";

export interface TiptapJsonNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<Record<string, unknown>>;
  content?: TiptapJsonNode[];
  [key: string]: unknown;
}

export interface V2ContentMediaAsset {
  id: string;
  public_url: string | null;
  file_name: string;
  mime_type: string | null;
  status: string;
}

export interface V2ContentPostListItem {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body_text: string;
  post_type: V2ContentPostType;
  status: V2ContentPostStatus;
  cover_alt_text: string | null;
  cta_label: string | null;
  cta_url: string | null;
  featured_on_home: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  cover_media_asset: V2ContentMediaAsset | null;
}

export interface V2ContentPostDetail extends V2ContentPostListItem {
  body_json: TiptapJsonNode;
}

export interface ListV2ContentPostsParams {
  page?: number;
  limit?: number;
  post_type?: V2ContentPostType;
  featured_on_home?: boolean;
  sort?: V2ContentPostSort;
}

function buildSearchParams(
  values: Record<string, string | number | boolean | undefined>,
): string {
  const searchParams = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const V2ContentAPI = {
  async listPosts(
    params: ListV2ContentPostsParams = {},
  ): Promise<PaginatedResponse<V2ContentPostListItem>> {
    return apiClient.get(
      `/api/v2/content/posts${buildSearchParams({
        page: params.page,
        limit: params.limit,
        post_type: params.post_type,
        featured_on_home: params.featured_on_home,
        sort: params.sort,
      })}`,
      { requiresAuth: false },
    );
  },

  async getPostBySlug(
    slug: string,
  ): Promise<ApiResponse<V2ContentPostDetail>> {
    return apiClient.get(
      `/api/v2/content/posts/${encodeURIComponent(slug)}`,
      { requiresAuth: false },
    );
  },
};
