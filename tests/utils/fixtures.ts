/**
 * Test Fixtures
 *
 * 테스트에 사용할 목 데이터
 */

import type { Tables } from '@/types/database';

/**
 * Mock User
 */
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock Admin User
 */
export const mockAdminUser = {
  id: 'admin-123',
  email: 'admin@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock Session
 */
export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
};

/**
 * Mock Profile
 */
export const mockProfile: Tables<'profiles'> = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  phone: '010-1234-5678',
  main_address: null,
  detail_address: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock Product (Digital)
 */
export const mockDigitalProduct: Tables<'products'> = {
  id: 'product-digital-123',
  type: 'VOICE_PACK',
  name: 'Test Voice Pack',
  description: 'Test voice pack description',
  price: 5000,
  stock: null,
  is_active: true,
  project_id: 'project-123',
  slug: 'test-voice-pack',
  digital_file_url: 'https://example.com/files/voice-pack.zip',
  sample_audio_url: 'https://example.com/samples/voice-pack-sample.mp3',
  main_image_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock Product (Physical)
 */
export const mockPhysicalProduct: Tables<'products'> = {
  id: 'product-physical-123',
  type: 'PHYSICAL_GOODS',
  name: 'Test Photocard Set',
  description: 'Test photocard description',
  price: 15000,
  stock: 100,
  is_active: true,
  project_id: 'project-123',
  slug: 'test-photocard-set',
  digital_file_url: null,
  sample_audio_url: null,
  main_image_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock Order
 */
export const mockOrder: Tables<'orders'> = {
  id: 'order-123',
  user_id: 'user-123',
  order_number: 'ORD-20240101-001',
  status: 'PENDING',
  total_price: 20000,
  buyer_email: null,
  buyer_name: null,
  buyer_phone: null,
  shipping_name: 'Test User',
  shipping_phone: '010-1234-5678',
  shipping_main_address: 'Test Main Address',
  shipping_detail_address: 'Test Detail Address',
  shipping_memo: null,
  admin_memo: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock Order Item
 */
export const mockOrderItem: Tables<'order_items'> = {
  id: 'order-item-123',
  order_id: 'order-123',
  product_id: 'product-digital-123',
  product_name: 'Test Voice Pack',
  product_type: 'VOICE_PACK',
  quantity: 1,
  price_snapshot: 5000,
  download_url: null,
  download_count: 0,
  item_status: 'PENDING',
  last_downloaded_at: null,
  created_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock Log
 */
export const mockLog: Tables<'logs'> = {
  id: 'log-123',
  event_category: 'auth',
  event_type: 'signup',
  message: 'User signed up successfully',
  severity: 'info',
  user_id: 'user-123',
  admin_id: null,
  resource_id: null,
  resource_type: null,
  request_path: null,
  ip_address: '127.0.0.1',
  user_agent: 'Mozilla/5.0',
  metadata: null,
  changes: null,
  created_at: '2024-01-01T00:00:00Z',
};
