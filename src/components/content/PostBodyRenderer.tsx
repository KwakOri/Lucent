import Link from "next/link";
import type { ReactNode } from "react";
import type { TiptapJsonNode } from "@/lib/client/api/v2-content.api";

interface PostBodyRendererProps {
  body: TiptapJsonNode | null | undefined;
}

function isSafeHref(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("/") || /^https?:\/\//i.test(value))
  );
}

function getAttrs(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readTextAttr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getImageFigureClass(attrs: Record<string, unknown>): string {
  const align = attrs.align;
  const width = attrs.width;
  const widthClass =
    width === "small"
      ? "max-w-xs"
      : width === "medium"
        ? "max-w-md"
        : width === "wide"
          ? "max-w-2xl"
          : "w-full";
  const alignClass =
    align === "left" ? "mr-auto" : align === "right" ? "ml-auto" : "mx-auto";
  return `my-8 ${widthClass} ${alignClass}`;
}

function renderTextWithMarks(node: TiptapJsonNode, key: string): ReactNode {
  let content: ReactNode = node.text || "";
  const marks = Array.isArray(node.marks) ? node.marks : [];

  marks.forEach((mark, markIndex) => {
    if (!mark || typeof mark !== "object") {
      return;
    }
    if (mark.type === "bold") {
      content = <strong key={`${key}-bold-${markIndex}`}>{content}</strong>;
    }
    if (mark.type === "italic") {
      content = <em key={`${key}-italic-${markIndex}`}>{content}</em>;
    }
    if (mark.type === "strike") {
      content = <s key={`${key}-strike-${markIndex}`}>{content}</s>;
    }
    if (mark.type === "code") {
      content = (
        <code
          key={`${key}-code-${markIndex}`}
          className="rounded bg-neutral-100 px-1 py-0.5 text-sm text-neutral-800"
        >
          {content}
        </code>
      );
    }
    const markAttrs = getAttrs(mark.attrs);
    if (mark.type === "link" && isSafeHref(markAttrs.href)) {
      const href = markAttrs.href;
      content = href.startsWith("/") ? (
        <Link
          key={`${key}-link-${markIndex}`}
          href={href}
          className="font-medium text-[#4a88b9] underline-offset-4 hover:underline"
        >
          {content}
        </Link>
      ) : (
        <a
          key={`${key}-link-${markIndex}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-[#4a88b9] underline-offset-4 hover:underline"
        >
          {content}
        </a>
      );
    }
  });

  return content;
}

function renderChildren(node: TiptapJsonNode, keyPrefix: string): ReactNode[] {
  return (node.content || []).map((child, index) =>
    renderNode(child, `${keyPrefix}-${index}`),
  );
}

function renderNode(node: TiptapJsonNode, key: string): ReactNode {
  if (typeof node.text === "string") {
    return renderTextWithMarks(node, key);
  }

  switch (node.type) {
    case "doc":
      return <div key={key}>{renderChildren(node, key)}</div>;
    case "paragraph":
      return (
        <p key={key} className="my-4 leading-8 text-[#1a1a2e]/80">
          {renderChildren(node, key)}
        </p>
      );
    case "heading": {
      const attrs = getAttrs(node.attrs);
      const level = Number(attrs.level || 2);
      if (level === 3) {
        return (
          <h3 key={key} className="mb-3 mt-8 text-2xl font-bold text-[#1a1a2e]">
            {renderChildren(node, key)}
          </h3>
        );
      }
      return (
        <h2 key={key} className="mb-4 mt-10 text-3xl font-bold text-[#1a1a2e]">
          {renderChildren(node, key)}
        </h2>
      );
    }
    case "bulletList":
      return (
        <ul key={key} className="my-4 list-disc space-y-2 pl-6 text-[#1a1a2e]/80">
          {renderChildren(node, key)}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="my-4 list-decimal space-y-2 pl-6 text-[#1a1a2e]/80">
          {renderChildren(node, key)}
        </ol>
      );
    case "listItem":
      return (
        <li key={key} className="leading-7">
          {renderChildren(node, key)}
        </li>
      );
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="my-6 border-l-4 border-[#66B5F3] bg-[#f4faff] px-5 py-3 text-[#1a1a2e]/75"
        >
          {renderChildren(node, key)}
        </blockquote>
      );
    case "horizontalRule":
      return <hr key={key} className="my-8 border-neutral-200" />;
    case "hardBreak":
      return <br key={key} />;
    case "image": {
      const attrs = getAttrs(node.attrs);
      const src = typeof attrs.src === "string" ? attrs.src : "";
      if (!isSafeHref(src)) {
        return null;
      }
      const alt = readTextAttr(attrs.alt);
      const caption = readTextAttr(attrs.caption);
      return (
        <figure key={key} className={getImageFigureClass(attrs)}>
          <img
            src={src}
            alt={alt}
            className="max-h-[560px] w-full rounded-2xl object-contain"
          />
          {caption ? (
            <figcaption className="mt-2 text-center text-sm text-[#1a1a2e]/50">
              {caption}
            </figcaption>
          ) : null}
        </figure>
      );
    }
    case "codeBlock":
      return (
        <pre
          key={key}
          className="my-6 overflow-x-auto rounded-xl bg-neutral-900 p-4 text-sm text-white"
        >
          <code>{renderChildren(node, key)}</code>
        </pre>
      );
    default:
      return <div key={key}>{renderChildren(node, key)}</div>;
  }
}

export function PostBodyRenderer({ body }: PostBodyRendererProps) {
  if (!body || body.type !== "doc") {
    return null;
  }

  return <div className="text-base">{renderNode(body, "post-body")}</div>;
}
