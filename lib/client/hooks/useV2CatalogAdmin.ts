/**
 * V2 Catalog Admin Hooks
 *
 * v2 catalog 운영 화면에서 사용하는 React Query hook
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  V2CatalogAdminAPI,
  type CreateV2ArtistData,
  type CreateV2DigitalAssetData,
  type CreateV2MediaData,
  type CreateV2ProductData,
  type CreateV2ProjectData,
  type CreateV2VariantData,
  type GetV2ArtistsParams,
  type GetV2ProductsParams,
  type GetV2ProjectsParams,
  type LinkV2ArtistToProjectData,
  type UpdateV2ArtistData,
  type UpdateV2DigitalAssetData,
  type UpdateV2MediaData,
  type UpdateV2ProductData,
  type UpdateV2ProjectData,
  type UpdateV2VariantData,
} from '@/lib/client/api/v2-catalog-admin.api';
import { queryKeys } from './query-keys';

async function invalidateV2CatalogAdmin(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.v2CatalogAdmin.all,
  });
}

export function useV2AdminProjects(params: GetV2ProjectsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.projects.list(params),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getProjects(params);
      return response.data;
    },
  });
}

export function useV2AdminProject(projectId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.projects.detail(projectId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getProject(projectId!);
      return response.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateV2Project() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateV2ProjectData) =>
      V2CatalogAdminAPI.createProject(data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2Project() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateV2ProjectData;
    }) => V2CatalogAdminAPI.updateProject(id, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function usePublishV2Project() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => V2CatalogAdminAPI.publishProject(id),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUnpublishV2Project() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => V2CatalogAdminAPI.unpublishProject(id),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useDeleteV2Project() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => V2CatalogAdminAPI.deleteProject(id),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useV2AdminArtists(params: GetV2ArtistsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.artists.list(params),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getArtists(params);
      return response.data;
    },
  });
}

export function useV2AdminArtist(artistId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.artists.detail(artistId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getArtist(artistId!);
      return response.data;
    },
    enabled: !!artistId,
  });
}

export function useCreateV2Artist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateV2ArtistData) =>
      V2CatalogAdminAPI.createArtist(data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2Artist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateV2ArtistData;
    }) => V2CatalogAdminAPI.updateArtist(id, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useLinkV2ArtistToProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      artistId,
      data,
    }: {
      projectId: string;
      artistId: string;
      data?: LinkV2ArtistToProjectData;
    }) => V2CatalogAdminAPI.linkArtistToProject(projectId, artistId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUnlinkV2ArtistFromProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      artistId,
    }: {
      projectId: string;
      artistId: string;
    }) => V2CatalogAdminAPI.unlinkArtistFromProject(projectId, artistId),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useV2AdminProducts(params: GetV2ProductsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.products.list(params),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getProducts(params);
      return response.data;
    },
  });
}

export function useV2AdminProduct(productId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.products.detail(productId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getProduct(productId!);
      return response.data;
    },
    enabled: !!productId,
  });
}

export function useCreateV2Product() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateV2ProductData) =>
      V2CatalogAdminAPI.createProduct(data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2Product() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateV2ProductData;
    }) => V2CatalogAdminAPI.updateProduct(id, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useDeleteV2Product() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => V2CatalogAdminAPI.deleteProduct(id),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useV2AdminVariants(productId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.products.variants(productId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getVariants(productId!);
      return response.data;
    },
    enabled: !!productId,
  });
}

export function useCreateV2Variant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      data,
    }: {
      productId: string;
      data: CreateV2VariantData;
    }) => V2CatalogAdminAPI.createVariant(productId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2Variant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      variantId,
      data,
    }: {
      variantId: string;
      data: UpdateV2VariantData;
    }) => V2CatalogAdminAPI.updateVariant(variantId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useDeleteV2Variant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variantId: string) =>
      V2CatalogAdminAPI.deleteVariant(variantId),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useV2AdminProductMedia(productId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.products.media(productId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getProductMedia(productId!);
      return response.data;
    },
    enabled: !!productId,
  });
}

export function useCreateV2ProductMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      data,
    }: {
      productId: string;
      data: CreateV2MediaData;
    }) => V2CatalogAdminAPI.createProductMedia(productId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2ProductMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mediaId,
      data,
    }: {
      mediaId: string;
      data: UpdateV2MediaData;
    }) => V2CatalogAdminAPI.updateProductMedia(mediaId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useDeactivateV2ProductMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mediaId: string) =>
      V2CatalogAdminAPI.deactivateProductMedia(mediaId),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useV2AdminVariantAssets(variantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.assets.list(variantId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getVariantAssets(variantId!);
      return response.data;
    },
    enabled: !!variantId,
  });
}

export function useCreateV2DigitalAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      variantId,
      data,
    }: {
      variantId: string;
      data: CreateV2DigitalAssetData;
    }) => V2CatalogAdminAPI.createDigitalAsset(variantId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2DigitalAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assetId,
      data,
    }: {
      assetId: string;
      data: UpdateV2DigitalAssetData;
    }) => V2CatalogAdminAPI.updateDigitalAsset(assetId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useActivateV2DigitalAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assetId: string) =>
      V2CatalogAdminAPI.activateDigitalAsset(assetId),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useDeactivateV2DigitalAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assetId: string) =>
      V2CatalogAdminAPI.deactivateDigitalAsset(assetId),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useV2ProductPublishReadiness(productId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.products.publishReadiness(productId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getProductPublishReadiness(productId!);
      return response.data;
    },
    enabled: !!productId,
  });
}

export function useV2CatalogMigrationCompareReport(sampleLimit = 20) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.migration.compareReport(sampleLimit),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getMigrationCompareReport(sampleLimit);
      return response.data;
    },
  });
}

export function useV2CatalogReadSwitchChecklist(sampleLimit = 20) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.migration.readSwitchChecklist(sampleLimit),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getReadSwitchChecklist(sampleLimit);
      return response.data;
    },
  });
}

export function useV2CatalogReadSwitchRemediationTasks(sampleLimit = 20) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.migration.remediationTasks(sampleLimit),
    queryFn: async () => {
      const response =
        await V2CatalogAdminAPI.getReadSwitchRemediationTasks(sampleLimit);
      return response.data;
    },
  });
}
