/**
 * V2 Catalog Admin Hooks
 *
 * v2 catalog 운영 화면에서 사용하는 React Query hook
 */

'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  V2CatalogAdminAPI,
  type BuildV2PriceQuoteData,
  type CreateV2CampaignData,
  type V2CampaignTarget,
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
  type GetV2ProjectProductListParams,
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
  type V2DigitalAsset,
  type V2Product,
  type V2ProjectProductListItem,
  type V2ProductStatus,
  type V2ProductMedia,
  type V2Variant,
  type V2VariantStatus,
} from '@/lib/client/api/v2-catalog-admin.api';
import { queryKeys } from './query-keys';

async function invalidateV2CatalogAdmin(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.v2CatalogAdmin.all,
  });
}

async function invalidateV2MediaAssetQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.v2CatalogAdmin.mediaAssets.all,
  });
}

function getEmptyVariantStatusCounts(): Record<V2VariantStatus, number> {
  return {
    DRAFT: 0,
    ACTIVE: 0,
    INACTIVE: 0,
  };
}

function buildVariantStatusCounts(
  variants: V2Variant[],
): Record<V2VariantStatus, number> {
  return variants.reduce<Record<V2VariantStatus, number>>((counts, variant) => {
    counts[variant.status] += 1;
    return counts;
  }, getEmptyVariantStatusCounts());
}

function matchesV2ProductListParams(
  product: V2Product,
  params: GetV2ProductsParams = {},
): boolean {
  if (params.projectId && params.projectId !== product.project_id) {
    return false;
  }
  if (params.status && params.status !== product.status) {
    return false;
  }
  return true;
}

type V2ProductListQueryKey = readonly [
  'v2-catalog-admin',
  'products',
  'list',
  GetV2ProductsParams,
];

type V2ProductProjectListQueryKey = readonly [
  'v2-catalog-admin',
  'products',
  'project-list',
  GetV2ProjectProductListParams,
];

type V2ProductVariantsMapQueryKey = readonly [
  'v2-catalog-admin',
  'products',
  'variants-map',
  string[],
];

type V2ProductMediaMapQueryKey = readonly [
  'v2-catalog-admin',
  'products',
  'media-map',
  string[],
];

function isV2ProductListQueryKey(
  queryKey: readonly unknown[],
): queryKey is V2ProductListQueryKey {
  return (
    queryKey[0] === 'v2-catalog-admin' &&
    queryKey[1] === 'products' &&
    queryKey[2] === 'list'
  );
}

function isV2ProductProjectListQueryKey(
  queryKey: readonly unknown[],
): queryKey is V2ProductProjectListQueryKey {
  return (
    queryKey[0] === 'v2-catalog-admin' &&
    queryKey[1] === 'products' &&
    queryKey[2] === 'project-list'
  );
}

function isV2ProductVariantsMapQueryKey(
  queryKey: readonly unknown[],
): queryKey is V2ProductVariantsMapQueryKey {
  return (
    queryKey[0] === 'v2-catalog-admin' &&
    queryKey[1] === 'products' &&
    queryKey[2] === 'variants-map' &&
    Array.isArray(queryKey[3])
  );
}

function isV2ProductMediaMapQueryKey(
  queryKey: readonly unknown[],
): queryKey is V2ProductMediaMapQueryKey {
  return (
    queryKey[0] === 'v2-catalog-admin' &&
    queryKey[1] === 'products' &&
    queryKey[2] === 'media-map' &&
    Array.isArray(queryKey[3])
  );
}

function isV2ProductMediaQueryKey(queryKey: readonly unknown[]): boolean {
  return (
    queryKey[0] === 'v2-catalog-admin' &&
    queryKey[1] === 'products' &&
    queryKey[2] === 'media'
  );
}

function normalizeStringIds(ids: string[]): string[] {
  return Array.from(
    new Set(ids.map((id) => id.trim()).filter(Boolean)),
  ).sort();
}

function updateV2ProductInListCache(
  previous: V2Product[] | undefined,
  product: V2Product,
  params: GetV2ProductsParams = {},
) {
  if (!previous) {
    return previous;
  }

  const productIndex = previous.findIndex((item) => item.id === product.id);
  const matchesParams = matchesV2ProductListParams(product, params);

  if (!matchesParams) {
    if (productIndex === -1) {
      return previous;
    }
    return previous.filter((item) => item.id !== product.id);
  }

  if (productIndex === -1) {
    return [...previous, product];
  }

  return previous.map((item) => (item.id === product.id ? product : item));
}

function toV2ProjectProductListItem(
  product: V2Product,
  previousItem?: V2ProjectProductListItem,
): V2ProjectProductListItem {
  return {
    ...previousItem,
    ...product,
    variant_count: previousItem?.variant_count ?? 0,
    variant_status_counts:
      previousItem?.variant_status_counts ?? getEmptyVariantStatusCounts(),
    cover_media: previousItem?.cover_media ?? null,
  };
}

function updateV2ProductInProjectListCache(
  previous: V2ProjectProductListItem[] | undefined,
  product: V2Product,
  params: GetV2ProjectProductListParams,
) {
  if (!previous) {
    return previous;
  }

  const productIndex = previous.findIndex((item) => item.id === product.id);
  const matchesParams = matchesV2ProductListParams(product, params);

  if (!matchesParams) {
    if (productIndex === -1) {
      return previous;
    }
    return previous.filter((item) => item.id !== product.id);
  }

  if (productIndex === -1) {
    return [...previous, toV2ProjectProductListItem(product)];
  }

  return previous.map((item) =>
    item.id === product.id ? toV2ProjectProductListItem(product, item) : item,
  );
}

function removeV2ProductFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
) {
  queryClient.removeQueries({
    queryKey: queryKeys.v2CatalogAdmin.products.detail(productId),
  });
  queryClient.removeQueries({
    queryKey: queryKeys.v2CatalogAdmin.products.variants(productId),
  });
  queryClient.removeQueries({
    queryKey: queryKeys.v2CatalogAdmin.products.media(productId),
  });
  queryClient.removeQueries({
    queryKey: queryKeys.v2CatalogAdmin.products.publishReadiness(productId),
  });

  queryClient
    .getQueryCache()
    .findAll({ predicate: (query) => isV2ProductListQueryKey(query.queryKey) })
    .forEach((query) => {
      queryClient.setQueryData<V2Product[]>(
        query.queryKey,
        (previous) => previous?.filter((item) => item.id !== productId),
      );
    });

  queryClient
    .getQueryCache()
    .findAll({
      predicate: (query) => isV2ProductProjectListQueryKey(query.queryKey),
    })
    .forEach((query) => {
      queryClient.setQueryData<V2ProjectProductListItem[]>(
        query.queryKey,
        (previous) => previous?.filter((item) => item.id !== productId),
      );
    });
}

function syncV2ProductCache(
  queryClient: ReturnType<typeof useQueryClient>,
  product: V2Product,
) {
  queryClient.setQueryData(
    queryKeys.v2CatalogAdmin.products.detail(product.id),
    product,
  );

  queryClient
    .getQueryCache()
    .findAll({ predicate: (query) => isV2ProductListQueryKey(query.queryKey) })
    .forEach((query) => {
      const queryKey = query.queryKey as V2ProductListQueryKey;
      const params = queryKey[3] || {};

      queryClient.setQueryData<V2Product[]>(queryKey, (previous) =>
        updateV2ProductInListCache(previous, product, params),
      );
    });

  queryClient
    .getQueryCache()
    .findAll({
      predicate: (query) => isV2ProductProjectListQueryKey(query.queryKey),
    })
    .forEach((query) => {
      const queryKey = query.queryKey as V2ProductProjectListQueryKey;
      const params = queryKey[3];

      queryClient.setQueryData<V2ProjectProductListItem[]>(queryKey, (previous) =>
        updateV2ProductInProjectListCache(previous, product, params),
      );
    });
}

function upsertById<T extends { id: string }>(
  previous: T[] | undefined,
  nextItem: T,
) {
  if (!previous) {
    return [nextItem];
  }
  if (!previous.some((item) => item.id === nextItem.id)) {
    return [...previous, nextItem];
  }
  return previous.map((item) => (item.id === nextItem.id ? nextItem : item));
}

function removeById<T extends { id: string }>(
  previous: T[] | undefined,
  itemId: string,
) {
  return previous?.filter((item) => item.id !== itemId);
}

function syncV2ProjectListVariantSummary(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
) {
  const variants = queryClient.getQueryData<V2Variant[]>(
    queryKeys.v2CatalogAdmin.products.variants(productId),
  );
  if (!variants) {
    return;
  }

  const variantStatusCounts = buildVariantStatusCounts(variants);
  queryClient
    .getQueryCache()
    .findAll({
      predicate: (query) => isV2ProductProjectListQueryKey(query.queryKey),
    })
    .forEach((query) => {
      queryClient.setQueryData<V2ProjectProductListItem[]>(
        query.queryKey,
        (previous) =>
          previous?.map((item) =>
            item.id === productId
              ? {
                  ...item,
                  variant_count: variants.length,
                  variant_status_counts: variantStatusCounts,
                }
              : item,
          ),
      );
    });
}

function syncV2VariantCache(
  queryClient: ReturnType<typeof useQueryClient>,
  variant: V2Variant,
) {
  queryClient.setQueryData<V2Variant[]>(
    queryKeys.v2CatalogAdmin.products.variants(variant.product_id),
    (previous) => upsertById(previous, variant),
  );

  queryClient
    .getQueryCache()
    .findAll({
      predicate: (query) =>
        isV2ProductVariantsMapQueryKey(query.queryKey) &&
        query.queryKey[3].includes(variant.product_id),
    })
    .forEach((query) => {
      queryClient.setQueryData<Record<string, V2Variant[]>>(
        query.queryKey,
        (previous) => ({
          ...(previous || {}),
          [variant.product_id]: upsertById(
            previous?.[variant.product_id],
            variant,
          ),
        }),
      );
    });

  syncV2ProjectListVariantSummary(queryClient, variant.product_id);
}

function removeV2VariantFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  variantId: string,
  productId: string,
) {
  queryClient.setQueryData<V2Variant[]>(
    queryKeys.v2CatalogAdmin.products.variants(productId),
    (previous) => removeById(previous, variantId),
  );

  queryClient
    .getQueryCache()
    .findAll({
      predicate: (query) =>
        isV2ProductVariantsMapQueryKey(query.queryKey) &&
        query.queryKey[3].includes(productId),
    })
    .forEach((query) => {
      queryClient.setQueryData<Record<string, V2Variant[]>>(
        query.queryKey,
        (previous) => ({
          ...(previous || {}),
          [productId]: removeById(previous?.[productId], variantId) || [],
        }),
      );
    });

  syncV2ProjectListVariantSummary(queryClient, productId);
}

function resolveV2CoverMedia(mediaList: V2ProductMedia[]): V2ProductMedia | null {
  const activeMedia = mediaList.filter((media) => media.status === 'ACTIVE');
  return (
    activeMedia.find((media) => media.is_primary) ||
    activeMedia.find((media) => media.media_role === 'PRIMARY') ||
    null
  );
}

function syncV2ProjectListCoverMedia(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string,
) {
  const mediaList = queryClient.getQueryData<V2ProductMedia[]>(
    queryKeys.v2CatalogAdmin.products.media(productId),
  );
  if (!mediaList) {
    return;
  }

  const coverMedia = resolveV2CoverMedia(mediaList);
  queryClient
    .getQueryCache()
    .findAll({
      predicate: (query) => isV2ProductProjectListQueryKey(query.queryKey),
    })
    .forEach((query) => {
      queryClient.setQueryData<V2ProjectProductListItem[]>(
        query.queryKey,
        (previous) =>
          previous?.map((item) =>
            item.id === productId
              ? {
                  ...item,
                  cover_media: coverMedia,
                }
              : item,
          ),
      );
    });
}

function syncV2ProductMediaCache(
  queryClient: ReturnType<typeof useQueryClient>,
  media: V2ProductMedia,
) {
  queryClient.setQueryData<V2ProductMedia[]>(
    queryKeys.v2CatalogAdmin.products.media(media.product_id),
    (previous) => upsertById(previous, media),
  );

  queryClient
    .getQueryCache()
    .findAll({
      predicate: (query) =>
        isV2ProductMediaMapQueryKey(query.queryKey) &&
        query.queryKey[3].includes(media.product_id),
    })
    .forEach((query) => {
      queryClient.setQueryData<Record<string, V2ProductMedia[]>>(
        query.queryKey,
        (previous) => ({
          ...(previous || {}),
          [media.product_id]: upsertById(
            previous?.[media.product_id],
            media,
          ),
        }),
      );
    });

  syncV2ProjectListCoverMedia(queryClient, media.product_id);
}

function syncV2DigitalAssetCache(
  queryClient: ReturnType<typeof useQueryClient>,
  asset: V2DigitalAsset,
) {
  queryClient.setQueryData<V2DigitalAsset[]>(
    queryKeys.v2CatalogAdmin.assets.list(asset.variant_id),
    (previous) => upsertById(previous, asset),
  );
}

type InvalidateControl = {
  skipInvalidate?: boolean;
};

type DeleteV2VariantInput =
  | string
  | ({
      variantId: string;
      productId?: string;
    } & InvalidateControl);

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

export function useArchiveV2Project() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => V2CatalogAdminAPI.archiveProject(id),
    onSuccess: async () => {
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useRestoreV2Project() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => V2CatalogAdminAPI.restoreProject(id),
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

export function useV2AdminProjectProductList(
  params: GetV2ProjectProductListParams,
) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.products.projectList(params),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getProjectProductList(params);
      return response.data;
    },
    enabled: !!params.projectId,
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
    onSuccess: (response) => {
      syncV2ProductCache(queryClient, response.data);
    },
  });
}

export function useUpdateV2Product() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
      skipInvalidate,
    }: {
      id: string;
      data: UpdateV2ProductData;
    } & InvalidateControl) => {
      void skipInvalidate;
      return V2CatalogAdminAPI.updateProduct(id, data);
    },
    onSuccess: async (response, variables) => {
      syncV2ProductCache(queryClient, response.data);

      if (variables.skipInvalidate) {
        return;
      }
    },
  });
}

export function useBulkUpdateV2ProductStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productIds,
      status,
    }: {
      productIds: string[];
      status: V2ProductStatus;
    }) => {
      const response = await V2CatalogAdminAPI.bulkUpdateProductStatus({
        productIds,
        status,
      });
      return response.data;
    },
    onSuccess: (products) => {
      products.forEach((product) => syncV2ProductCache(queryClient, product));
    },
  });
}

export function useDeleteV2Product() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => V2CatalogAdminAPI.deleteProduct(id),
    onSuccess: (_response, productId) => {
      removeV2ProductFromCache(queryClient, productId);
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

export function useV2AdminVariantsMap(productIds: string[]) {
  const normalizedProductIds = useMemo(
    () => normalizeStringIds(productIds),
    [productIds],
  );

  const variantsQuery = useQuery({
    queryKey: queryKeys.v2CatalogAdmin.products.variantsMap(normalizedProductIds),
    queryFn: async () => {
      const response = await V2CatalogAdminAPI.getVariantsMap(normalizedProductIds);
      return response.data;
    },
    enabled: normalizedProductIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return useMemo(() => {
    const variantsByProductId = normalizedProductIds.reduce<
      Record<string, V2Variant[]>
    >((accumulator, productId) => {
      accumulator[productId] = variantsQuery.data?.[productId] || [];
      return accumulator;
    }, {});

    return {
      variantsByProductId,
      isLoading: normalizedProductIds.length > 0 && variantsQuery.isLoading,
      isFetching: variantsQuery.isFetching,
      isError: Boolean(variantsQuery.error),
    };
  }, [normalizedProductIds, variantsQuery.data, variantsQuery.error, variantsQuery.isFetching, variantsQuery.isLoading]);
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
    onSuccess: (response) => {
      syncV2VariantCache(queryClient, response.data);
    },
  });
}

export function useUpdateV2Variant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      variantId,
      data,
      skipInvalidate,
    }: {
      variantId: string;
      data: UpdateV2VariantData;
    } & InvalidateControl) => {
      void skipInvalidate;
      return V2CatalogAdminAPI.updateVariant(variantId, data);
    },
    onSuccess: async (response, variables) => {
      syncV2VariantCache(queryClient, response.data);

      if (variables.skipInvalidate) {
        return;
      }
    },
  });
}

export function useDeleteV2Variant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteV2VariantInput) => {
      const variantId = typeof input === 'string' ? input : input.variantId;
      return V2CatalogAdminAPI.deleteVariant(variantId);
    },
    onSuccess: async (_response, variables) => {
      if (typeof variables !== 'string' && variables.skipInvalidate) {
        return;
      }

      const variantId =
        typeof variables === 'string' ? variables : variables.variantId;
      const productId =
        typeof variables === 'string' ? null : variables.productId || null;

      if (productId) {
        removeV2VariantFromCache(queryClient, variantId, productId);
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.v2CatalogAdmin.products.all,
      });
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
      await Promise.all([
        invalidateV2MediaAssetQueries(queryClient),
        queryClient.invalidateQueries({
          predicate: (query) =>
            isV2ProductMediaQueryKey(query.queryKey) ||
            isV2ProductMediaMapQueryKey(query.queryKey),
        }),
      ]);
    },
  });
}

export function useDeleteV2MediaAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mediaAssetId: string) =>
      V2CatalogAdminAPI.deleteMediaAsset(mediaAssetId),
    onSuccess: async () => {
      await Promise.all([
        invalidateV2MediaAssetQueries(queryClient),
        queryClient.invalidateQueries({
          predicate: (query) =>
            isV2ProductMediaQueryKey(query.queryKey) ||
            isV2ProductMediaMapQueryKey(query.queryKey),
        }),
      ]);
    },
  });
}

export function useUploadV2MediaAssetFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      data,
      options,
      skipInvalidate,
    }: {
      data: UploadV2MediaAssetFileData;
      options?: UploadV2MediaAssetFileOptions;
    } & InvalidateControl) => {
      void skipInvalidate;
      return V2CatalogAdminAPI.uploadMediaAssetFile(data, options);
    },
    onSuccess: async (_response, variables) => {
      if (variables.skipInvalidate) {
        return;
      }
      await invalidateV2MediaAssetQueries(queryClient);
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

export function useV2AdminProductMediaMap(productIds: string[]) {
  const normalizedProductIds = useMemo(
    () => normalizeStringIds(productIds),
    [productIds],
  );

  const mediaQuery = useQuery({
    queryKey: queryKeys.v2CatalogAdmin.products.mediaMap(normalizedProductIds),
    queryFn: async () => {
      const response =
        await V2CatalogAdminAPI.getProductMediaMap(normalizedProductIds);
      return response.data;
    },
    enabled: normalizedProductIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return useMemo(() => {
    const mediaByProductId = normalizedProductIds.reduce<
      Record<string, V2ProductMedia[]>
    >((accumulator, productId) => {
      accumulator[productId] = mediaQuery.data?.[productId] || [];
      return accumulator;
    }, {});

    return {
      mediaByProductId,
      isLoading: normalizedProductIds.length > 0 && mediaQuery.isLoading,
      isFetching: mediaQuery.isFetching,
      isError: Boolean(mediaQuery.error),
    };
  }, [mediaQuery.data, mediaQuery.error, mediaQuery.isFetching, mediaQuery.isLoading, normalizedProductIds]);
}

export function useCreateV2ProductMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      data,
      skipInvalidate,
    }: {
      productId: string;
      data: CreateV2MediaData;
    } & InvalidateControl) => {
      void skipInvalidate;
      return V2CatalogAdminAPI.createProductMedia(productId, data);
    },
    onSuccess: async (response, variables) => {
      syncV2ProductMediaCache(queryClient, response.data);

      if (variables.skipInvalidate) {
        return;
      }
    },
  });
}

export function useUpdateV2ProductMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mediaId,
      data,
      skipInvalidate,
    }: {
      mediaId: string;
      data: UpdateV2MediaData;
    } & InvalidateControl) => {
      void skipInvalidate;
      return V2CatalogAdminAPI.updateProductMedia(mediaId, data);
    },
    onSuccess: async (response, variables) => {
      syncV2ProductMediaCache(queryClient, response.data);

      if (variables.skipInvalidate) {
        return;
      }
    },
  });
}

export function useDeactivateV2ProductMedia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mediaId: string) =>
      V2CatalogAdminAPI.deactivateProductMedia(mediaId),
    onSuccess: (response) => {
      syncV2ProductMediaCache(queryClient, response.data);
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
    onSuccess: (response) => {
      syncV2DigitalAssetCache(queryClient, response.data);
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
    onSuccess: (response) => {
      syncV2DigitalAssetCache(queryClient, response.data);
    },
  });
}

export function useActivateV2DigitalAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assetId: string) =>
      V2CatalogAdminAPI.activateDigitalAsset(assetId),
    onSuccess: (response) => {
      syncV2DigitalAssetCache(queryClient, response.data);
    },
  });
}

export function useDeactivateV2DigitalAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assetId: string) =>
      V2CatalogAdminAPI.deactivateDigitalAsset(assetId),
    onSuccess: (response) => {
      syncV2DigitalAssetCache(queryClient, response.data);
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
    mutationFn: async (input: CreateV2BundleDefinitionData & InvalidateControl) => {
      const {
        skipInvalidate,
        ...data
      } = input;
      void skipInvalidate;
      return V2CatalogAdminAPI.createBundleDefinition(data);
    },
    onSuccess: async (_response, variables) => {
      if (variables.skipInvalidate) {
        return;
      }
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
      skipInvalidate,
    }: {
      definitionId: string;
      data: UpdateV2BundleDefinitionData;
    } & InvalidateControl) => {
      void skipInvalidate;
      return V2CatalogAdminAPI.updateBundleDefinition(definitionId, data);
    },
    onSuccess: async (_response, variables) => {
      if (variables.skipInvalidate) {
        return;
      }
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function usePublishV2BundleDefinition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      definitionId,
      skipInvalidate,
    }: {
      definitionId: string;
    } & InvalidateControl) => {
      void skipInvalidate;
      return V2CatalogAdminAPI.publishBundleDefinition(definitionId);
    },
    onSuccess: async (_response, variables) => {
      if (variables.skipInvalidate) {
        return;
      }
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
      skipInvalidate,
    }: {
      definitionId: string;
      data: CreateV2BundleComponentData;
    } & InvalidateControl) => {
      void skipInvalidate;
      return V2CatalogAdminAPI.createBundleComponent(definitionId, data);
    },
    onSuccess: async (_response, variables) => {
      if (variables.skipInvalidate) {
        return;
      }
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
      skipInvalidate,
    }: {
      componentId: string;
      data: UpdateV2BundleComponentData;
    } & InvalidateControl) => {
      void skipInvalidate;
      return V2CatalogAdminAPI.updateBundleComponent(componentId, data);
    },
    onSuccess: async (_response, variables) => {
      if (variables.skipInvalidate) {
        return;
      }
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useDeleteV2BundleComponent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      componentId,
      skipInvalidate,
    }: {
      componentId: string;
    } & InvalidateControl) => {
      void skipInvalidate;
      return V2CatalogAdminAPI.deleteBundleComponent(componentId);
    },
    onSuccess: async (_response, variables) => {
      if (variables.skipInvalidate) {
        return;
      }
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

export function useV2CampaignDetailContext(
  campaignId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.campaigns.detailContext(campaignId || ''),
    queryFn: async () => {
      const response =
        await V2CatalogAdminAPI.getCampaignDetailContext(campaignId!);
      return response.data;
    },
    enabled: !!campaignId,
  });
}

export function useV2CampaignPricingContext(
  campaignId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.v2CatalogAdmin.pricing.campaignContext(campaignId || ''),
    queryFn: async () => {
      const response =
        await V2CatalogAdminAPI.getCampaignPricingContext(campaignId!);
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
  const normalizedCampaignIds = useMemo(
    () => normalizeStringIds(campaignIds),
    [campaignIds],
  );
  const overviewQuery = useQuery({
    queryKey: queryKeys.v2CatalogAdmin.campaigns.overview(normalizedCampaignIds),
    queryFn: async () => {
      const response =
        await V2CatalogAdminAPI.getCampaignOverviewMap(normalizedCampaignIds);
      return response.data;
    },
    enabled: normalizedCampaignIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return useMemo(() => {
    return normalizedCampaignIds.reduce<Record<string, {
      targetCount: number;
      excludedTargetCount: number;
      priceListCount: number;
      promotionCount: number;
      hasLinkedPricing: boolean;
      isLoading: boolean;
    }>>((accumulator, campaignId) => {
      const overview = overviewQuery.data?.[campaignId];

      accumulator[campaignId] = {
        targetCount: overview?.targetCount || 0,
        excludedTargetCount: overview?.excludedTargetCount || 0,
        priceListCount: overview?.priceListCount || 0,
        promotionCount: overview?.promotionCount || 0,
        hasLinkedPricing: overview?.hasLinkedPricing || false,
        isLoading: normalizedCampaignIds.length > 0 && overviewQuery.isLoading,
      };

      return accumulator;
    }, {});
  }, [normalizedCampaignIds, overviewQuery.data, overviewQuery.isLoading]);
}

export function useV2CampaignTargetsMap(campaignIds: string[]) {
  const normalizedCampaignIds = useMemo(
    () => normalizeStringIds(campaignIds),
    [campaignIds],
  );
  const targetsQuery = useQuery({
    queryKey: queryKeys.v2CatalogAdmin.campaigns.targetsMap(normalizedCampaignIds),
    queryFn: async () => {
      const response =
        await V2CatalogAdminAPI.getCampaignTargetsMap(normalizedCampaignIds);
      return response.data;
    },
    enabled: normalizedCampaignIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return useMemo(
    () =>
      normalizedCampaignIds.reduce<
        Record<
          string,
          {
            targets: V2CampaignTarget[];
            isLoading: boolean;
          }
        >
      >((accumulator, campaignId) => {
        accumulator[campaignId] = {
          targets: targetsQuery.data?.[campaignId] || [],
          isLoading:
            normalizedCampaignIds.length > 0 && targetsQuery.isLoading,
        };
        return accumulator;
      }, {}),
    [normalizedCampaignIds, targetsQuery.data, targetsQuery.isLoading],
  );
}

export function useCreateV2CampaignTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campaignId,
      data,
      skipInvalidate,
    }: {
      campaignId: string;
      data: CreateV2CampaignTargetData;
    } & InvalidateControl) => {
      void skipInvalidate;
      return V2CatalogAdminAPI.createCampaignTarget(campaignId, data);
    },
    onSuccess: async (_response, variables) => {
      if (variables.skipInvalidate) {
        return;
      }
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
    mutationFn: async (input: string | ({ targetId: string } & InvalidateControl)) => {
      const targetId = typeof input === 'string' ? input : input.targetId;
      return V2CatalogAdminAPI.deleteCampaignTarget(targetId);
    },
    onSuccess: async (_response, variables) => {
      if (typeof variables !== 'string' && variables.skipInvalidate) {
        return;
      }
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
    mutationFn: async (input: CreateV2PriceListData & InvalidateControl) => {
      const {
        skipInvalidate,
        ...data
      } = input;
      void skipInvalidate;
      return V2CatalogAdminAPI.createPriceList(data);
    },
    onSuccess: async (_response, variables) => {
      if (variables.skipInvalidate) {
        return;
      }
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
    mutationFn: async (input: string | ({ id: string } & InvalidateControl)) => {
      const id = typeof input === 'string' ? input : input.id;
      return V2CatalogAdminAPI.publishPriceList(id);
    },
    onSuccess: async (_response, variables) => {
      if (typeof variables !== 'string' && variables.skipInvalidate) {
        return;
      }
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
      skipInvalidate,
    }: {
      priceListId: string;
      data: CreateV2PriceListItemData;
    } & InvalidateControl) => {
      void skipInvalidate;
      return V2CatalogAdminAPI.createPriceListItem(priceListId, data);
    },
    onSuccess: async (_response, variables) => {
      if (variables.skipInvalidate) {
        return;
      }
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
      skipInvalidate,
    }: {
      itemId: string;
      data: UpdateV2PriceListItemData;
    } & InvalidateControl) => {
      void skipInvalidate;
      return V2CatalogAdminAPI.updatePriceListItem(itemId, data);
    },
    onSuccess: async (_response, variables) => {
      if (variables.skipInvalidate) {
        return;
      }
      await invalidateV2CatalogAdmin(queryClient);
    },
  });
}

export function useDeactivateV2PriceListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | ({ itemId: string } & InvalidateControl)) => {
      const itemId = typeof input === 'string' ? input : input.itemId;
      return V2CatalogAdminAPI.deactivatePriceListItem(itemId);
    },
    onSuccess: async (_response, variables) => {
      if (typeof variables !== 'string' && variables.skipInvalidate) {
        return;
      }
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
