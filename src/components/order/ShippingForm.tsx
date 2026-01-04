/**
 * ShippingForm Component
 *
 * 배송 정보 입력 폼 컴포넌트
 */

"use client";

import { AddressInput, NameInput, PhoneInput } from "@/components/form";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/input";
import { useState } from "react";

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
    name: initialValues?.name || "",
    phone: initialValues?.phone || "",
    mainAddress: initialValues?.mainAddress || "",
    detailAddress: initialValues?.detailAddress || "",
    memo: initialValues?.memo || "",
  });

  // "주문자 정보와 동일" 체크 상태
  const [sameAsCustomer, setSameAsCustomer] = useState(false);

  const handleChange = (field: keyof ShippingInfo, value: string) => {
    const newValues = { ...values, [field]: value };
    setValues(newValues);
    onChange(newValues);
  };

  const handleCopyFromCustomer = (checked: boolean) => {
    setSameAsCustomer(checked);

    if (checked && customerInfo) {
      // 주문자 정보를 배송 정보로 복사
      const newValues = {
        ...values,
        name: customerInfo.name || "",
        phone: customerInfo.phone || "",
      };
      setValues(newValues);
      onChange(newValues);
    }
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

      <NameInput
        id="shippingName"
        name="shippingName"
        label="수령인"
        value={values.name}
        onChange={(newValue) => handleChange("name", newValue)}
        placeholder="받으실 분의 이름을 입력하세요"
        required
        disabled={sameAsCustomer}
      />

      <PhoneInput
        id="shippingPhone"
        name="shippingPhone"
        label="연락처"
        value={values.phone}
        onChange={(newValue) => handleChange("phone", newValue)}
        required
        disabled={sameAsCustomer}
      />

      <AddressInput
        mainAddressId="shippingMainAddress"
        mainAddressName="shippingMainAddress"
        mainAddressLabel="배송 주소"
        mainAddressValue={values.mainAddress}
        onMainAddressChange={(newValue) =>
          handleChange("mainAddress", newValue)
        }
        detailAddressId="shippingDetailAddress"
        detailAddressName="shippingDetailAddress"
        detailAddressValue={values.detailAddress}
        onDetailAddressChange={(newValue) =>
          handleChange("detailAddress", newValue)
        }
        required
        disabled={sameAsCustomer}
      />

      <FormField label="배송 메모" htmlFor="shippingMemo">
        <Textarea
          id="shippingMemo"
          name="shippingMemo"
          placeholder="배송 시 요청사항을 입력하세요 (선택)"
          value={values.memo}
          onChange={(e) => handleChange("memo", e.target.value)}
          rows={2}
        />
      </FormField>
    </div>
  );
}
