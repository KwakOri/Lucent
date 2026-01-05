/**
 * Product Service
 *
 * 상품 관련 비즈니스 로직
 * - 상품 목록/상세 조회
 * - 상품 생성/수정/삭제 (관리자)
 * - 재고 관리
 */

import { createServerClient } from '@/lib/server/utils/supabase';
import { ApiError, NotFoundError } from '@/lib/server/utils/errors';
import { Tables, TablesInsert, TablesUpdate, Enums } from '@/types/database';

type Product = Tables<'products'>;
type ProductInsert = TablesInsert<'products'>;
type ProductUpdate = TablesUpdate<'products'>;
type ProductType = Enums<'product_type'>;

interface GetProductsOptions {
  page?: number;
  limit?: number;
  projectId?: string;
  type?: ProductType;
  isActive?: boolean;
  sortBy?: 'created_at' | 'price' | 'name';
  order?: 'asc' | 'desc';
}

export interface ProductWithDetails extends Product {
  project?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  } | null;
  main_image?: {
    id: string;
    r2_key: string;
    public_url: string;
    cdn_url: string | null;
    alt_text: string | null;
  } | null;
  gallery_images?: Array<{
    display_order: number;
    image: {
      id: string;
      r2_key: string;
      public_url: string;
      cdn_url: string | null;
      alt_text: string | null;
    } | null;
  }>;
}

export class ProductService {
  /**
   * 상품 목록 조회
   */
  static async getProducts(
    options: GetProductsOptions = {}
  ): Promise<{ products: ProductWithDetails[]; total: number }> {
    const supabase = await createServerClient();
    const {
      page = 1,
      limit = 20,
      projectId,
      type,
      isActive = true,
      sortBy = 'created_at',
      order = 'desc',
    } = options;

    let query = supabase
      .from('products')
      .select(
        `
        id,
        name,
        slug,
        description,
        price,
        type,
        stock,
        is_active,
        project_id,
        main_image_id,
        sample_audio_url,
        created_at,
        updated_at,
        project:projects (
          id,
          name,
          slug
        ),
        main_image:images!products_main_image_id_fkey (
          id,
          r2_key,
          public_url,
          cdn_url,
          alt_text
        )
      `,
        { count: 'exact' }
      );

    // 필터링
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    // 정렬
    query = query.order(sortBy, { ascending: order === 'asc' });

    // 페이지네이션
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw new ApiError(
        `상품 목록 조회 실패: ${error.message}`,
        500,
        'PRODUCTS_FETCH_FAILED'
      );
    }

    return {
      products: data as ProductWithDetails[],
      total: count || 0,
    };
  }

  /**
   * 상품 상세 조회
   *
   * 보안: digital_file_url은 제외 (구매자만 다운로드 API를 통해 접근 가능)
   */
  static async getProductById(id: string): Promise<ProductWithDetails> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('products')
      .select(
        `
        id,
        name,
        slug,
        description,
        price,
        type,
        stock,
        is_active,
        project_id,
        main_image_id,
        sample_audio_url,
        created_at,
        updated_at,
        project:projects (
          id,
          name,
          slug,
          description
        ),
        main_image:images!products_main_image_id_fkey (
          id,
          r2_key,
          public_url,
          cdn_url,
          alt_text
        ),
        gallery_images:product_images!product_images_product_id_fkey (
          display_order,
          image:images!product_images_image_id_fkey (
            id,
            r2_key,
            public_url,
            cdn_url,
            alt_text
          )
        )
      `
      )
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') {
      throw new NotFoundError('상품을 찾을 수 없습니다', 'PRODUCT_NOT_FOUND');
    }

    if (error) {
      console.error('Product fetch error:', error);
      throw new ApiError('상품 조회 실패', 500, 'PRODUCT_FETCH_FAILED');
    }

    return data as ProductWithDetails;
  }

  /**
   * 여러 상품을 ID 목록으로 조회 (장바구니용)
   *
   * 보안: digital_file_url은 제외
   */
  static async getProductsByIds(ids: string[]): Promise<ProductWithDetails[]> {
    if (ids.length === 0) return [];

    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('products')
      .select(
        `
        id,
        name,
        slug,
        description,
        price,
        type,
        stock,
        is_active,
        project_id,
        main_image_id,
        sample_audio_url,
        created_at,
        updated_at,
        project:projects (
          id,
          name,
          slug
        ),
        main_image:images!products_main_image_id_fkey (
          id,
          r2_key,
          public_url,
          cdn_url,
          alt_text
        )
      `
      )
      .in('id', ids)
      .eq('is_active', true);

    if (error) {
      console.error('Products fetch error:', error);
      throw new ApiError('상품 조회 실패', 500, 'PRODUCTS_FETCH_FAILED');
    }

    return (data || []) as ProductWithDetails[];
  }

  /**
   * Slug로 상품 조회
   *
   * 보안: digital_file_url은 제외
   */
  static async getProductBySlug(slug: string): Promise<ProductWithDetails> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('products')
      .select(
        `
        id,
        name,
        slug,
        description,
        price,
        type,
        stock,
        is_active,
        project_id,
        main_image_id,
        sample_audio_url,
        created_at,
        updated_at,
        project:projects (
          id,
          name,
          slug
        ),
        main_image:images!products_main_image_id_fkey (
          id,
          r2_key,
          public_url,
          cdn_url,
          alt_text
        )
      `
      )
      .eq('slug', slug)
      .single();

    if (error && error.code === 'PGRST116') {
      throw new NotFoundError('상품을 찾을 수 없습니다', 'PRODUCT_NOT_FOUND');
    }

    if (error) {
      console.error('Product fetch by slug error:', error);
      throw new ApiError('상품 조회 실패', 500, 'PRODUCT_FETCH_FAILED');
    }

    return data as ProductWithDetails;
  }

  /**
   * 상품 생성 (관리자)
   */
  static async createProduct(
    productData: ProductInsert,
    adminId: string
  ): Promise<Product> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) {
      throw new ApiError('상품 생성 실패', 500, 'PRODUCT_CREATE_FAILED');
    }

    // TODO: 로그 기록 (관리자 작업)
    // await LogService.logProductCreated(data.id, adminId, data.name);

    return data;
  }

  /**
   * 상품 수정 (관리자)
   */
  static async updateProduct(
    id: string,
    productData: ProductUpdate,
    adminId: string
  ): Promise<Product> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    if (error && error.code === 'PGRST116') {
      throw new NotFoundError('상품을 찾을 수 없습니다', 'PRODUCT_NOT_FOUND');
    }

    if (error) {
      throw new ApiError('상품 수정 실패', 500, 'PRODUCT_UPDATE_FAILED');
    }

    // TODO: 로그 기록 (관리자 작업)

    return data;
  }

  /**
   * 상품 삭제 (관리자)
   */
  static async deleteProduct(id: string, adminId: string): Promise<void> {
    const supabase = await createServerClient();

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      throw new ApiError('상품 삭제 실패', 500, 'PRODUCT_DELETE_FAILED');
    }

    // TODO: 로그 기록 (관리자 작업)
  }

  /**
   * 재고 업데이트 (관리자)
   */
  static async updateStock(
    id: string,
    stock: number,
    adminId: string
  ): Promise<Product> {
    const supabase = await createServerClient();

    // 기존 재고 조회
    const { data: product } = await supabase
      .from('products')
      .select('stock')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('products')
      .update({ stock })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new ApiError('재고 업데이트 실패', 500, 'STOCK_UPDATE_FAILED');
    }

    // TODO: 로그 기록 (재고 변경)
    // if (product) {
    //   await LogService.logStockChanged(id, adminId, product.stock, stock);
    // }

    return data;
  }

  /**
   * 상품 통계 조회 (관리자용)
   */
  static async getProductsStats(): Promise<{
    activeProducts: number;
  }> {
    const supabase = await createServerClient();

    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (error) {
      throw new ApiError('상품 통계 조회 실패', 500, 'PRODUCTS_STATS_FETCH_FAILED');
    }

    return {
      activeProducts: count || 0,
    };
  }
}
