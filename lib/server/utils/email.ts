/**
 * Email Utility (Nodemailer)
 *
 * 이메일 발송 유틸리티
 * - 회원가입 이메일 인증
 * - 비밀번호 재설정
 * - 보이스팩 구매 완료 알림
 */

import * as nodemailer from "nodemailer";

// ===== Nodemailer 설정 =====

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ===== 이메일 템플릿 =====

/**
 * 이메일 인증 템플릿 (Signup v2 - 코드 + 링크)
 */
function getVerificationEmailTemplate(params: {
  code: string;
  token: string;
}): string {
  const { code, token } = params;
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`;

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
          .code {
            font-size: 40px;
            font-weight: bold;
            color: #6366f1;
            text-align: center;
            letter-spacing: 8px;
            padding: 25px;
            background-color: #f3f4f6;
            border-radius: 8px;
            margin: 25px 0;
            font-family: 'Courier New', monospace;
          }
          .divider {
            text-align: center;
            margin: 30px 0;
            color: #9ca3af;
            font-size: 14px;
          }
          .button {
            display: inline-block;
            padding: 14px 28px;
            background-color: #6366f1;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            text-align: center;
            font-weight: 600;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            margin-top: 20px;
          }
          .notice {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
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
            <h2>안녕하세요!</h2>
            <p>Lucent Management에 가입해 주셔서 감사합니다.</p>
            <p>아래 <strong>인증 코드</strong>를 입력하여 회원가입을 완료해주세요.</p>

            <div class="code">${code}</div>

            <div class="notice">
              ⏱️ 이 인증 코드는 <strong>10분간 유효</strong>합니다.<br>
              본인이 요청하지 않은 경우 이 이메일을 무시하셔도 됩니다.
            </div>
          </div>

          <div class="footer">
            <p>© 2025 Lucent Management. All rights reserved.</p>
            <p>이 이메일은 발신 전용입니다.</p>
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
 * 이메일 인증 발송 (Signup v2 - 코드 + 링크)
 */
export async function sendVerificationEmail(params: {
  email: string;
  code: string;
  token: string;
}): Promise<void> {
  try {
    const { email, code, token } = params;

    await transporter.sendMail({
      from: `"Lucent Management" <${
        process.env.SMTP_FROM || process.env.SMTP_USER
      }>`,
      to: email,
      subject: "[Lucent Management] 이메일 인증",
      html: getVerificationEmailTemplate({ code, token }),
    });

    console.log(`[Email] 인증 이메일 발송 성공: ${email} (코드: ${code})`);
  } catch (error) {
    console.error("[Email] 인증 이메일 발송 실패:", error);
    throw new Error("이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
}

/**
 * 비밀번호 재설정 이메일 발송
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"Lucent Management" <${
        process.env.SMTP_FROM || process.env.SMTP_USER
      }>`,
      to: email,
      subject: "[Lucent Management] 비밀번호 재설정",
      html: getPasswordResetEmailTemplate(token),
    });

    console.log(`[Email] 비밀번호 재설정 이메일 발송 성공: ${email}`);
  } catch (error) {
    console.error("[Email] 비밀번호 재설정 이메일 발송 실패:", error);
    throw new Error("이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }
}

/**
 * 보이스팩 구매 완료 이메일 템플릿
 */
function getPurchaseCompleteEmailTemplate(params: {
  buyerName: string;
  productName: string;
  orderNumber: string;
  totalPrice: number;
}): string {
  const { buyerName, productName, orderNumber, totalPrice } = params;
  const mypageUrl = `${process.env.NEXT_PUBLIC_APP_URL}/mypage`;

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
          .order-info {
            background-color: #f3f4f6;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
          }
          .order-info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .order-info-row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: 600;
            color: #6b7280;
          }
          .value {
            color: #111827;
          }
          .download-steps {
            background-color: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .download-steps ol {
            margin: 10px 0;
            padding-left: 20px;
          }
          .download-steps li {
            margin: 8px 0;
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
          .notice {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Lucent Management</h1>
            <p>🎁 구매가 완료되었습니다</p>
          </div>

          <div class="content">
            <h2>안녕하세요, ${buyerName}님!</h2>
            <p>주문하신 보이스팩의 결제가 확인되었습니다.<br>
            마이페이지에서 다운로드하실 수 있습니다.</p>

            <div class="order-info">
              <div class="order-info-row">
                <span class="label">📦 상품명</span>
                <span class="value">${productName}</span>
              </div>
              <div class="order-info-row">
                <span class="label">💰 결제 금액</span>
                <span class="value">${totalPrice.toLocaleString()}원</span>
              </div>
              <div class="order-info-row">
                <span class="label">📅 주문 번호</span>
                <span class="value">${orderNumber}</span>
              </div>
            </div>

            <div class="download-steps">
              <strong>🎁 다운로드 방법</strong>
              <ol>
                <li>마이페이지 접속</li>
                <li>주문 내역에서 "다운로드" 버튼 클릭</li>
                <li>보이스팩 다운로드 완료!</li>
              </ol>
            </div>

            <div style="text-align: center;">
              <a href="${mypageUrl}" class="button">마이페이지로 이동</a>
            </div>

            <div class="notice">
              💡 <strong>언제든지 재다운로드 가능합니다</strong><br>
              마이페이지에서 횟수 제한 없이 다운로드하실 수 있습니다.
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

/**
 * 보이스팩 구매 완료 이메일 발송
 */
export async function sendPurchaseCompleteEmail(params: {
  email: string;
  buyerName: string;
  productName: string;
  orderNumber: string;
  totalPrice: number;
}): Promise<void> {
  try {
    const { email, buyerName, productName, orderNumber, totalPrice } = params;

    await transporter.sendMail({
      from: `"Lucent Management" <${
        process.env.SMTP_FROM || process.env.SMTP_USER
      }>`,
      to: email,
      subject: `[Lucent Management] ${productName} 구매가 완료되었습니다`,
      html: getPurchaseCompleteEmailTemplate({
        buyerName,
        productName,
        orderNumber,
        totalPrice,
      }),
    });

    console.log(`[Email] 구매 완료 이메일 발송 성공: ${email}`);
  } catch (error) {
    console.error("[Email] 구매 완료 이메일 발송 실패:", error);
    // 이메일 발송 실패는 주문 프로세스를 중단시키지 않음
    // 로그만 남기고 에러를 던지지 않음
  }
}

/**
 * 이메일 전송 테스트
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log("[Email] SMTP 연결 성공");
    return true;
  } catch (error) {
    console.error("[Email] SMTP 연결 실패:", error);
    return false;
  }
}
