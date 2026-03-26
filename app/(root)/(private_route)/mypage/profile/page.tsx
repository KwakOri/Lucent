/**
 * Profile Edit Page
 *
 * 회원정보 수정 페이지
 */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { NameInput, PhoneInput, AddressInput } from "@/components/form";
import {
  useProfile,
  useRequestPhoneVerification,
  useUpdateProfile,
  useVerifyPhoneVerification,
} from "@/lib/client/hooks";
import { useToast } from "@/src/components/toast";

const PHONE_REGEX = /^010-\d{4}-\d{4}$/;

function normalizePhoneForCompare(value: string | null | undefined): string {
  return String(value || "").replace(/[^\d+]/g, "");
}

export default function ProfileEditPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const { data: profile, isLoading, error } = useProfile();
  const { mutate: updateProfile, isPending: isSaving } = useUpdateProfile();
  const {
    mutate: requestPhoneVerification,
    isPending: isRequestingPhoneVerification,
  } = useRequestPhoneVerification();
  const {
    mutate: verifyPhoneVerification,
    isPending: isVerifyingPhoneVerification,
  } = useVerifyPhoneVerification();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    main_address: "",
    detail_address: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationHint, setVerificationHint] = useState<string | null>(null);

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isDirty, setIsDirty] = useState(false);

  const profileFormData = useMemo(
    () => ({
      name: profile?.name || "",
      phone: profile?.phone || "",
      main_address: profile?.main_address || "",
      detail_address: profile?.detail_address || "",
    }),
    [profile],
  );
  const effectiveFormData = isDirty ? formData : profileFormData;
  const isPhoneChanged =
    normalizePhoneForCompare(effectiveFormData.phone) !==
    normalizePhoneForCompare(profile?.phone);
  const isPhoneVerified =
    !!profile?.is_phone_verified &&
    !isPhoneChanged &&
    normalizePhoneForCompare(effectiveFormData.phone).length > 0;
  const verificationStatusText = !effectiveFormData.phone.trim()
    ? "전화번호 미입력"
    : isPhoneVerified
      ? "인증 완료"
      : isPhoneChanged
        ? "전화번호 변경됨 (재인증 필요)"
        : "미인증";
  const verificationStatusClassName = !effectiveFormData.phone.trim()
    ? "text-neutral-500"
    : isPhoneVerified
      ? "text-emerald-600"
      : "text-amber-600";

  // 폼 변경 감지
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...(isDirty ? prev : profileFormData),
      [field]: value,
    }));
    setIsDirty(true);
    // 해당 필드 에러 제거
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 클라이언트 검증 (기본 검증은 컴포넌트에서 자동 처리)
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    // 필수 필드 확인
    if (!effectiveFormData.name.trim()) {
      errors.name = "이름을 입력해주세요";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePhoneForVerification = (): boolean => {
    const trimmedPhone = effectiveFormData.phone.trim();
    if (!trimmedPhone) {
      setValidationErrors((prev) => ({
        ...prev,
        phone: "전화번호를 입력해주세요",
      }));
      return false;
    }

    if (!PHONE_REGEX.test(trimmedPhone)) {
      setValidationErrors((prev) => ({
        ...prev,
        phone: "올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)",
      }));
      return false;
    }

    return true;
  };

  // 저장
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      // 첫 번째 에러 필드로 포커스
      const firstError = Object.keys(validationErrors)[0];
      document.getElementById(firstError)?.focus();
      return;
    }

    updateProfile(
      {
        name: effectiveFormData.name,
        phone: effectiveFormData.phone || null,
        main_address: effectiveFormData.main_address || null,
        detail_address: effectiveFormData.detail_address || null,
      },
      {
        onSuccess: () => {
          showToast("프로필이 업데이트되었습니다", { type: "success" });
          setIsDirty(false);
          router.push("/mypage");
        },
        onError: (error) => {
          console.error("Profile update failed:", error);
          showToast(error.message || "프로필 수정에 실패했습니다", {
            type: "error",
          });
        },
      },
    );
  };

  // 취소
  const handleCancel = () => {
    if (isDirty) {
      if (
        confirm("저장하지 않은 변경사항이 있습니다. 페이지를 나가시겠습니까?")
      ) {
        router.back();
      }
    } else {
      router.back();
    }
  };

  const handleRequestPhoneVerification = () => {
    if (!validatePhoneForVerification()) {
      return;
    }

    requestPhoneVerification(
      {
        phone: effectiveFormData.phone,
      },
      {
        onSuccess: (result) => {
          setVerificationHint(
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

  const handleVerifyPhone = () => {
    if (!validatePhoneForVerification()) {
      return;
    }

    const code = verificationCode.trim();
    if (!/^\d{6}$/.test(code)) {
      showToast("6자리 인증 코드를 입력해주세요", { type: "error" });
      return;
    }

    verifyPhoneVerification(
      {
        code,
        phone: effectiveFormData.phone,
      },
      {
        onSuccess: () => {
          setVerificationCode("");
          setVerificationHint(null);
          showToast("휴대폰 인증이 완료되었습니다", { type: "success" });
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
          title="프로필을 불러올 수 없습니다"
          description={
            error instanceof Error
              ? error.message
              : "프로필 정보를 불러오는 중 오류가 발생했습니다"
          }
        >
          <Link href="/mypage">
            <Button intent="primary" size="md">
              마이페이지로 돌아가기
            </Button>
          </Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            뒤로 가기
          </button>
          <h1 className="text-3xl font-bold text-text-primary">프로필 설정</h1>
          <p className="mt-2 text-text-secondary">
            회원정보를 수정할 수 있습니다
          </p>
        </div>

        {/* Profile Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-neutral-200 p-6 md:p-8"
        >
          <div className="space-y-6">
            {/* 이메일 (읽기 전용) */}
            <FormField
              label="이메일"
              htmlFor="email"
              help="이메일은 변경할 수 없습니다"
            >
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                readOnly
              />
            </FormField>

            {/* 이름 */}
            <NameInput
              id="name"
              value={effectiveFormData.name}
              onChange={(value) => handleChange("name", value)}
              required
              error={validationErrors.name}
            />

            {/* 전화번호 */}
            <PhoneInput
              id="phone"
              value={effectiveFormData.phone}
              onChange={(value) => handleChange("phone", value)}
              error={validationErrors.phone}
            />

            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    휴대폰 인증 상태
                  </p>
                  <p className={`text-sm ${verificationStatusClassName}`}>
                    {verificationStatusText}
                  </p>
                  {verificationHint && (
                    <p className="mt-1 text-xs text-text-secondary">
                      {verificationHint}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  intent="secondary"
                  size="md"
                  onClick={handleRequestPhoneVerification}
                  disabled={isRequestingPhoneVerification}
                >
                  {isRequestingPhoneVerification
                    ? "발송 중..."
                    : "인증코드 발송"}
                </Button>
              </div>
              <div className="mt-3 flex flex-col gap-2 md:flex-row">
                <Input
                  id="phone-verification-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="인증 코드 6자리"
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(
                      event.target.value.replace(/[^0-9]/g, "").slice(0, 6),
                    )
                  }
                />
                <Button
                  type="button"
                  intent="primary"
                  size="md"
                  onClick={handleVerifyPhone}
                  disabled={
                    isVerifyingPhoneVerification ||
                    verificationCode.length !== 6
                  }
                >
                  {isVerifyingPhoneVerification ? "확인 중..." : "인증 확인"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                인증 코드는 발송 후 5분간 유효하며, 하루 최대 5회 요청할 수
                있습니다.
              </p>
            </div>

            {/* 주소 */}
            <AddressInput
              mainAddressId="main_address"
              mainAddressValue={effectiveFormData.main_address}
              onMainAddressChange={(value) =>
                handleChange("main_address", value)
              }
              mainAddressError={validationErrors.main_address}
              detailAddressId="detail_address"
              detailAddressValue={effectiveFormData.detail_address}
              onDetailAddressChange={(value) =>
                handleChange("detail_address", value)
              }
              detailAddressError={validationErrors.detail_address}
              showDetailAlways
            />
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button
              type="button"
              intent="secondary"
              size="lg"
              onClick={handleCancel}
              disabled={isSaving}
              className="sm:order-1"
            >
              <X className="w-4 h-4" />
              취소
            </Button>
            <Button
              type="submit"
              intent="primary"
              size="lg"
              disabled={!isDirty || isSaving}
              className="sm:order-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
