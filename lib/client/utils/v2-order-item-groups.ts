export type V2OrderLineType = 'STANDARD' | 'BUNDLE_PARENT' | 'BUNDLE_COMPONENT';

export interface V2OrderDisplayComponent {
  id: string;
  title: string;
  quantity: number;
  lineTotal: number;
  lineStatus: string;
  fulfillmentType: string;
  requiresShipping: boolean;
}

export interface V2OrderDisplayItemGroup {
  key: string;
  id: string;
  title: string;
  quantity: number;
  lineTotal: number;
  lineStatus: string;
  lineType: V2OrderLineType;
  fulfillmentType: string;
  requiresShipping: boolean;
  components: V2OrderDisplayComponent[];
}

interface NormalizedV2OrderItem {
  id: string;
  parentOrderItemId: string;
  title: string;
  quantity: number;
  lineTotal: number;
  lineStatus: string;
  lineType: V2OrderLineType;
  fulfillmentType: string;
  requiresShipping: boolean;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function readBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return false;
}

function normalizeLineType(value: unknown): V2OrderLineType {
  const lineType = readString(value);
  if (lineType === 'BUNDLE_PARENT' || lineType === 'BUNDLE_COMPONENT') {
    return lineType;
  }
  return 'STANDARD';
}

function resolveItemTitle(item: Record<string, unknown>, index: number): string {
  const display = asObject(item.display_snapshot);
  return (
    readString(display.title) ||
    readString(display.variant_title) ||
    readString(item.variant_name_snapshot) ||
    readString(item.product_name_snapshot) ||
    readString(item.variant_id) ||
    `상품 ${index + 1}`
  );
}

function normalizeItem(rawItem: Record<string, unknown>, index: number): NormalizedV2OrderItem {
  const display = asObject(rawItem.display_snapshot);
  return {
    id: readString(rawItem.id) || `line-${index}`,
    parentOrderItemId: readString(rawItem.parent_order_item_id),
    title: resolveItemTitle(rawItem, index),
    quantity: Math.max(1, readNumber(rawItem.quantity)),
    lineTotal: Math.max(0, readNumber(rawItem.final_line_total || rawItem.line_subtotal)),
    lineStatus: readString(rawItem.line_status),
    lineType: normalizeLineType(rawItem.line_type),
    fulfillmentType:
      readString(display.fulfillment_type) || readString(rawItem.fulfillment_type_snapshot),
    requiresShipping:
      readBoolean(display.requires_shipping) || readBoolean(rawItem.requires_shipping_snapshot),
  };
}

function mapComponent(item: NormalizedV2OrderItem): V2OrderDisplayComponent {
  return {
    id: item.id,
    title: item.title,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
    lineStatus: item.lineStatus,
    fulfillmentType: item.fulfillmentType,
    requiresShipping: item.requiresShipping,
  };
}

function summarizeComponentStatus(components: NormalizedV2OrderItem[]): string {
  const statuses = components
    .map((component) => component.lineStatus)
    .filter((status) => status.length > 0);

  if (statuses.length === 0) {
    return '';
  }

  const firstStatus = statuses[0];
  if (statuses.every((status) => status === firstStatus)) {
    return firstStatus;
  }

  return 'PARTIAL';
}

export function groupV2OrderItems(
  rawItems: Array<Record<string, unknown>>,
): V2OrderDisplayItemGroup[] {
  const normalizedItems = rawItems.map((item, index) => normalizeItem(item, index));
  const bundleParentIds = new Set(
    normalizedItems
      .filter((item) => item.lineType === 'BUNDLE_PARENT')
      .map((item) => item.id),
  );

  const componentsByParentId = new Map<string, NormalizedV2OrderItem[]>();
  for (const item of normalizedItems) {
    if (item.lineType !== 'BUNDLE_COMPONENT' || !item.parentOrderItemId) {
      continue;
    }
    const existing = componentsByParentId.get(item.parentOrderItemId);
    if (existing) {
      existing.push(item);
      continue;
    }
    componentsByParentId.set(item.parentOrderItemId, [item]);
  }

  const groups: V2OrderDisplayItemGroup[] = [];
  for (const item of normalizedItems) {
    if (item.lineType === 'BUNDLE_COMPONENT') {
      if (item.parentOrderItemId && bundleParentIds.has(item.parentOrderItemId)) {
        continue;
      }
      groups.push({
        key: item.id,
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        lineStatus: item.lineStatus,
        lineType: 'BUNDLE_COMPONENT',
        fulfillmentType: item.fulfillmentType,
        requiresShipping: item.requiresShipping,
        components: [],
      });
      continue;
    }

    if (item.lineType === 'BUNDLE_PARENT') {
      const components = componentsByParentId.get(item.id) || [];
      const componentTotal = components.reduce(
        (accumulator, component) => accumulator + component.lineTotal,
        0,
      );
      const hasShippingComponent = components.some((component) => component.requiresShipping);

      groups.push({
        key: item.id,
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        lineTotal: item.lineTotal > 0 ? item.lineTotal : componentTotal,
        lineStatus: item.lineStatus || summarizeComponentStatus(components),
        lineType: 'BUNDLE_PARENT',
        fulfillmentType: item.fulfillmentType,
        requiresShipping: item.requiresShipping || hasShippingComponent,
        components: components.map(mapComponent),
      });
      continue;
    }

    groups.push({
      key: item.id,
      id: item.id,
      title: item.title,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      lineStatus: item.lineStatus,
      lineType: 'STANDARD',
      fulfillmentType: item.fulfillmentType,
      requiresShipping: item.requiresShipping,
      components: [],
    });
  }

  return groups;
}
