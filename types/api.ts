/**
 * API Request/Response Types
 *
 * API 요청/응답 관련 타입 정의
 */

import { TablesInsert, TablesUpdate, Enums } from './database';

/**
 * Common API Response Types
 */

/**
 * 기본 API 응답
 */
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  message?: string;
  errorCode?: string;
}

/**
 * 페이지네이션 정보
 */
export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 페이지네이션 응답
 */
export interface PaginatedResponse<T> {
  status: 'success';
  data: T[];
  pagination: PaginationInfo;
  message?: string;
}

/**
 * Product API Types
 */
export interface CreateProductRequest extends TablesInsert<'products'> {}

export interface UpdateProductRequest extends TablesUpdate<'products'> {}

export interface GetProductsQuery {
  page?: string;
  limit?: string;
  projectId?: string;
  type?: Enums<'product_type'>;
  isActive?: string;
  sortBy?: 'created_at' | 'price' | 'name';
  order?: 'asc' | 'desc';
}

/**
 * Order API Types
 */
export interface CreateOrderRequest {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  shippingName?: string;
  shippingPhone?: string;
  shippingMainAddress?: string;
  shippingDetailAddress?: string;
  shippingMemo?: string;
}

export interface UpdateOrderStatusRequest {
  status: Enums<'order_status'>;
}

export interface GetOrdersQuery {
  page?: string;
  limit?: string;
  status?: Enums<'order_status'>;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Profile API Types
 */
export interface UpdateProfileRequest extends TablesUpdate<'profiles'> {}

/**
 * Log API Types
 */
export interface GetLogsQuery {
  page?: string;
  limit?: string;
  eventType?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Auth API Types
 */
export interface SendVerificationRequest {
  email: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  token: string;
  newPassword: string;
}

/**
 * Artist API Types
 */
export interface CreateArtistRequest {
  name: string;
  slug: string;
  project_id: string;
  profile_image_id: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateArtistRequest {
  name?: string;
  slug?: string;
  project_id?: string;
  profile_image_id?: string;
  description?: string;
  is_active?: boolean;
}

/**
 * Project API Types
 */
export interface CreateProjectRequest {
  name: string;
  slug: string;
  cover_image_id: string;
  description?: string;
  release_date?: string; // ISO 8601
  external_links?: {
    youtube?: string;
    spotify?: string;
    other?: string;
  };
  order_index?: number;
  is_active?: boolean;
}

export interface UpdateProjectRequest {
  name?: string;
  slug?: string;
  cover_image_id?: string;
  description?: string;
  release_date?: string;
  external_links?: {
    youtube?: string;
    spotify?: string;
    other?: string;
  };
  order_index?: number;
  is_active?: boolean;
}

export interface ReorderProjectsRequest {
  orders: Array<{
    id: string;
    order_index: number;
  }>;
}
