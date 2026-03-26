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
import { PhoneInput } from "@/components/form";
import {
  useProfile,
  useRequestPhoneVerification,
  useVerifyPhoneVerification,
} from "@/lib/client/hooks";
import { useToast } from "@/src/components/toast";

const PHONE_REGEX = /^010-\d{4}-\d{4}$/;

function formatPhoneInput(value: string | null | undefined): string {
  const numbers = String(value || "").replace(/[^0-9]/g, "");
  if (numbers.length === 11 && numbers.startsWith("010")) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  }
  return String(value || "");
}

export default function PhoneVerificationPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: profile, isLoading, error } = useProfile();
  const { mutate: requestPhoneVerification, isPending: isRequesting } =
    useRequestPhoneVerification();
  const { mutate: verifyPhoneVerification, isPending: isVerifying } =
    useVerifyPhoneVerification();

  const [phoneDraft, setPhoneDraft] = useState("");
  const [isPhoneTouched, setIsPhoneTouched] = useState(false);
  const [code, setCode] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | undefined>(undefined);
  const [codeError, setCodeError] = useState<string | undefined>(undefined);

  const effectivePhone = isPhoneTouched
    ? phoneDraft
    : formatPhoneInput(profile?.phone);
  const statusText = profile?.is_phone_verified ? "인증 완료" : "미인증";
  const statusClassName = profile?.is_phone_verified
    ? "text-emerald-600"
    : "text-amber-600";
  const canSend = useMemo(
    () => PHONE_REGEX.test(effectivePhone),
    [effectivePhone],
  );

  const validatePhone = (): boolean => {
    const trimmedPhone = effectivePhone.trim();
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
      { phone: effectivePhone },
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
        phone: effectivePhone,
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
            인증할 전화번호를 입력하고 인증 코드를 확인해주세요
          </p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6 md:p-8">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-sm font-semibold text-text-primary">
              현재 인증 상태
            </p>
            <p className={`mt-1 text-sm ${statusClassName}`}>{statusText}</p>
            {profile.is_phone_verified && profile.phone && (
              <p className="mt-1 text-sm text-text-secondary">
                인증된 번호: {formatPhoneInput(profile.phone)}
              </p>
            )}
          </div>

          <div className="mt-6 space-y-4">
            <PhoneInput
              id="phone"
              value={effectivePhone}
              onChange={(value) => {
                setPhoneDraft(value);
                setIsPhoneTouched(true);
                if (phoneError) {
                  setPhoneError(undefined);
                }
              }}
              error={phoneError}
              required
              help="전화번호를 입력한 뒤 인증코드를 발송해주세요"
            />

            <div className="flex justify-end">
              <Button
                type="button"
                intent="secondary"
                size="md"
                onClick={handleRequestCode}
                disabled={isRequesting || !canSend}
              >
                {isRequesting ? "발송 중..." : "인증코드 발송"}
              </Button>
            </div>

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

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              type="button"
              intent="secondary"
              size="lg"
              onClick={() => router.push("/mypage/profile")}
            >
              취소
            </Button>
            <Button
              type="button"
              intent="primary"
              size="lg"
              onClick={handleVerifyCode}
              disabled={isVerifying || code.length !== 6}
            >
              {isVerifying ? "확인 중..." : "인증 완료"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
