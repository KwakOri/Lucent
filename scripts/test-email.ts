/**
 * Email Configuration Test Script
 *
 * SMTP 설정이 올바른지 확인하는 스크립트
 *
 * 사용법:
 * 1. .env.local 파일에서 SMTP 설정 완료
 * 2. npx tsx scripts/test-email.ts 실행
 */

import { testEmailConnection, sendVerificationEmail } from '@/lib/server/utils/email';

async function testEmail() {
  console.log('📧 이메일 설정 테스트를 시작합니다...\n');

  // 1. SMTP 연결 테스트
  console.log('1️⃣ SMTP 서버 연결 테스트 중...');
  const isConnected = await testEmailConnection();

  if (!isConnected) {
    console.error('❌ SMTP 연결 실패');
    console.log('\n다음을 확인해주세요:');
    console.log('  - .env.local 파일에 SMTP 설정이 올바른지 확인');
    console.log('  - Gmail 사용 시 "앱 비밀번호"를 사용하고 있는지 확인');
    console.log('  - SMTP_HOST, SMTP_PORT가 올바른지 확인');
    process.exit(1);
  }

  console.log('✅ SMTP 서버 연결 성공!\n');

  // 2. 테스트 이메일 발송 (선택사항)
  const testEmailAddress = process.argv[2];

  if (testEmailAddress) {
    console.log(`2️⃣ 테스트 이메일 발송 중... (수신: ${testEmailAddress})`);
    try {
      await sendVerificationEmail({
        email: testEmailAddress,
        code: '123456',
        token: 'TEST123',
      });
      console.log('✅ 테스트 이메일 발송 성공!');
      console.log(`📬 ${testEmailAddress}에서 이메일을 확인해주세요.\n`);
    } catch (error) {
      console.error('❌ 테스트 이메일 발송 실패:', error);
      process.exit(1);
    }
  } else {
    console.log('💡 이메일 주소를 입력하면 테스트 이메일을 발송할 수 있습니다:');
    console.log('   npx tsx scripts/test-email.ts your-email@example.com\n');
  }

  console.log('🎉 이메일 설정이 완료되었습니다!');
}

testEmail().catch((error) => {
  console.error('예상치 못한 오류:', error);
  process.exit(1);
});
