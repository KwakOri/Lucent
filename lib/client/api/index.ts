/**
 * Client API Index
 *
 * 모든 API 클라이언트를 한 곳에서 export
 */

// API Clients
export { AuthAPI } from './auth.api';
export { OrdersAPI } from './orders.api';
export { ArtistsAPI } from './artists.api';
export { ProjectsAPI } from './projects.api';
export { ProductsAPI } from './products.api';
export { ProfilesAPI } from './profiles.api';
export { CartAPI } from './cart.api';
export { LogsAPI } from './logs.api';

// Types
export type { SendVerificationData } from './auth.api';
export type {
  CreateOrderData,
  OrderWithItems,
  GetOrdersParams,
  DownloadInfo,
  VoicePackSummary,
  BulkUpdateOrderStatusData,
  BulkUpdateOrderStatusResult,
  UpdateOrderItemsStatusData,
} from './orders.api';
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
