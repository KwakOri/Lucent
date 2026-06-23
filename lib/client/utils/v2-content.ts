import { ApiError } from "@/lib/client/utils/api-error";
import type {
  TiptapJsonNode,
  V2ContentPostStatus,
  V2ContentPostType,
} from "@/lib/client/api/v2-content.api";

export const CONTENT_POST_TYPE_LABELS: Record<V2ContentPostType, string> = {
  NEWS: "뉴스",
  NOTICE: "공지",
  BANNER_AD: "배너 광고",
};

export const CONTENT_POST_STATUS_LABELS: Record<V2ContentPostStatus, string> = {
  DRAFT: "초안",
  PUBLISHED: "발행",
  ARCHIVED: "보관",
};

export const CONTENT_POST_TYPES: V2ContentPostType[] = [
  "NEWS",
  "NOTICE",
  "BANNER_AD",
];

export const CONTENT_POST_STATUSES: V2ContentPostStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
];

export function getContentPostStatusIntent(status: V2ContentPostStatus) {
  if (status === "PUBLISHED") return "success";
  if (status === "ARCHIVED") return "default";
  return "warning";
}

export function formatContentDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return "-";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

export function formatContentDateTimeInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return "";
  }
  const date = new Date(timestamp);
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseContentDateTimeInput(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) {
    throw new Error("일시 형식이 올바르지 않습니다.");
  }
  return new Date(timestamp).toISOString();
}

export function buildContentSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

export function createEmptyTiptapDocument(): TiptapJsonNode {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function extractTextFromTiptapDocument(document: TiptapJsonNode): string {
  const parts: string[] = [];
  const visit = (node: TiptapJsonNode | undefined) => {
    if (!node) return;
    if (typeof node.text === "string") {
      parts.push(node.text);
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(visit);
    }
  };
  visit(document);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function extractInlineMediaAssetIdsFromTiptapDocument(
  document: TiptapJsonNode,
): string[] {
  const ids = new Set<string>();
  const visit = (node: TiptapJsonNode | undefined) => {
    if (!node) return;
    if (node.type === "image" && node.attrs) {
      const assetId = node.attrs.assetId;
      if (typeof assetId === "string" && assetId.trim()) {
        ids.add(assetId.trim());
      }
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(visit);
    }
  };
  visit(document);
  return Array.from(ids);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "요청 처리 중 오류가 발생했습니다.";
}
