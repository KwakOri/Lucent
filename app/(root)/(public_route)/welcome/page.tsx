"use client";

import { AddressInput, NameInput, PhoneInput } from "@/components/form";
import { Button } from "@/components/ui/button";
import { useUpdateProfile } from "@/hooks";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function WelcomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [mainAddress, setMainAddress] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    detailAddress?: string;
    general?: string;
  }>({});

  const { mutate: updateProfile, isPending: isSaving } = useUpdateProfile();

  // 폼 검증
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // 이름, 전화번호 검증은 NameInput, PhoneInput 컴포넌트에서 자동 처리

    // 상세 주소 검증 (메인 주소를 입력한 경우에만 필수)
    if (mainAddress && !detailAddress.trim()) {
      newErrors.detailAddress = "상세 주소를 입력해주세요";
    } else if (detailAddress && detailAddress.length < 2) {
      newErrors.detailAddress = "상세 주소를 2자 이상 입력해주세요";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 저장 및 시작하기
  const handleSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setErrors({});

    // 프로필 업데이트 (useUpdateProfile 훅 사용)
    updateProfile(
      {
        name: name || null,
        phone: phone || null,
        main_address: mainAddress || null,
        detail_address: detailAddress || null,
      },
      {
        onSuccess: () => {
          // 성공 시 메인 페이지로 이동
          router.push("/");
        },
        onError: (error) => {
          setErrors({
            general: error.message || "프로필 업데이트에 실패했습니다",
          });
        },
      }
    );
  };

  // 건너뛰기
  const handleSkip = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-[500px]">
        <div className="bg-white rounded-lg border border-neutral-200 p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-text-primary">
              환영합니다!
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              프로필 정보를 입력하면 더 편리하게 이용할 수 있어요
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              (나중에 마이페이지에서도 입력 가능합니다)
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-5">
            {/* General Error */}
            {errors.general && (
              <div
                className="p-4 rounded-lg bg-error-100 text-error-600 text-sm"
                role="alert"
              >
                {errors.general}
              </div>
            )}

            {/* Name Field (Optional) */}
            <NameInput
              id="name"
              name="name"
              value={name}
              onChange={setName}
              placeholder="이름을 입력하세요"
              error={errors.name}
              disabled={isSaving}
              disableValidation
            />

            {/* Phone Field (Optional) */}
            <PhoneInput
              id="phone"
              name="phone"
              value={phone}
              onChange={setPhone}
              placeholder="010-1234-5678"
              error={errors.phone}
              disabled={isSaving}
              disableValidation
              help="선택 입력 (예: 010-1234-5678)"
            />

            {/* Address Field (Optional) */}
            {/* Address Input */}
            <AddressInput
              mainAddressId="mainAddress"
              mainAddressLabel="주소"
              mainAddressValue={mainAddress}
              onMainAddressChange={setMainAddress}
              detailAddressId="detailAddress"
              detailAddressValue={detailAddress}
              onDetailAddressChange={(value) => {
                setDetailAddress(value);
                setErrors({ ...errors, detailAddress: undefined });
              }}
              detailAddressError={errors.detailAddress}
              showDetailAlways={false}
              disabled={isSaving}
            />

            {/* Buttons */}
            <div className="flex flex-col gap-3 mt-8">
              {/* Save Button */}
              <Button
                type="submit"
                intent="primary"
                fullWidth
                loading={isSaving}
              >
                {isSaving ? "저장 중..." : "저장하고 시작하기"}
              </Button>

              {/* Skip Button */}
              <Button
                type="button"
                intent="secondary"
                fullWidth
                onClick={handleSkip}
                disabled={isSaving}
              >
                건너뛰기
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
