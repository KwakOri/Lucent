-- Lucent Management - Seed Data
-- Created: 2025-01-01
-- Description: MVP 1차 오픈을 위한 초기 데이터

-- =====================================================
-- PROJECTS
-- =====================================================

INSERT INTO projects (id, name, slug, description, order_index, is_active)
VALUES
    (
        '00000000-0000-0000-0000-000000000001'::uuid,
        '0th Project',
        '0th-project',
        '루센트 매니지먼트의 첫 번째 프로젝트. 따뜻하고 포근한 목소리로 일상의 감정을 전달합니다.',
        0,
        true
    ),
    (
        '00000000-0000-0000-0000-000000000002'::uuid,
        '1st Project',
        '1st-project',
        '루센트 매니지먼트의 두 번째 프로젝트. 다양한 색깔의 목소리가 모여 새로운 이야기를 만듭니다.',
        1,
        true
    );

-- =====================================================
-- ARTISTS
-- =====================================================

-- 0th Project: 미루루
INSERT INTO artists (id, project_id, name, slug, description, shop_theme, is_active)
VALUES
    (
        '10000000-0000-0000-0000-000000000001'::uuid,
        '00000000-0000-0000-0000-000000000001'::uuid,
        '미루루',
        'miruru',
        '포근하고 다정한 동물의 숲 같은 목소리. 일상의 작은 순간들을 함께 나누는 친구.',
        '{
            "primaryColor": "#A8D5E2",
            "secondaryColor": "#E3F2FD",
            "concept": "포근하고 다정한 동물의 숲",
            "mood": "말랑말랑한 파스텔 하늘색"
        }'::jsonb,
        true
    );

-- 1st Project: Drips (아티스트 정보 미정이므로 플레이스홀더)
INSERT INTO artists (id, project_id, name, slug, description, shop_theme, is_active)
VALUES
    (
        '10000000-0000-0000-0000-000000000002'::uuid,
        '00000000-0000-0000-0000-000000000002'::uuid,
        'Drips Member A',
        'drips-a',
        'Drips 프로젝트의 첫 번째 멤버',
        '{
            "primaryColor": "#000000",
            "secondaryColor": "#FFFFFF",
            "concept": "미정",
            "mood": "미정"
        }'::jsonb,
        false -- 2차 확장 시 활성화
    ),
    (
        '10000000-0000-0000-0000-000000000003'::uuid,
        '00000000-0000-0000-0000-000000000002'::uuid,
        'Drips Member B',
        'drips-b',
        'Drips 프로젝트의 두 번째 멤버',
        '{
            "primaryColor": "#000000",
            "secondaryColor": "#FFFFFF",
            "concept": "미정",
            "mood": "미정"
        }'::jsonb,
        false -- 2차 확장 시 활성화
    );

-- =====================================================
-- SAMPLE PRODUCTS (미루루 보이스팩 샘플)
-- =====================================================

-- 실제 상품은 관리자가 추가하므로 샘플만 제공
-- 아래는 테스트용 데이터이며, 실제 운영 시 삭제 또는 수정 필요

INSERT INTO products (id, artist_id, name, slug, type, price, description, is_active)
VALUES
    (
        '20000000-0000-0000-0000-000000000001'::uuid,
        '10000000-0000-0000-0000-000000000001'::uuid,
        '미루루 보이스팩 Vol.1 - 일상의 따뜻함',
        'miruru-voicepack-vol1',
        'VOICE_PACK',
        15000,
        '일상 속 다정한 순간들을 담은 첫 번째 보이스팩입니다. 아침 인사부터 잘자 인사까지, 하루를 함께하는 30개의 보이스가 담겨있어요.',
        true
    ),
    (
        '20000000-0000-0000-0000-000000000002'::uuid,
        '10000000-0000-0000-0000-000000000001'::uuid,
        '미루루 아크릴 스탠드',
        'miruru-acrylic-stand',
        'PHYSICAL_GOODS',
        12000,
        '미루루의 귀여운 모습을 담은 아크릴 스탠드입니다. 크기: 10cm x 15cm',
        true
    );

-- =====================================================
-- NOTES
-- =====================================================

-- 1. 실제 이미지 URL, 오디오 URL은 Cloudflare R2 업로드 후 업데이트 필요
-- 2. Drips 아티스트 정보는 2차 확장 시 업데이트
-- 3. 실제 상품 데이터는 관리자 대시보드에서 등록
-- 4. 테스트용 샘플 상품은 운영 전 삭제 또는 비활성화 필요
