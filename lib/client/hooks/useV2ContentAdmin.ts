"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  V2ContentAdminAPI,
  type ListV2ContentAdminPostsParams,
  type UpsertV2ContentAdminPostData,
} from "@/lib/client/api/v2-content-admin.api";
import { queryKeys } from "./query-keys";

async function invalidateV2Content(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.v2Content.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.v2ContentAdmin.all }),
  ]);
}

export function useV2ContentAdminPosts(
  params: ListV2ContentAdminPostsParams = {},
) {
  return useQuery({
    queryKey: queryKeys.v2ContentAdmin.posts.list(params),
    queryFn: () => V2ContentAdminAPI.listPosts(params),
  });
}

export function useV2ContentAdminPost(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2ContentAdmin.posts.detail(id || ""),
    queryFn: async () => {
      const response = await V2ContentAdminAPI.getPost(id!);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateV2ContentAdminPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertV2ContentAdminPostData) =>
      V2ContentAdminAPI.createPost(data),
    onSuccess: async () => {
      await invalidateV2Content(queryClient);
    },
  });
}

export function useUpdateV2ContentAdminPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpsertV2ContentAdminPostData;
    }) => V2ContentAdminAPI.updatePost(id, data),
    onSuccess: async () => {
      await invalidateV2Content(queryClient);
    },
  });
}

export function usePublishV2ContentAdminPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => V2ContentAdminAPI.publishPost(id),
    onSuccess: async () => {
      await invalidateV2Content(queryClient);
    },
  });
}

export function useArchiveV2ContentAdminPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => V2ContentAdminAPI.archivePost(id),
    onSuccess: async () => {
      await invalidateV2Content(queryClient);
    },
  });
}
