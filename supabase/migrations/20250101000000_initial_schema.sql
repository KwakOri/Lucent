-- Lucent Management - Initial Schema Migration
-- Created: 2025-01-01
-- Description: MVP 1차 오픈을 위한 초기 데이터베이스 스키마

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- Product Type
CREATE TYPE product_type AS ENUM ('VOICE_PACK', 'PHYSICAL_GOODS');

-- Order Status
CREATE TYPE order_status AS ENUM ('PENDING', 'PAID', 'MAKING', 'SHIPPING', 'DONE');

-- Email Verification Purpose
CREATE TYPE verification_purpose AS ENUM ('signup', 'reset_password', 'change_email');

-- =====================================================
-- TABLES
-- =====================================================

-- Email Verifications (이메일 인증)
-- 회원가입, 비밀번호 재설정 등에 사용
CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    purpose verification_purpose NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 인덱스
    CONSTRAINT email_verifications_token_key UNIQUE (token)
);

CREATE INDEX idx_email_verifications_email ON email_verifications(email);
CREATE INDEX idx_email_verifications_token ON email_verifications(token);
CREATE INDEX idx_email_verifications_expires_at ON email_verifications(expires_at);

-- User Profiles (사용자 프로필)
-- auth.users를 확장하여 추가 정보 저장
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);

-- Projects (프로젝트)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    cover_image VARCHAR(500),
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_is_active ON projects(is_active);
CREATE INDEX idx_projects_order_index ON projects(order_index);

-- Artists (아티스트)
CREATE TABLE artists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    profile_image VARCHAR(500),
    shop_theme JSONB, -- 굿즈샵 테마 설정 (색상, 컨셉 등)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_artists_project_id ON artists(project_id);
CREATE INDEX idx_artists_slug ON artists(slug);
CREATE INDEX idx_artists_is_active ON artists(is_active);

-- Products (상품)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    type product_type NOT NULL,
    price INTEGER NOT NULL, -- 원화 단위 (예: 10000 = 10,000원)
    description TEXT,
    image_url VARCHAR(500), -- Cloudflare R2 URL
    sample_audio_url VARCHAR(500), -- 보이스팩 샘플 (Cloudflare R2)
    digital_file_url VARCHAR(500), -- 보이스팩 파일 (Cloudflare R2)
    stock INTEGER, -- 재고 (실물 굿즈용, NULL이면 무제한)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 제약조건
    CONSTRAINT products_slug_artist_unique UNIQUE (artist_id, slug),
    CONSTRAINT products_price_positive CHECK (price >= 0),
    CONSTRAINT products_stock_non_negative CHECK (stock IS NULL OR stock >= 0)
);

CREATE INDEX idx_products_artist_id ON products(artist_id);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_slug ON products(slug);

-- Orders (주문)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    order_number VARCHAR(50) NOT NULL UNIQUE, -- 주문번호 (예: ORD-20250101-0001)
    status order_status NOT NULL DEFAULT 'PENDING',
    total_price INTEGER NOT NULL,

    -- 배송 정보 (실물 굿즈용)
    shipping_name VARCHAR(100),
    shipping_phone VARCHAR(20),
    shipping_address TEXT,
    shipping_memo TEXT,

    -- 주문자 정보
    orderer_name VARCHAR(100),
    orderer_email VARCHAR(255),
    orderer_phone VARCHAR(20),

    -- 관리자 메모
    admin_memo TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 제약조건
    CONSTRAINT orders_total_price_positive CHECK (total_price >= 0)
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Order Items (주문 항목)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

    -- 주문 당시 상품 정보 스냅샷
    product_name VARCHAR(255) NOT NULL,
    product_type product_type NOT NULL,
    price_snapshot INTEGER NOT NULL, -- 주문 당시 가격
    quantity INTEGER NOT NULL DEFAULT 1,

    -- 디지털 상품 다운로드 정보
    download_url VARCHAR(500), -- Cloudflare R2 presigned URL (보이스팩용)
    download_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 제약조건
    CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT order_items_price_snapshot_non_negative CHECK (price_snapshot >= 0),
    CONSTRAINT order_items_download_count_non_negative CHECK (download_count >= 0)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles updated_at trigger
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Projects updated_at trigger
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Artists updated_at trigger
CREATE TRIGGER update_artists_updated_at
    BEFORE UPDATE ON artists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Products updated_at trigger
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Orders updated_at trigger
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Profile 자동 생성 함수 (사용자 가입 시)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.users에 새 사용자 생성 시 profile 자동 생성
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Email Verifications: 서버에서만 접근 (service_role)
CREATE POLICY "Service role can do everything on email_verifications"
    ON email_verifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Profiles: 본인만 읽기/수정 가능
CREATE POLICY "Users can view own profile"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Projects: 모든 사용자 읽기 가능
CREATE POLICY "Anyone can view active projects"
    ON projects
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "Service role can manage projects"
    ON projects
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Artists: 모든 사용자 읽기 가능
CREATE POLICY "Anyone can view active artists"
    ON artists
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "Service role can manage artists"
    ON artists
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Products: 모든 사용자 읽기 가능
CREATE POLICY "Anyone can view active products"
    ON products
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

CREATE POLICY "Service role can manage products"
    ON products
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Orders: 본인 주문만 조회 가능
CREATE POLICY "Users can view own orders"
    ON orders
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
    ON orders
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all orders"
    ON orders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Order Items: 본인 주문의 항목만 조회 가능
CREATE POLICY "Users can view own order items"
    ON order_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all order items"
    ON order_items
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE email_verifications IS '이메일 인증 토큰 저장 (회원가입, 비밀번호 재설정 등)';
COMMENT ON TABLE profiles IS '사용자 프로필 (auth.users 확장)';
COMMENT ON TABLE projects IS '프로젝트 (0th, 1st 등)';
COMMENT ON TABLE artists IS '아티스트 (미루루, Drips 등)';
COMMENT ON TABLE products IS '상품 (보이스팩, 실물 굿즈)';
COMMENT ON TABLE orders IS '주문';
COMMENT ON TABLE order_items IS '주문 항목';

COMMENT ON COLUMN products.price IS '가격 (원화, 정수형)';
COMMENT ON COLUMN products.sample_audio_url IS '보이스팩 샘플 오디오 URL (Cloudflare R2)';
COMMENT ON COLUMN products.digital_file_url IS '보이스팩 전체 파일 URL (Cloudflare R2)';
COMMENT ON COLUMN orders.order_number IS '주문번호 (예: ORD-20250101-0001)';
COMMENT ON COLUMN order_items.price_snapshot IS '주문 당시 가격 (가격 변동 추적)';
COMMENT ON COLUMN order_items.download_url IS '디지털 상품 다운로드 URL (Cloudflare R2 presigned)';
