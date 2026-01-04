/**
 * EmailInput Component
 *
 * 이메일 입력 공통 컴포넌트
 * - 이메일 형식 검증
 */

"use client";

import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useMemo } from "react";

export interface EmailInputProps {
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
 * 이메일 검증 함수
 */
function validateEmail(value: string): string {
  if (!value.trim()) {
    return "이메일을 입력해주세요";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "올바른 이메일 형식이 아닙니다";
  }
  return "";
}

export function EmailInput({
  id,
  name,
  label = "이메일",
  value,
  onChange,
  required = false,
  placeholder = "email@example.com",
  error: externalError,
  disableValidation = false,
  help,
  disabled = false,
  readOnly = false,
}: EmailInputProps) {
  const internalError = useMemo(() => {
    if (disableValidation || !value || readOnly) return "";
    return validateEmail(value);
  }, [value, disableValidation, readOnly]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
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
        type="email"
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
