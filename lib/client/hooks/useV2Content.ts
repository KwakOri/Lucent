"use client";

import { useQuery } from "@tanstack/react-query";
import {
  V2ContentAPI,
  type ListV2ContentPostsParams,
} from "@/lib/client/api/v2-content.api";
import { queryKeys } from "./query-keys";

export function useV2ContentPosts(params: ListV2ContentPostsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2Content.posts.list(params),
    queryFn: () => V2ContentAPI.listPosts(params),
    staleTime: 1000 * 60,
  });
}

export function useV2ContentPostBySlug(slug: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2Content.posts.detail(slug || ""),
    queryFn: async () => {
      const response = await V2ContentAPI.getPostBySlug(slug!);
      return response.data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60,
  });
}
