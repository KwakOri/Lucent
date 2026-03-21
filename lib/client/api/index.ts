/**
 * Client API Index
 *
 * 모든 API 클라이언트를 한 곳에서 export
 */

// API Clients
export { AuthAPI } from './auth.api';
export { ArtistsAPI } from './artists.api';
export { ProjectsAPI } from './projects.api';
export { ProductsAPI } from './products.api';
export { ProfilesAPI } from './profiles.api';
export { CartAPI } from './cart.api';
export { LogsAPI } from './logs.api';
export { V2CatalogAdminAPI } from './v2-catalog-admin.api';
export { V2CheckoutAPI } from './v2-checkout.api';

// Types
export type { SendVerificationData } from './auth.api';
export type {
  ArtistWithDetails,
  GetArtistsParams,
  CreateArtistData,
  UpdateArtistData,
} from './artists.api';
export type {
  ProjectWithDetails,
  GetProjectsParams,
  CreateProjectData,
  UpdateProjectData,
  ReorderProjectsData,
} from './projects.api';
export type {
  ProductWithDetails,
  GetProductsParams,
  CreateProductData,
  UpdateProductData,
} from './products.api';
export type { UpdateProfileData } from './profiles.api';
export type { GetLogsParams, LogStats, LogWithRelations } from './logs.api';
export type {
  AddToCartRequest,
  UpdateCartItemRequest,
  CartItemWithProduct,
  CartResponseData,
} from './cart.api';
export type {
  V2Project,
  V2Artist,
  V2ProjectArtist,
  V2Product,
  V2Variant,
  V2ProductMedia,
  V2DigitalAsset,
  ProductPublishReadiness,
  MigrationCompareReport,
  MigrationCheckResult,
  ReadSwitchChecklist,
  ReadSwitchChecklistItem,
  GetV2ProjectsParams,
  GetV2ArtistsParams,
  GetV2ProductsParams,
  CreateV2ProjectData,
  UpdateV2ProjectData,
  CreateV2ArtistData,
  UpdateV2ArtistData,
  LinkV2ArtistToProjectData,
  CreateV2ProductData,
  UpdateV2ProductData,
  CreateV2VariantData,
  UpdateV2VariantData,
  CreateV2MediaData,
  UpdateV2MediaData,
  CreateV2DigitalAssetData,
  UpdateV2DigitalAssetData,
} from './v2-catalog-admin.api';
export type {
  V2CartItem,
  V2CartSummary,
  V2CheckoutOrder,
  V2CreateOrderResult,
  V2ValidateCheckoutResult,
  AddV2CartItemData,
  UpdateV2CartItemQuantityData,
  ValidateV2CheckoutData,
  CreateV2OrderData,
  PaymentCallbackData,
  CancelV2OrderData,
  RefundV2OrderData,
} from './v2-checkout.api';
