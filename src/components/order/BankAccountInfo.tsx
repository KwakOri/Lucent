/**
 * BankAccountInfo Component
 *
 * 계좌이체 정보를 표시하는 컴포넌트
 */

"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

interface BankAccountInfoProps {
  depositorName: string;
  totalAmount: number;
}

// 계좌 정보 (환경변수로 관리하는 것이 좋음)
const BANK_INFO = {
  bank: "카카오뱅크",
  accountNumber: "3333-15-8083518",
  accountHolder: "이세영",
};

export function BankAccountInfo({
  depositorName,
  totalAmount,
}: BankAccountInfoProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("복사 실패:", err);
    }
  };

  const handleCopyAll = async () => {
    const allInfo = `
은행: ${BANK_INFO.bank}
계좌번호: ${BANK_INFO.accountNumber}
예금주: ${BANK_INFO.accountHolder}
입금액: ${totalAmount.toLocaleString()}원
입금자명: ${depositorName}
    `.trim();

    await copyToClipboard(allInfo, "all");
  };

  return (
    <section className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-6 text-white shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">💳</span>
        <h2 className="text-xl font-bold">계좌이체 정보</h2>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-3 mb-4">
        {/* 은행 */}
        <div className="flex justify-between items-center">
          <span className="text-sm opacity-90">은행</span>
          <span className="font-semibold">{BANK_INFO.bank}</span>
        </div>

        {/* 계좌번호 */}
        <div className="flex justify-between items-center">
          <span className="text-sm opacity-90">계좌번호</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">
              {BANK_INFO.accountNumber}
            </span>
            <button
              onClick={() =>
                copyToClipboard(BANK_INFO.accountNumber, "account")
              }
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              aria-label="계좌번호 복사"
            >
              {copiedField === "account" ? (
                <Check size={16} />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        </div>

        {/* 예금주 */}
        <div className="flex justify-between items-center">
          <span className="text-sm opacity-90">예금주</span>
          <span className="font-semibold">{BANK_INFO.accountHolder}</span>
        </div>

        {/* 입금 금액 */}
        <div className="flex justify-between items-center pt-3 border-t border-white/20">
          <span className="text-sm opacity-90">입금 금액</span>
          <span className="text-lg font-bold">
            {totalAmount.toLocaleString()}원
          </span>
        </div>

        {/* 입금자명 */}
        <div className="flex justify-between items-center bg-yellow-400/20 -mx-4 px-4 py-3 rounded">
          <span className="text-sm font-semibold">입금자명 (필수)</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-yellow-200">{depositorName}</span>
            <button
              onClick={() => copyToClipboard(depositorName, "depositorName")}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              aria-label="입금자명 복사"
            >
              {copiedField === "depositorName" ? (
                <Check size={16} />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 전체 복사 버튼 */}
      <Button
        onClick={handleCopyAll}
        intent="neutral"
        fullWidth
        className="bg-white/10 hover:bg-white/20 border-white/30 text-white"
      >
        {copiedField === "all" ? (
          <>
            <Check size={18} />
            복사되었습니다
          </>
        ) : (
          <>
            <Copy size={18} />
            입금 정보 전체 복사
          </>
        )}
      </Button>

      {/* 안내 메시지 */}
      <div className="mt-4 text-sm opacity-90 space-y-1">
        <p>• 입금자명은 주문자 본인 이름으로 입금해주세요</p>
        <p>• 입금 확인까지 영업일 기준 1-2일 소요됩니다</p>
      </div>
    </section>
  );
}
