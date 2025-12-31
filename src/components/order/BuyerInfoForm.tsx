/**
 * BuyerInfoForm Component
 *
 * 주문자 정보 입력 폼 컴포넌트
 */

'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/form-field';

export interface BuyerInfo {
  name: string;
  email: string;
  phone: string;
}

interface BuyerInfoFormProps {
  value: BuyerInfo;
  onChange: (values: BuyerInfo) => void;
}

export function BuyerInfoForm({
  value,
  onChange,
}: BuyerInfoFormProps) {
  const [errors, setErrors] = useState<Partial<Record<keyof BuyerInfo, string>>>({});

  const handleChange = (field: keyof BuyerInfo, newValue: string) => {
    const newValues = { ...value, [field]: newValue };
    onChange(newValues);

    // 실시간 검증
    validateField(field, newValue);
  };

  const validateField = (field: keyof BuyerInfo, value: string) => {
    let error = '';

    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = '이름을 입력해주세요';
        } else if (value.length < 2) {
          error = '이름은 2자 이상이어야 합니다';
        }
        break;

      case 'email':
        if (!value.trim()) {
          error = '이메일을 입력해주세요';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = '올바른 이메일 형식이 아닙니다';
        }
        break;

      case 'phone':
        if (!value.trim()) {
          error = '연락처를 입력해주세요';
        } else if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(value.replace(/-/g, ''))) {
          error = '올바른 연락처 형식이 아닙니다';
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">주문자 정보</h2>
        <p className="text-sm text-gray-500">정보를 확인하고 수정할 수 있습니다</p>
      </div>

      <FormField
        label="이름"
        name="buyerName"
        required
        placeholder="이름을 입력하세요"
        value={value.name}
        onChange={(e) => handleChange('name', e.target.value)}
        error={errors.name}
      />

      <FormField
        label="이메일"
        name="buyerEmail"
        type="email"
        required
        placeholder="email@example.com"
        value={value.email}
        onChange={(e) => handleChange('email', e.target.value)}
        error={errors.email}
      />

      <FormField
        label="연락처"
        name="buyerPhone"
        type="tel"
        required
        placeholder="010-0000-0000"
        value={value.phone}
        onChange={(e) => handleChange('phone', e.target.value)}
        error={errors.phone}
      />
    </div>
  );
}
