const DEFAULT_OPTION_TITLE_KEYS = new Set([
  'default',
  'default option',
  'single option',
  '기본',
  '기본 옵션',
  '단일 옵션',
]);

function toCompareKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeDisplayTitle(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function shouldShowOptionTitle(params: {
  productTitle: string;
  optionTitle: string;
  distinctOptionCount?: number;
}): boolean {
  const optionTitle = normalizeDisplayTitle(params.optionTitle);
  if (!optionTitle) {
    return false;
  }

  const optionKey = toCompareKey(optionTitle);
  if (!optionKey || DEFAULT_OPTION_TITLE_KEYS.has(optionKey)) {
    return false;
  }

  const productTitle = normalizeDisplayTitle(params.productTitle);
  if (productTitle && toCompareKey(productTitle) === optionKey) {
    return false;
  }

  if (
    typeof params.distinctOptionCount === 'number' &&
    params.distinctOptionCount <= 1
  ) {
    return false;
  }

  return true;
}

export function buildDistinctOptionCountByProduct<T>(params: {
  rows: T[];
  getProductId: (row: T) => string | null | undefined;
  getOptionId: (row: T) => string | null | undefined;
}): Map<string, number> {
  const optionSetByProduct = new Map<string, Set<string>>();

  for (const row of params.rows) {
    const productId = normalizeDisplayTitle(params.getProductId(row));
    const optionId = normalizeDisplayTitle(params.getOptionId(row));
    if (!productId || !optionId) {
      continue;
    }

    const existing = optionSetByProduct.get(productId);
    if (existing) {
      existing.add(optionId);
      continue;
    }

    optionSetByProduct.set(productId, new Set([optionId]));
  }

  const counts = new Map<string, number>();
  for (const [productId, optionSet] of optionSetByProduct) {
    counts.set(productId, optionSet.size);
  }
  return counts;
}
