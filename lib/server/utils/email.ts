/**
 * Email Utility (Nodemailer)
 *
 * 이메일 발송 유틸리티
 * - 회원가입 이메일 인증
 * - 비밀번호 재설정
 * - 주문 알림 (2차 확장)
 */

import * as nodemailer from 'nodemailer';

// ===== Nodemailer 설정 =====

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ===== 이메일 템플릿 =====

/**
 * 이메일 인증 템플릿
 */
function getVerificationEmailTemplate(token: string): string {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #6366f1;
            margin: 0;
          }
          .content {
            background-color: white;
            border-radius: 6px;
            padding: 25px;
            margin-bottom: 20px;
          }
          .token {
            font-size: 32px;
            font-weight: bold;
            color: #6366f1;
            text-align: center;
            letter-spacing: 4px;
            padding: 20px;
            background-color: #f3f4f6;
            border-radius: 6px;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #6366f1;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            text-align: center;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Lucent Management</h1>
            <p>이메일 인증</p>
          </div>

          <div class="content">
            <h2>안녕하세요,</h2>
            <p>Lucent Management에 가입해 주셔서 감사합니다.</p>
            <p>아래 인증 코드를 입력하여 회원가입을 완료해주세요.</p>

            <div class="token">${token}</div>

            <p>또는 아래 버튼을 클릭하여 인증을 완료할 수 있습니다:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">이메일 인증하기</a>
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              이 인증 코드는 10분간 유효합니다.<br>
              본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.
            </p>
          </div>

          <div class="footer">
            <p>© 2025 Lucent Management. All rights reserved.</p>
            <p>이 이메일은 발신 전용입니다. 답장하지 마세요.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * 비밀번호 재설정 템플릿
 */
function getPasswordResetEmailTemplate(token: string): string {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #6366f1;
            margin: 0;
          }
          .content {
            background-color: white;
            border-radius: 6px;
            padding: 25px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #6366f1;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            text-align: center;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            margin-top: 20px;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Lucent Management</h1>
            <p>비밀번호 재설정</p>
          </div>

          <div class="content">
            <h2>비밀번호 재설정 요청</h2>
            <p>비밀번호 재설정을 요청하셨습니다.</p>
            <p>아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">비밀번호 재설정하기</a>
            </div>

            <div class="warning">
              <strong>⚠️ 보안 안내</strong><br>
              이 링크는 10분간만 유효합니다.<br>
              본인이 요청하지 않은 경우, 즉시 이 이메일을 삭제하고 고객센터에 문의해주세요.
            </div>
          </div>

          <div class="footer">
            <p>© 2025 Lucent Management. All rights reserved.</p>
            <p>이 이메일은 발신 전용입니다. 답장하지 마세요.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ===== 이메일 발송 함수 =====

/**
 * 이메일 인증 발송
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"Lucent Management" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: '[Lucent Management] 이메일 인증',
      html: getVerificationEmailTemplate(token),
    });

    console.log(`[Email] 인증 이메일 발송 성공: ${email}`);
  } catch (error) {
    console.error('[Email] 인증 이메일 발송 실패:', error);
    throw new Error('이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}

/**
 * 비밀번호 재설정 이메일 발송
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"Lucent Management" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: '[Lucent Management] 비밀번호 재설정',
      html: getPasswordResetEmailTemplate(token),
    });

    console.log(`[Email] 비밀번호 재설정 이메일 발송 성공: ${email}`);
  } catch (error) {
    console.error('[Email] 비밀번호 재설정 이메일 발송 실패:', error);
    throw new Error('이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}

/**
 * 이메일 전송 테스트
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('[Email] SMTP 연결 성공');
    return true;
  } catch (error) {
    console.error('[Email] SMTP 연결 실패:', error);
    return false;
  }
}
