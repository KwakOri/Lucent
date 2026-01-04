/**
 * PhoneInput Component
 *
 * 전화번호 입력 공통 컴포넌트
 * - 자동 하이픈 추가 (010-1234-5678)
 * - 전화번호 형식 검증
 */

"use client";

import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useMemo } from "react";

export interface PhoneInputProps {
  /**
   * Input id (htmlFor와 연결)
   */
  id: string;
  /**
   * Input name attribute
   */
  name?: string;
  /**
   * Label text
   */
  label?: string;
  /**
   * 현재 값
   */
  value: string;
  /**
   * 값 변경 핸들러
   */
  onChange: (value: string) => void;
  /**
   * 필수 필드 여부
   */
  required?: boolean;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * 외부 에러 메시지 (선택사항)
   */
  error?: string;
  /**
   * 자동 검증 비활성화
   */
  disableValidation?: boolean;
  /**
   * Help text
   */
  help?: string;
  /**
   * 비활성화 상태
   */
  disabled?: boolean;
  /**
   * 읽기 전용
   */
  readOnly?: boolean;
}

/**
 * 전화번호 포맷팅 (자동 하이픈 추가)
 * 010-1234-5678 형식
 */
function formatPhone(value: string): string {
  const numbers = value.replace(/[^0-9]/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(
    7,
    11
  )}`;
}

/**
 * 전화번호 검증 함수
 */
function validatePhone(value: string): string {
  if (!value.trim()) {
    return "전화번호를 입력해주세요";
  }
  if (!/^010-\d{4}-\d{4}$/.test(value)) {
    return "올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)";
  }
  return "";
}

export function PhoneInput({
  id,
  name,
  label = "전화번호",
  value,
  onChange,
  required = false,
  placeholder = "010-1234-5678",
  error: externalError,
  disableValidation = false,
  help = "하이픈(-)을 포함한 형식으로 자동 입력됩니다",
  disabled = false,
  readOnly = false,
}: PhoneInputProps) {
  const internalError = useMemo(() => {
    if (disableValidation || !value || readOnly) return "";
    return validatePhone(value);
  }, [value, disableValidation, readOnly]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    onChange(formatted);
  };

  const error = externalError || internalError;

  return (
    <FormField
      label={label}
      htmlFor={id}
      required={required}
      error={error}
      help={!error ? help : undefined}
    >
      <Input
        id={id}
        name={name || id}
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        error={!!error}
        disabled={disabled}
        readOnly={readOnly}
      />
    </FormField>
  );
}
