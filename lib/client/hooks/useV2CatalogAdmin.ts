/**
 * V2 Catalog Admin Hooks
 *
 * v2 catalog 운영 화면에서 사용하는 React Query hook
 */

'use client';

import { useMemo } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  V2CatalogAdminAPI,
  type BuildV2PriceQuoteData,
  type CreateV2CampaignData,
  type CreateV2CampaignTargetData,
  type CreateV2ArtistData,
  type CloneV2BundleDefinitionVersionData,
  type CreateV2BundleComponentData,
  type CreateV2BundleComponentOptionData,
  type CreateV2BundleDefinitionData,
  type CreateV2CouponData,
  type CreateV2DigitalAssetData,
  type CreateV2MediaData,
  type CreateV2PriceListData,
  type CreateV2PriceListItemData,
  type CreateV2ProductData,
  type CreateV2PromotionData,
  type CreateV2PromotionRuleData,
  type CreateV2ProjectData,
  type CreateV2VariantData,
  type GetV2CampaignsParams,
  type GetV2CouponRedemptionsParams,
  type GetV2CouponsParams,
  type GetV2BundleDefinitionsParams,
  type GetV2ArtistsParams,
  type GetV2MediaAssetsParams,
  type GetV2PriceListsParams,
  type GetV2ProductsParams,
  type GetV2PromotionsParams,
  type GetV2ProjectsParams,
  type LinkV2ArtistToProjectData,
  type BuildV2BundleCanaryReportData,
  type BuildV2BundleOpsContractData,
  type PreviewV2BundleData,
  type RedeemV2CouponRedemptionData,
  type ReleaseV2CouponRedemptionData,
  type ReserveV2CouponData,
  type ResolveV2BundleData,
  type UpdateV2CampaignData,
  type UpdateV2CampaignTargetData,
  type UpdateV2BundleComponentOptionData,
  type UpdateV2BundleComponentData,
  type UpdateV2BundleDefinitionData,
  type UpdateV2ArtistData,
  type UpdateV2CouponData,
  type UpdateV2DigitalAssetData,
  type UpdateV2MediaAssetData,
  type UpdateV2MediaData,
  type UpdateV2PriceListData,
  type UpdateV2PriceListItemData,
  type UpdateV2ProductData,
  type UpdateV2PromotionData,
  type UpdateV2PromotionRuleData,
  type UpdateV2ProjectData,
  type UpdateV2VariantData,
  type UploadV2MediaAssetFileOptions,
  type ValidateV2CouponData,
  type ValidateV2BundleDefinitionData,
  type UploadV2MediaAssetFileData,
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

export function useV2AdminMediaAssets(params: GetV2MediaAssetsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.mediaAssets.list(params),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getMediaAssets(params);
      return response.data;
    },
  });
}

export function useUpdateV2MediaAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mediaAssetId,
      data,
    }: {
      mediaAssetId: string;
      data: UpdateV2MediaAssetData;
    }) => V2CatalogAdminAPI.updateMediaAsset(mediaAssetId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useDeleteV2MediaAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mediaAssetId: string) =>
      V2CatalogAdminAPI.deleteMediaAsset(mediaAssetId),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUploadV2MediaAssetFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      data,
      options,
    }: {
      data: UploadV2MediaAssetFileData;
      options?: UploadV2MediaAssetFileOptions;
    }) => V2CatalogAdminAPI.uploadMediaAssetFile(data, options),
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

export function useBuildV2BundleOpsContract() {
  return useMutation({
    mutationFn: async (data: BuildV2BundleOpsContractData) => {
      const response = await V2CatalogAdminAPI.buildBundleOpsContract(data);
      return response.data;
    },
  });
}

export function useBuildV2BundleCanaryReport() {
  return useMutation({
    mutationFn: async (data: BuildV2BundleCanaryReportData = {}) => {
      const response = await V2CatalogAdminAPI.buildBundleCanaryReport(data);
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

export function useV2Campaigns(params: GetV2CampaignsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.campaigns.list(params),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getCampaigns(params);
      return response.data;
    },
  });
}

export function useV2Campaign(campaignId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.campaigns.detail(campaignId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getCampaign(campaignId!);
      return response.data;
    },
    enabled: !!campaignId,
  });
}

export function useCreateV2Campaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateV2CampaignData) =>
      V2CatalogAdminAPI.createCampaign(data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2Campaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateV2CampaignData;
    }) => V2CatalogAdminAPI.updateCampaign(id, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useActivateV2Campaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => V2CatalogAdminAPI.activateCampaign(id),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useSuspendV2Campaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => V2CatalogAdminAPI.suspendCampaign(id),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useCloseV2Campaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => V2CatalogAdminAPI.closeCampaign(id),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useV2CampaignTargets(campaignId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.campaigns.targets(campaignId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getCampaignTargets(campaignId!);
      return response.data;
    },
    enabled: !!campaignId,
  });
}

export function useV2CampaignOverview(campaignIds: string[]) {
  const targetQueries = useQueries({
    queries: campaignIds.map((campaignId) => ({
      queryKey: queryKeys.v2CatalogAdmin.campaigns.targets(campaignId),
      queryFn: async () => {
        const response = await V2CatalogAdminAPI.getCampaignTargets(campaignId);
        return response.data;
      },
      enabled: campaignId.length > 0,
    })),
  });

  const priceListQueries = useQueries({
    queries: campaignIds.map((campaignId) => ({
      queryKey: queryKeys.v2CatalogAdmin.pricing.priceLists.list({ campaignId }),
      queryFn: async () => {
        const response = await V2CatalogAdminAPI.getPriceLists({ campaignId });
        return response.data;
      },
      enabled: campaignId.length > 0,
    })),
  });

  const promotionQueries = useQueries({
    queries: campaignIds.map((campaignId) => ({
      queryKey: queryKeys.v2CatalogAdmin.pricing.promotions.list({ campaignId }),
      queryFn: async () => {
        const response = await V2CatalogAdminAPI.getPromotions({ campaignId });
        return response.data;
      },
      enabled: campaignId.length > 0,
    })),
  });

  return useMemo(() => {
    return campaignIds.reduce<Record<string, {
      targetCount: number;
      excludedTargetCount: number;
      priceListCount: number;
      promotionCount: number;
      hasLinkedPricing: boolean;
      isLoading: boolean;
    }>>((accumulator, campaignId, index) => {
      const targets = targetQueries[index]?.data || [];
      const priceLists = priceListQueries[index]?.data || [];
      const promotions = promotionQueries[index]?.data || [];

      accumulator[campaignId] = {
        targetCount: targets.filter((target) => !target.is_excluded).length,
        excludedTargetCount: targets.filter((target) => target.is_excluded).length,
        priceListCount: priceLists.length,
        promotionCount: promotions.length,
        hasLinkedPricing: priceLists.length > 0 || promotions.length > 0,
        isLoading:
          Boolean(targetQueries[index]?.isLoading) ||
          Boolean(priceListQueries[index]?.isLoading) ||
          Boolean(promotionQueries[index]?.isLoading),
      };

      return accumulator;
    }, {});
  }, [campaignIds, priceListQueries, promotionQueries, targetQueries]);
}

export function useCreateV2CampaignTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campaignId,
      data,
    }: {
      campaignId: string;
      data: CreateV2CampaignTargetData;
    }) => V2CatalogAdminAPI.createCampaignTarget(campaignId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2CampaignTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      targetId,
      data,
    }: {
      targetId: string;
      data: UpdateV2CampaignTargetData;
    }) => V2CatalogAdminAPI.updateCampaignTarget(targetId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useDeleteV2CampaignTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetId: string) =>
      V2CatalogAdminAPI.deleteCampaignTarget(targetId),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useV2PriceLists(params: GetV2PriceListsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.pricing.priceLists.list(params),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getPriceLists(params);
      return response.data;
    },
  });
}

export function useV2PriceList(priceListId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.pricing.priceLists.detail(priceListId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getPriceList(priceListId!);
      return response.data;
    },
    enabled: !!priceListId,
  });
}

export function useCreateV2PriceList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateV2PriceListData) =>
      V2CatalogAdminAPI.createPriceList(data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2PriceList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateV2PriceListData;
    }) => V2CatalogAdminAPI.updatePriceList(id, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function usePublishV2PriceList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => V2CatalogAdminAPI.publishPriceList(id),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useRollbackV2PriceList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => V2CatalogAdminAPI.rollbackPriceList(id),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useV2PriceListItems(priceListId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.pricing.priceLists.items(priceListId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getPriceListItems(priceListId!);
      return response.data;
    },
    enabled: !!priceListId,
  });
}

export function useCreateV2PriceListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      priceListId,
      data,
    }: {
      priceListId: string;
      data: CreateV2PriceListItemData;
    }) => V2CatalogAdminAPI.createPriceListItem(priceListId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2PriceListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      data,
    }: {
      itemId: string;
      data: UpdateV2PriceListItemData;
    }) => V2CatalogAdminAPI.updatePriceListItem(itemId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useDeactivateV2PriceListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) =>
      V2CatalogAdminAPI.deactivatePriceListItem(itemId),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useV2Promotions(params: GetV2PromotionsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.pricing.promotions.list(params),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getPromotions(params);
      return response.data;
    },
  });
}

export function useV2Promotion(promotionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.pricing.promotions.detail(promotionId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getPromotion(promotionId!);
      return response.data;
    },
    enabled: !!promotionId,
  });
}

export function useCreateV2Promotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateV2PromotionData) =>
      V2CatalogAdminAPI.createPromotion(data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2Promotion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateV2PromotionData;
    }) => V2CatalogAdminAPI.updatePromotion(id, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useV2PromotionRules(promotionId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.pricing.promotions.rules(promotionId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getPromotionRules(promotionId!);
      return response.data;
    },
    enabled: !!promotionId,
  });
}

export function useCreateV2PromotionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      promotionId,
      data,
    }: {
      promotionId: string;
      data: CreateV2PromotionRuleData;
    }) => V2CatalogAdminAPI.createPromotionRule(promotionId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2PromotionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ruleId,
      data,
    }: {
      ruleId: string;
      data: UpdateV2PromotionRuleData;
    }) => V2CatalogAdminAPI.updatePromotionRule(ruleId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useV2Coupons(params: GetV2CouponsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.pricing.coupons.list(params),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getCoupons(params);
      return response.data;
    },
  });
}

export function useV2Coupon(couponId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.pricing.coupons.detail(couponId || ''),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getCoupon(couponId!);
      return response.data;
    },
    enabled: !!couponId,
  });
}

export function useV2CouponRedemptions(params: GetV2CouponRedemptionsParams = {}) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.pricing.coupons.redemptions(params),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getCouponRedemptions(params);
      return response.data;
    },
  });
}

export function useCreateV2Coupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateV2CouponData) => V2CatalogAdminAPI.createCoupon(data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useUpdateV2Coupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateV2CouponData;
    }) => V2CatalogAdminAPI.updateCoupon(id, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useValidateV2Coupon() {
  return useMutation({
    mutationFn: async (data: ValidateV2CouponData) => {
      const response = await V2CatalogAdminAPI.validateCoupon(data);
      return response.data;
    },
  });
}

export function useReserveV2Coupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      couponId,
      data,
    }: {
      couponId: string;
      data: ReserveV2CouponData;
    }) => V2CatalogAdminAPI.reserveCoupon(couponId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useReleaseV2CouponRedemption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      redemptionId,
      data,
    }: {
      redemptionId: string;
      data?: ReleaseV2CouponRedemptionData;
    }) => V2CatalogAdminAPI.releaseCouponRedemption(redemptionId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useRedeemV2CouponRedemption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      redemptionId,
      data,
    }: {
      redemptionId: string;
      data?: RedeemV2CouponRedemptionData;
    }) => V2CatalogAdminAPI.redeemCouponRedemption(redemptionId, data),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useBuildV2PriceQuote() {
  return useMutation({
    mutationFn: async (data: BuildV2PriceQuoteData) => {
      const response = await V2CatalogAdminAPI.buildPriceQuote(data);
      return response.data;
    },
  });
}

export function useEvaluateV2Promotions() {
  return useMutation({
    mutationFn: async (data: BuildV2PriceQuoteData) => {
      const response = await V2CatalogAdminAPI.evaluatePromotions(data);
      return response.data;
    },
  });
}

export function useV2PricingDebugTrace() {
  return useMutation({
    mutationFn: async (data: BuildV2PriceQuoteData) => {
      const response = await V2CatalogAdminAPI.getPricingDebugTrace(data);
      return response.data;
    },
  });
}

export function useV2OrderSnapshotContract() {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.pricing.orderSnapshotContract(),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getOrderSnapshotContract();
      return response.data;
    },
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
