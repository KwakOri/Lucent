/**
 * React Query Keys
 *
 * 일관된 QueryKey 구조 관리
 */

import type { GetOrdersParams } from '@/lib/client/api/orders.api';
import type { GetArtistsParams } from '@/lib/client/api/artists.api';
import type { GetProductsParams } from '@/lib/client/api/products.api';
import type { GetProjectsParams } from '@/lib/client/api/projects.api';
import type {
  GetV2ArtistsParams,
  GetV2ProductsParams,
  GetV2ProjectsParams,
} from '@/lib/client/api/v2-catalog-admin.api';

export const queryKeys = {
  /**
   * Auth Query Keys
   */
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },

  /**
   * Products Query Keys
   */
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (params: GetProductsParams = {}) =>
      [...queryKeys.products.lists(), params] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    bySlug: (slug: string) => [...queryKeys.products.all, 'slug', slug] as const,
  },

  /**
   * Orders Query Keys
   */
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (params: GetOrdersParams = {}) =>
      [...queryKeys.orders.lists(), params] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
  },

  /**
   * Artists Query Keys
   */
  artists: {
    all: ['artists'] as const,
    lists: () => [...queryKeys.artists.all, 'list'] as const,
    list: (params: GetArtistsParams = {}) =>
      [...queryKeys.artists.lists(), params] as const,
    details: () => [...queryKeys.artists.all, 'detail'] as const,
    detail: (slug: string) => [...queryKeys.artists.details(), slug] as const,
  },

  /**
   * Projects Query Keys
   */
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (params: GetProjectsParams = {}) =>
      [...queryKeys.projects.lists(), params] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },

  /**
   * Profile Query Keys
   */
  profile: {
    all: ['profile'] as const,
    my: () => [...queryKeys.profile.all, 'my'] as const,
  },

  /**
   * V2 Catalog Admin Query Keys
   */
  v2CatalogAdmin: {
    all: ['v2-catalog-admin'] as const,
    projects: {
      all: ['v2-catalog-admin', 'projects'] as const,
      list: (params: GetV2ProjectsParams = {}) =>
        [...queryKeys.v2CatalogAdmin.projects.all, 'list', params] as const,
      detail: (id: string) =>
        [...queryKeys.v2CatalogAdmin.projects.all, 'detail', id] as const,
    },
    artists: {
      all: ['v2-catalog-admin', 'artists'] as const,
      list: (params: GetV2ArtistsParams = {}) =>
        [...queryKeys.v2CatalogAdmin.artists.all, 'list', params] as const,
      detail: (id: string) =>
        [...queryKeys.v2CatalogAdmin.artists.all, 'detail', id] as const,
    },
    products: {
      all: ['v2-catalog-admin', 'products'] as const,
      list: (params: GetV2ProductsParams = {}) =>
        [...queryKeys.v2CatalogAdmin.products.all, 'list', params] as const,
      detail: (id: string) =>
        [...queryKeys.v2CatalogAdmin.products.all, 'detail', id] as const,
      variants: (productId: string) =>
        [...queryKeys.v2CatalogAdmin.products.all, 'variants', productId] as const,
      media: (productId: string) =>
        [...queryKeys.v2CatalogAdmin.products.all, 'media', productId] as const,
      publishReadiness: (productId: string) =>
        [
          ...queryKeys.v2CatalogAdmin.products.all,
          'publish-readiness',
          productId,
        ] as const,
    },
    assets: {
      all: ['v2-catalog-admin', 'assets'] as const,
      list: (variantId: string) =>
        [...queryKeys.v2CatalogAdmin.assets.all, 'list', variantId] as const,
    },
    migration: {
      all: ['v2-catalog-admin', 'migration'] as const,
      compareReport: (sampleLimit: number) =>
        [
          ...queryKeys.v2CatalogAdmin.migration.all,
          'compare-report',
          sampleLimit,
        ] as const,
      readSwitchChecklist: (sampleLimit: number) =>
        [
          ...queryKeys.v2CatalogAdmin.migration.all,
          'read-switch-checklist',
          sampleLimit,
        ] as const,
      remediationTasks: (sampleLimit: number) =>
        [
          ...queryKeys.v2CatalogAdmin.migration.all,
          'remediation-tasks',
          sampleLimit,
        ] as const,
    },
  },
} as const;
