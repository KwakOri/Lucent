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
  type CloneV2BundleDefinitionVersionData,
  type CreateV2BundleComponentData,
  type CreateV2BundleComponentOptionData,
  type CreateV2BundleDefinitionData,
  type CreateV2DigitalAssetData,
  type CreateV2MediaData,
  type CreateV2ProductData,
  type CreateV2ProjectData,
  type CreateV2VariantData,
  type GetV2BundleDefinitionsParams,
  type GetV2ArtistsParams,
  type GetV2ProductsParams,
  type GetV2ProjectsParams,
  type LinkV2ArtistToProjectData,
  type PreviewV2BundleData,
  type ResolveV2BundleData,
  type UpdateV2BundleComponentOptionData,
  type UpdateV2BundleComponentData,
  type UpdateV2BundleDefinitionData,
  type UpdateV2ArtistData,
  type UpdateV2DigitalAssetData,
  type UpdateV2MediaData,
  type UpdateV2ProductData,
  type UpdateV2ProjectData,
  type UpdateV2VariantData,
  type ValidateV2BundleDefinitionData,
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

export function useV2BundleDefinitions(params: GetV2BundleDefinitionsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.bundles.definitions.list(params),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getBundleDefinitions(params);
      return response.data;
    },
  });
}

export function useV2BundleDefinition(definitionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.bundles.definitions.detail(
      definitionId || '',
    ),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getBundleDefinition(definitionId!);
      return response.data;
    },
    enabled: !!definitionId,
  });
}

export function useCreateV2BundleDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateV2BundleDefinitionData) =>
      V2CatalogAdminAPI.createBundleDefinition(data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2BundleDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      definitionId,
      data,
    }: {
      definitionId: string;
      data: UpdateV2BundleDefinitionData;
    }) => V2CatalogAdminAPI.updateBundleDefinition(definitionId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function usePublishV2BundleDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (definitionId: string) =>
      V2CatalogAdminAPI.publishBundleDefinition(definitionId),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useArchiveV2BundleDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (definitionId: string) =>
      V2CatalogAdminAPI.archiveBundleDefinition(definitionId),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useCloneV2BundleDefinitionVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      definitionId,
      data,
    }: {
      definitionId: string;
      data?: CloneV2BundleDefinitionVersionData;
    }) => V2CatalogAdminAPI.cloneBundleDefinitionVersion(definitionId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useV2BundleComponents(definitionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.bundles.definitions.components(
      definitionId || '',
    ),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getBundleComponents(definitionId!);
      return response.data;
    },
    enabled: !!definitionId,
  });
}

export function useCreateV2BundleComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      definitionId,
      data,
    }: {
      definitionId: string;
      data: CreateV2BundleComponentData;
    }) => V2CatalogAdminAPI.createBundleComponent(definitionId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2BundleComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      componentId,
      data,
    }: {
      componentId: string;
      data: UpdateV2BundleComponentData;
    }) => V2CatalogAdminAPI.updateBundleComponent(componentId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useDeleteV2BundleComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (componentId: string) =>
      V2CatalogAdminAPI.deleteBundleComponent(componentId),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useCreateV2BundleComponentOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      componentId,
      data,
    }: {
      componentId: string;
      data: CreateV2BundleComponentOptionData;
    }) => V2CatalogAdminAPI.createBundleComponentOption(componentId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2BundleComponentOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      optionId,
      data,
    }: {
      optionId: string;
      data: UpdateV2BundleComponentOptionData;
    }) => V2CatalogAdminAPI.updateBundleComponentOption(optionId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useDeleteV2BundleComponentOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (optionId: string) =>
      V2CatalogAdminAPI.deleteBundleComponentOption(optionId),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useValidateV2BundleDefinition(definitionId: string | null | undefined) {
  return useMutation({
    mutationFn: async (data: ValidateV2BundleDefinitionData = {}) => {
      if (!definitionId) {
        throw new Error('definitionId is required');
      }
      const response = await V2CatalogAdminAPI.validateBundleDefinition(
        definitionId,
        data,
      );
      return response.data;
    },
  });
}

export function useResolveV2Bundle() {
  return useMutation({
    mutationFn: async (data: ResolveV2BundleData) => {
      const response = await V2CatalogAdminAPI.resolveBundle(data);
      return response.data;
    },
  });
}

export function usePreviewV2Bundle() {
  return useMutation({
    mutationFn: async (data: PreviewV2BundleData) => {
      const response = await V2CatalogAdminAPI.previewBundle(data);
      return response.data;
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
