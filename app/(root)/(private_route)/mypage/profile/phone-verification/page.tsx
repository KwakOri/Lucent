/**
 * Phone Verification Page
 *
 * 전화번호 인증 전용 페이지
 */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useProfile,
  useRequestPhoneVerification,
  useVerifyPhoneVerification,
} from "@/lib/client/hooks";
import { useToast } from "@/src/components/toast";

const PHONE_REGEX = /^010-\d{4}-\d{4}$/;

function formatPhoneValue(value: string): string {
  const numbers = value.replace(/[^0-9]/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  if (numbers.length === 11 && numbers.startsWith("010")) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  }
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
}

export default function PhoneVerificationPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: profile, isLoading, error } = useProfile();
  const { mutate: requestPhoneVerification, isPending: isRequesting } =
    useRequestPhoneVerification();
  const { mutate: verifyPhoneVerification, isPending: isVerifying } =
    useVerifyPhoneVerification();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | undefined>(undefined);
  const [codeError, setCodeError] = useState<string | undefined>(undefined);

  const canSend = useMemo(() => PHONE_REGEX.test(phone), [phone]);

  const validatePhone = (): boolean => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setPhoneError("전화번호를 입력해주세요");
      return false;
    }
    if (!PHONE_REGEX.test(trimmedPhone)) {
      setPhoneError("올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)");
      return false;
    }
    setPhoneError(undefined);
    return true;
  };

  const handleRequestCode = () => {
    if (!validatePhone()) {
      return;
    }

    requestPhoneVerification(
      { phone },
      {
        onSuccess: (result) => {
          setHint(
            `인증 코드를 발송했습니다. 5분 이내 입력해주세요. (오늘 남은 요청 ${result.remainingRequests}회)`,
          );
          showToast("휴대폰 인증 코드가 발송되었습니다", { type: "success" });
        },
        onError: (requestError) => {
          showToast(
            requestError.message || "휴대폰 인증 코드 발송에 실패했습니다",
            { type: "error" },
          );
        },
      },
    );
  };

  const handleVerifyCode = () => {
    if (!validatePhone()) {
      return;
    }

    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setCodeError("6자리 인증 코드를 입력해주세요");
      return;
    }
    setCodeError(undefined);

    verifyPhoneVerification(
      {
        phone,
        code: trimmedCode,
      },
      {
        onSuccess: () => {
          showToast("휴대폰 인증이 완료되었습니다", { type: "success" });
          router.push("/mypage/profile");
        },
        onError: (verifyError) => {
          showToast(verifyError.message || "휴대폰 인증에 실패했습니다", {
            type: "error",
          });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loading size="lg" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <EmptyState
          title="정보를 불러올 수 없습니다"
          description={
            error instanceof Error
              ? error.message
              : "전화번호 인증 정보를 불러오는 중 오류가 발생했습니다"
          }
        >
          <Link href="/mypage/profile">
            <Button intent="primary" size="md">
              회원정보로 돌아가기
            </Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            뒤로 가기
          </button>
          <h1 className="text-3xl font-bold text-text-primary">
            전화번호 인증
          </h1>
          <p className="mt-2 text-text-secondary">
            전화번호와 인증 코드를 입력해주세요
          </p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6 md:p-8">
          <div className="space-y-4">
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(event) => {
                setPhone(formatPhoneValue(event.target.value));
                if (phoneError) {
                  setPhoneError(undefined);
                }
              }}
              placeholder="전화번호를 입력해주세요 (예: 010-0000-0000)"
              error={!!phoneError}
            />
            {phoneError && (
              <p className="text-sm text-error-600">{phoneError}</p>
            )}

            <Button
              type="button"
              intent="secondary"
              size="md"
              onClick={handleRequestCode}
              disabled={isRequesting || !canSend}
              fullWidth
            >
              {isRequesting ? "발송 중..." : "인증코드 발송"}
            </Button>

            <FormField
              label="인증 코드"
              htmlFor="verification-code"
              required
              error={codeError}
              help={
                !codeError
                  ? "인증 코드는 발송 후 5분간 유효하며, 하루 최대 5회 요청할 수 있습니다."
                  : undefined
              }
            >
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => {
                  setCode(
                    event.target.value.replace(/[^0-9]/g, "").slice(0, 6),
                  );
                  if (codeError) {
                    setCodeError(undefined);
                  }
                }}
                placeholder="인증 코드 6자리"
                error={!!codeError}
              />
            </FormField>

            {hint && <p className="text-sm text-text-secondary">{hint}</p>}
          </div>

          <div className="mt-8">
            <Button
              type="button"
              intent="primary"
              size="md"
              onClick={handleVerifyCode}
              disabled={isVerifying || code.length !== 6}
              fullWidth
            >
              {isVerifying ? "확인 중..." : "인증 완료"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
