/**
 * Profile Service
 *
 * 사용자 프로필 관련 비즈니스 로직
 * - 프로필 조회/수정
 * - 배송지 정보 관리
 */

import { createServerClient } from '@/lib/server/utils/supabase';
import { ApiError, NotFoundError, AuthorizationError } from '@/lib/server/utils/errors';
import { Tables, TablesUpdate } from '@/types/database';

type Profile = Tables<'profiles'>;
type ProfileUpdate = TablesUpdate<'profiles'>;

export class ProfileService {
  /**
   * 프로필 조회
   */
  static async getProfile(userId: string): Promise<Profile> {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      throw new NotFoundError('프로필을 찾을 수 없습니다', 'PROFILE_NOT_FOUND');
    }

    if (error) {
      throw new ApiError('프로필 조회 실패', 500, 'PROFILE_FETCH_FAILED');
    }

    return data;
  }

  /**
   * 프로필 수정
   */
  static async updateProfile(
    userId: string,
    requesterId: string,
    profileData: ProfileUpdate
  ): Promise<Profile> {
    // 본인 확인
    if (userId !== requesterId) {
      throw new AuthorizationError('본인의 프로필만 수정할 수 있습니다');
    }

    const supabase = await createServerClient();

    // 이메일 변경 불가 (email은 TablesUpdate<'profiles'>에서 optional이므로 구조분해 가능)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email, ...updateData } = profileData;

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new ApiError('프로필 수정 실패', 500, 'PROFILE_UPDATE_FAILED');
    }

    return data;
  }
}
