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
  full_name: 'Test User',
  phone: '010-1234-5678',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock Product (Digital)
 */
export const mockDigitalProduct: Tables<'products'> = {
  id: 'product-digital-123',
  type: 'digital',
  name: 'Test Voice Pack',
  description: 'Test voice pack description',
  price: 5000,
  stock: null,
  is_active: true,
  artist_id: 'miruru',
  category: 'voice_pack',
  file_url: 'https://example.com/files/voice-pack.zip',
  sample_url: 'https://example.com/samples/voice-pack-sample.mp3',
  thumbnail_url: 'https://example.com/images/voice-pack.jpg',
  images: ['https://example.com/images/voice-pack-1.jpg'],
  metadata: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock Product (Physical)
 */
export const mockPhysicalProduct: Tables<'products'> = {
  id: 'product-physical-123',
  type: 'physical',
  name: 'Test Photocard Set',
  description: 'Test photocard description',
  price: 15000,
  stock: 100,
  is_active: true,
  artist_id: 'miruru',
  category: 'photocard',
  file_url: null,
  sample_url: null,
  thumbnail_url: 'https://example.com/images/photocard.jpg',
  images: ['https://example.com/images/photocard-1.jpg'],
  metadata: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock Order
 */
export const mockOrder: Tables<'orders'> = {
  id: 'order-123',
  user_id: 'user-123',
  status: 'pending_payment',
  total_amount: 20000,
  shipping_name: 'Test User',
  shipping_phone: '010-1234-5678',
  shipping_address: 'Test Address',
  shipping_zipcode: '12345',
  shipping_memo: null,
  payment_method: 'bank_transfer',
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
  quantity: 1,
  price: 5000,
  download_url: null,
  download_count: 0,
  download_expires_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock Log
 */
export const mockLog: Tables<'logs'> = {
  id: 'log-123',
  event_category: 'auth',
  event_type: 'signup',
  severity: 'info',
  user_id: 'user-123',
  admin_id: null,
  ip_address: '127.0.0.1',
  user_agent: 'Mozilla/5.0',
  metadata: null,
  created_at: '2024-01-01T00:00:00Z',
};
