/**
 * NameInput Component
 *
 * 이름 입력 공통 컴포넌트
 * - 2자 이상 검증
 * - 한글/영문/공백만 허용
 */

"use client";

import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useMemo } from "react";

export interface NameInputProps {
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
   * 비활성화 상태
   */
  disabled?: boolean;
  /**
   * 읽기 전용
   */
  readOnly?: boolean;
}

/**
 * 이름 검증 함수
 */
function validateName(value: string): string {
  if (!value.trim()) {
    return "이름을 입력해주세요";
  }
  if (value.length < 2) {
    return "이름은 2자 이상이어야 합니다";
  }
  if (value.length > 50) {
    return "이름은 50자를 초과할 수 없습니다";
  }
  if (!/^[가-힣a-zA-Z\s]+$/.test(value)) {
    return "이름은 한글, 영문, 공백만 사용할 수 있습니다";
  }
  return "";
}

export function NameInput({
  id,
  name,
  label = "이름",
  value,
  onChange,
  required = false,
  placeholder = "이름을 입력하세요",
  error: externalError,
  disableValidation = false,
  disabled = false,
  readOnly = false,
}: NameInputProps) {
  const internalError = useMemo(() => {
    if (disableValidation || !value || readOnly) return "";
    return validateName(value);
  }, [value, disableValidation, readOnly]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const error = externalError || internalError;

  return (
    <FormField label={label} htmlFor={id} required={required} error={error}>
      <Input
        id={id}
        name={name || id}
        type="text"
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
