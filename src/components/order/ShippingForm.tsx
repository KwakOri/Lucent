/**
 * ShippingForm Component
 *
 * 배송 정보 입력 폼 컴포넌트
 */

'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { FormField } from '@/components/ui/form-field';
import { Input, Textarea } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AddressSearchModal } from './AddressSearchModal';
import type { AddressSearchResult } from '@/types/address';

export interface ShippingInfo {
  name: string;
  phone: string;
  mainAddress: string;
  detailAddress: string;
  memo: string;
}

interface ShippingFormProps {
  initialValues?: Partial<ShippingInfo>;
  customerInfo?: {
    name?: string;
    phone?: string;
  };
  onChange: (values: ShippingInfo) => void;
}

export function ShippingForm({
  initialValues,
  customerInfo,
  onChange,
}: ShippingFormProps) {
  const [values, setValues] = useState<ShippingInfo>({
    name: initialValues?.name || '',
    phone: initialValues?.phone || '',
    mainAddress: initialValues?.mainAddress || '',
    detailAddress: initialValues?.detailAddress || '',
    memo: initialValues?.memo || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ShippingInfo, string>>>({});
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const handleChange = (field: keyof ShippingInfo, value: string) => {
    const newValues = { ...values, [field]: value };
    setValues(newValues);
    onChange(newValues);

    // 실시간 검증
    validateField(field, value);
  };

  const validateField = (field: keyof ShippingInfo, value: string) => {
    let error = '';

    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = '수령인 이름을 입력해주세요';
        } else if (value.length < 2) {
          error = '이름은 2자 이상이어야 합니다';
        }
        break;

      case 'phone':
        if (!value.trim()) {
          error = '연락처를 입력해주세요';
        } else if (!/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(value.replace(/-/g, ''))) {
          error = '올바른 연락처 형식이 아닙니다';
        }
        break;

      case 'mainAddress':
        if (!value.trim()) {
          error = '주소를 검색하여 선택해주세요';
        }
        break;

      case 'detailAddress':
        if (!value.trim()) {
          error = '상세 주소를 입력해주세요';
        } else if (value.length < 2) {
          error = '상세 주소를 2자 이상 입력해주세요';
        }
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleCopyFromCustomer = (checked: boolean) => {
    if (checked && customerInfo) {
      const newValues = {
        ...values,
        name: customerInfo.name || '',
        phone: customerInfo.phone || '',
      };
      setValues(newValues);
      onChange(newValues);
    }
  };

  const handleAddressSelect = (address: AddressSearchResult) => {
    // 도로명 주소가 있으면 도로명 우선, 없으면 지번 주소 사용
    const selectedAddress = address.roadAddress || address.jibunAddress;
    const fullAddress = address.zonecode
      ? `[${address.zonecode}] ${selectedAddress}`
      : selectedAddress;

    handleChange('mainAddress', fullAddress);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">배송 정보</h2>
        {customerInfo && (
          <Checkbox
            label="주문자 정보와 동일"
            onChange={(e) => handleCopyFromCustomer(e.target.checked)}
          />
        )}
      </div>

      <FormField
        label="수령인"
        htmlFor="shippingName"
        required
        error={errors.name}
      >
        <Input
          id="shippingName"
          name="shippingName"
          placeholder="받으실 분의 이름을 입력하세요"
          value={values.name}
          onChange={(e) => handleChange('name', e.target.value)}
          error={!!errors.name}
        />
      </FormField>

      <FormField
        label="연락처"
        htmlFor="shippingPhone"
        required
        error={errors.phone}
      >
        <Input
          id="shippingPhone"
          name="shippingPhone"
          type="tel"
          placeholder="010-0000-0000"
          value={values.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          error={!!errors.phone}
        />
      </FormField>

      <FormField
        label="배송 주소"
        htmlFor="shippingMainAddress"
        required
        error={errors.mainAddress}
        help="주소 검색 버튼을 눌러 주소를 선택하세요"
      >
        <div className="space-y-2">
          <Button
            type="button"
            intent="neutral"
            size="md"
            onClick={() => setIsAddressModalOpen(true)}
            className="w-full"
          >
            <Search size={18} />
            <span className="ml-2">주소 검색</span>
          </Button>
          <Input
            id="shippingMainAddress"
            name="shippingMainAddress"
            placeholder="주소 검색 버튼을 눌러 주소를 선택하세요"
            value={values.mainAddress}
            readOnly
            error={!!errors.mainAddress}
            className="bg-gray-50 cursor-not-allowed"
          />
        </div>
      </FormField>

      {values.mainAddress && (
        <FormField
          label="상세 주소"
          htmlFor="shippingDetailAddress"
          required
          error={errors.detailAddress}
          help="동/호수 등 상세 주소를 입력하세요"
        >
          <Input
            id="shippingDetailAddress"
            name="shippingDetailAddress"
            placeholder="예: 101동 202호"
            value={values.detailAddress}
            onChange={(e) => handleChange('detailAddress', e.target.value)}
            error={!!errors.detailAddress}
            autoFocus
          />
        </FormField>
      )}

      <FormField
        label="배송 메모"
        htmlFor="shippingMemo"
      >
        <Textarea
          id="shippingMemo"
          name="shippingMemo"
          placeholder="배송 시 요청사항을 입력하세요 (선택)"
          value={values.memo}
          onChange={(e) => handleChange('memo', e.target.value)}
          rows={2}
        />
      </FormField>

      {/* 주소 검색 모달 */}
      <AddressSearchModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSelect={handleAddressSelect}
      />
    </div>
  );
}
