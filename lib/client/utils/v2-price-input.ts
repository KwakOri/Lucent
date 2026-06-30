export function normalizePriceInputValue(value: string): string {
  const digitsOnly = value.replace(/\D/g, '');
  if (!digitsOnly) {
    return '';
  }
  return digitsOnly.replace(/^0+(?=\d)/, '');
}

export function formatPriceInputValue(value: string): string {
  const normalized = normalizePriceInputValue(value);
  if (!normalized) {
    return '';
  }
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function parseNonNegativeInteger(value: string, fieldName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName}는 0 이상의 정수여야 합니다.`);
  }
  return parsed;
}

export function parseOptionalPriceInput(
  value: string,
  fieldName = '금액',
): number | null {
  const normalized = normalizePriceInputValue(value);
  if (!normalized) {
    return null;
  }
  return parseNonNegativeInteger(normalized, fieldName);
}
