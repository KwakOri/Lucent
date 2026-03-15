/**
 * AddressInput Component
 *
 * 주소 입력 공통 컴포넌트
 * - Kakao 주소 검색 API 연동
 * - 기본 주소(검색) + 상세 주소 통합 관리
 * - 모달 시스템 통합
 */

"use client";

import { AddressSearchModal } from "@/components/order/AddressSearchModal";
import { useModal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { AddressSearchResult } from "@/types/address";
import { Search } from "lucide-react";

export interface AddressInputProps {
  /**
   * 기본 주소 Input id
   */
  mainAddressId: string;
  /**
   * 기본 주소 Input name attribute
   */
  mainAddressName?: string;
  /**
   * 기본 주소 Label text
   */
  mainAddressLabel?: string;
  /**
   * 기본 주소 현재 값
   */
  mainAddressValue: string;
  /**
   * 기본 주소 변경 핸들러
   */
  onMainAddressChange: (value: string) => void;
  /**
   * 기본 주소 외부 에러 메시지
   */
  mainAddressError?: string;

  /**
   * 상세 주소 Input id
   */
  detailAddressId: string;
  /**
   * 상세 주소 Input name attribute
   */
  detailAddressName?: string;
  /**
   * 상세 주소 Label text
   */
  detailAddressLabel?: string;
  /**
   * 상세 주소 현재 값
   */
  detailAddressValue: string;
  /**
   * 상세 주소 변경 핸들러
   */
  onDetailAddressChange: (value: string) => void;
  /**
   * 상세 주소 외부 에러 메시지
   */
  detailAddressError?: string;
  /**
   * 상세 주소 input 추가 className
   */
  detailAddressInputClassName?: string;

  /**
   * 필수 필드 여부
   */
  required?: boolean;
  /**
   * 기본 주소 없어도 상세 주소 필드 표시
   */
  showDetailAlways?: boolean;
  /**
   * 비활성화 상태
   */
  disabled?: boolean;
  /**
   * 검색 버튼 텍스트
   */
  searchButtonText?: string;
}

export function AddressInput({
  mainAddressId,
  mainAddressName,
  mainAddressLabel = "주소",
  mainAddressValue,
  onMainAddressChange,
  mainAddressError,

  detailAddressId,
  detailAddressName,
  detailAddressLabel = "상세 주소",
  detailAddressValue,
  onDetailAddressChange,
  detailAddressError,
  detailAddressInputClassName,

  required = false,
  showDetailAlways = false,
  disabled = false,
  searchButtonText = "주소 검색",
}: AddressInputProps) {
  const { openModal, renderModal } = useModal();

  const handleSearchClick = async () => {
    try {
      const address = await openModal<AddressSearchResult>(AddressSearchModal);

      // 도로명 주소가 있으면 도로명 우선, 없으면 지번 주소 사용
      const selectedAddress = address.roadAddress || address.jibunAddress;
      const fullAddress = address.zonecode
        ? `[${address.zonecode}] ${selectedAddress}`
        : selectedAddress;

      onMainAddressChange(fullAddress);
    } catch {
      // 모달이 취소된 경우 (onAbort 호출)
      // 아무 작업도 하지 않음
    }
  };

  const showDetailField = showDetailAlways || mainAddressValue.trim() !== "";

  return (
    <>
      {/* 기본 주소 */}
      <FormField
        label={mainAddressLabel}
        htmlFor={mainAddressId}
        required={required}
        error={mainAddressError}
        help={
          !mainAddressError
            ? "주소 검색 버튼을 눌러 주소를 선택하세요"
            : undefined
        }
      >
        <div className="space-y-2">
          <Button
            type="button"
            intent="neutral"
            size="md"
            onClick={handleSearchClick}
            disabled={disabled}
            className="w-full"
          >
            <Search size={18} />
            <span className="ml-2">{searchButtonText}</span>
          </Button>
          <Input
            id={mainAddressId}
            name={mainAddressName || mainAddressId}
            placeholder="주소 검색 버튼을 눌러 주소를 선택하세요"
            value={mainAddressValue}
            readOnly
            disabled={disabled}
            error={!!mainAddressError}
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>
      </FormField>

      {/* 상세 주소 */}
      {showDetailField && (
        <FormField
          label={detailAddressLabel}
          htmlFor={detailAddressId}
          required={required}
          error={detailAddressError}
          help={
            !detailAddressError
              ? "동/호수 등 상세 주소를 입력하세요"
              : undefined
          }
        >
          <Input
            id={detailAddressId}
            name={detailAddressName || detailAddressId}
            type="text"
            value={detailAddressValue}
            onChange={(e) => onDetailAddressChange(e.target.value)}
            placeholder="예: 101동 202호"
            error={!!detailAddressError}
            disabled={disabled}
            className={detailAddressInputClassName}
          />
        </FormField>
      )}

      {/* 모달 렌더링 */}
      {renderModal()}
    </>
  );
}
