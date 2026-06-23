"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import CharacterCount from "@tiptap/extension-character-count";
import {
  mergeAttributes,
  type Editor as TiptapEditorInstance,
  type JSONContent,
} from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Images,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Trash2,
  Undo2,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { TiptapJsonNode } from "@/lib/client/api/v2-content.api";
import type { V2MediaAsset } from "@/lib/client/api/v2-catalog-admin.api";
import {
  useUploadV2MediaAssetFile,
  useV2AdminMediaAssets,
} from "@/lib/client/hooks/useV2CatalogAdmin";
import { getErrorMessage } from "@/lib/client/utils/v2-content";

interface TiptapPostEditorProps {
  value: TiptapJsonNode;
  onChange: (value: TiptapJsonNode) => void;
  disabled?: boolean;
}

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
};

type ImageAlign = "left" | "center" | "right";
type ImageWidth = "full" | "wide" | "medium" | "small";

type SelectedImageAttrs = {
  src?: string;
  alt?: string;
  title?: string;
  assetId?: string | null;
  caption?: string | null;
  align?: ImageAlign;
  width?: ImageWidth;
};

type InlineImageInsertSource = "upload" | "drop" | "paste" | "library";

const IMAGE_ALIGN_OPTIONS = [
  { label: "왼쪽", value: "left" },
  { label: "가운데", value: "center" },
  { label: "오른쪽", value: "right" },
];

const IMAGE_WIDTH_OPTIONS = [
  { label: "전체 폭", value: "full" },
  { label: "넓게", value: "wide" },
  { label: "보통", value: "medium" },
  { label: "작게", value: "small" },
];

function ToolbarButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm transition ${
        active
          ? "border-primary-500 bg-primary-50 text-primary-700"
          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function isImageFile(file: File): boolean {
  if (file.type.toLowerCase().startsWith("image/")) {
    return true;
  }
  return /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.name);
}

function toTiptapContent(value: TiptapJsonNode): JSONContent {
  return value as JSONContent;
}

function getImageFiles(fileList: FileList | null | undefined): File[] {
  return Array.from(fileList || []).filter(isImageFile);
}

function getEditorImageClass(
  align: string | null | undefined,
  width: string | null | undefined,
): string {
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
  return `block max-h-[420px] ${widthClass} ${alignClass} rounded-xl object-contain`;
}

const ContentImage = Image.extend({
  addAttributes() {
    return {
      ...(this.parent?.() || {}),
      assetId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-asset-id"),
        renderHTML: (attributes) =>
          attributes.assetId ? { "data-asset-id": attributes.assetId } : {},
      },
      caption: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-caption"),
        renderHTML: (attributes) =>
          attributes.caption ? { "data-caption": attributes.caption } : {},
      },
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes) => ({
          "data-align": attributes.align || "center",
        }),
      },
      width: {
        default: "full",
        parseHTML: (element) => element.getAttribute("data-width") || "full",
        renderHTML: (attributes) => ({
          "data-width": attributes.width || "full",
        }),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const align =
      typeof HTMLAttributes["data-align"] === "string"
        ? HTMLAttributes["data-align"]
        : "center";
    const width =
      typeof HTMLAttributes["data-width"] === "string"
        ? HTMLAttributes["data-width"]
        : "full";
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: [
          HTMLAttributes.class,
          getEditorImageClass(align, width),
        ]
          .filter(Boolean)
          .join(" "),
      }),
    ];
  },
});

function normalizeImageAlign(value: unknown): ImageAlign {
  return value === "left" || value === "right" ? value : "center";
}

function normalizeImageWidth(value: unknown): ImageWidth {
  if (value === "small" || value === "medium" || value === "wide") {
    return value;
  }
  return "full";
}

function buildImageNode(attrs: SelectedImageAttrs): JSONContent {
  return {
    type: "image",
    attrs: {
      src: attrs.src || "",
      alt: attrs.alt || "",
      title: attrs.title || attrs.alt || "",
      assetId: attrs.assetId || null,
      caption: attrs.caption || null,
      align: normalizeImageAlign(attrs.align),
      width: normalizeImageWidth(attrs.width),
    },
  };
}

export function TiptapPostEditor({
  value,
  onChange,
  disabled = false,
}: TiptapPostEditorProps) {
  const uploadMediaAssetFile = useUploadV2MediaAssetFile();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [selectedImageAttrs, setSelectedImageAttrs] =
    useState<SelectedImageAttrs | null>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const editorRef = useRef<TiptapEditorInstance | null>(null);

  const mediaAssetsQuery = useV2AdminMediaAssets({
    kind: "IMAGE",
    status: "ACTIVE",
    search: mediaSearch.trim() || undefined,
  });

  const insertImageNode = useCallback((attrs: SelectedImageAttrs) => {
    const activeEditor = editorRef.current;
    if (!activeEditor || !attrs.src) {
      return;
    }
    activeEditor
      .chain()
      .focus()
      .insertContent([buildImageNode(attrs), { type: "paragraph" }])
      .run();
  }, []);

  const uploadInlineImages = useCallback(
    async (files: File[], source: InlineImageInsertSource = "upload") => {
      const activeEditor = editorRef.current;
      if (!activeEditor || disabled) {
        return;
      }

      const imageFiles = files.filter(isImageFile);
      const invalidCount = files.length - imageFiles.length;
      if (imageFiles.length === 0) {
        setUploadError("이미지 파일만 삽입할 수 있습니다.");
        setUploadMessage(null);
        return;
      }

      setUploadError(null);
      setUploadMessage(`${imageFiles.length}장 업로드 중...`);

      try {
        for (const file of imageFiles) {
          const uploaded = await uploadMediaAssetFile.mutateAsync({
            data: {
              file,
              asset_kind: "IMAGE",
              status: "ACTIVE",
              metadata: {
                source: "v2-content-inline-image",
                insert_source: source,
              },
            },
          });
          if (!uploaded.data.public_url) {
            throw new Error("업로드된 이미지의 public URL이 없습니다.");
          }
          insertImageNode({
            src: uploaded.data.public_url,
            alt: uploaded.data.file_name || file.name,
            title: uploaded.data.file_name || file.name,
            assetId: uploaded.data.id,
            caption: null,
            align: "center",
            width: "full",
          });
        }

        setUploadMessage(
          invalidCount > 0
            ? `이미지 ${imageFiles.length}장을 삽입했습니다. 이미지가 아닌 ${invalidCount}개 파일은 제외했습니다.`
            : `이미지 ${imageFiles.length}장을 삽입했습니다.`,
        );
      } catch (error) {
        setUploadError(getErrorMessage(error));
        setUploadMessage(null);
      }
    },
    [disabled, insertImageNode, uploadMediaAssetFile],
  );

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https"],
        validate: (href) => href.startsWith("/") || /^https?:\/\//i.test(href),
      }),
      ContentImage.configure({
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder: "게시글 본문을 입력하세요.",
      }),
      CharacterCount.configure({
        limit: 20000,
      }),
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: toTiptapContent(value),
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: activeEditor }) => {
      onChange(activeEditor.getJSON() as TiptapJsonNode);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral max-w-none focus:outline-none min-h-80 px-4 py-4 text-base leading-7",
      },
      handlePaste: (_view, event) => {
        const files = getImageFiles(event.clipboardData?.files);
        if (files.length === 0) {
          return false;
        }
        event.preventDefault();
        void uploadInlineImages(files, "paste");
        return true;
      },
      handleDrop: (_view, event) => {
        const files = getImageFiles(event.dataTransfer?.files);
        if (files.length === 0) {
          return false;
        }
        event.preventDefault();
        void uploadInlineImages(files, "drop");
        return true;
      },
    },
  });

  const refreshSelectedImage = useCallback(() => {
    const activeEditor = editorRef.current;
    if (!activeEditor?.isActive("image")) {
      setSelectedImageAttrs(null);
      return;
    }
    const attrs = activeEditor.getAttributes("image") as SelectedImageAttrs;
    setSelectedImageAttrs({
      src: attrs.src || "",
      alt: attrs.alt || "",
      title: attrs.title || "",
      assetId: attrs.assetId || null,
      caption: attrs.caption || "",
      align: normalizeImageAlign(attrs.align),
      width: normalizeImageWidth(attrs.width),
    });
  }, []);

  useEffect(() => {
    editorRef.current = editor;
    return () => {
      if (editorRef.current === editor) {
        editorRef.current = null;
      }
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const refresh = () => refreshSelectedImage();
    editor.on("selectionUpdate", refresh);
    editor.on("transaction", refresh);
    refresh();
    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", refresh);
    };
  }, [editor, refreshSelectedImage]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(value);
    if (current !== incoming) {
      editor.commands.setContent(toTiptapContent(value));
    }
  }, [editor, value]);

  const setLink = () => {
    if (!editor) {
      return;
    }
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL", previousUrl || "");
    if (url === null) {
      return;
    }
    const normalized = url.trim();
    if (!normalized) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    if (!normalized.startsWith("/") && !/^https?:\/\//i.test(normalized)) {
      setUploadError("링크는 /로 시작하는 내부 경로 또는 http(s) URL이어야 합니다.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
  };

  const updateSelectedImage = (attrs: Partial<SelectedImageAttrs>) => {
    if (!editor || !selectedImageAttrs) {
      return;
    }
    const nextAttrs = {
      ...attrs,
      align: attrs.align ? normalizeImageAlign(attrs.align) : undefined,
      width: attrs.width ? normalizeImageWidth(attrs.width) : undefined,
    };
    editor.commands.updateAttributes("image", nextAttrs);
    setSelectedImageAttrs((current) =>
      current ? { ...current, ...nextAttrs } : current,
    );
  };

  const insertExistingMediaAsset = (asset: V2MediaAsset) => {
    if (!asset.public_url) {
      setUploadError("public URL이 없는 이미지는 삽입할 수 없습니다.");
      return;
    }
    insertImageNode({
      src: asset.public_url,
      alt: asset.file_name,
      title: asset.file_name,
      assetId: asset.id,
      caption: null,
      align: "center",
      width: "full",
    });
    setUploadError(null);
    setUploadMessage("미디어 라이브러리 이미지를 삽입했습니다.");
    setMediaPickerOpen(false);
  };

  const characterCount = editor?.storage.characterCount.characters() || 0;
  const mediaAssets = mediaAssetsQuery.data || [];
  const isUploading = uploadMediaAssetFile.isPending;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 px-3 py-3">
        <ToolbarButton
          label="실행 취소"
          disabled={!editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="다시 실행"
          disabled={!editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-6 w-px bg-neutral-200" />
        <ToolbarButton
          label="제목 2"
          active={editor?.isActive("heading", { level: 2 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="제목 3"
          active={editor?.isActive("heading", { level: 3 })}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="굵게"
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="기울임"
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="취소선"
          active={editor?.isActive("strike")}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-6 w-px bg-neutral-200" />
        <ToolbarButton
          label="글머리 목록"
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="번호 목록"
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="인용"
          active={editor?.isActive("blockquote")}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-6 w-px bg-neutral-200" />
        <ToolbarButton
          label="링크"
          active={editor?.isActive("link")}
          onClick={setLink}
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="링크 해제"
          disabled={!editor?.isActive("link")}
          onClick={() => editor?.chain().focus().unsetLink().run()}
        >
          <Unlink className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="서식 제거"
          onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
        <div className="ml-auto flex min-w-0 flex-wrap items-center gap-2">
          <Button
            intent="neutral"
            size="sm"
            onClick={() => setMediaPickerOpen((current) => !current)}
            disabled={disabled}
          >
            <Images className="h-4 w-4" />
            라이브러리
          </Button>
          <div className="min-w-44">
            <FileInput
              multiple
              accept="image/*"
              triggerLabel={isUploading ? "이미지 업로드 중..." : "이미지 삽입"}
              disabled={isUploading || disabled}
              triggerClassName="h-9"
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                event.target.value = "";
                void uploadInlineImages(files, "upload");
              }}
            />
          </div>
        </div>
        <ImagePlus className="h-4 w-4 text-neutral-400" />
      </div>

      {mediaPickerOpen ? (
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                미디어 라이브러리
              </h3>
            </div>
            <Input
              className="md:max-w-xs"
              size="sm"
              value={mediaSearch}
              onChange={(event) => setMediaSearch(event.target.value)}
              placeholder="파일명 검색"
            />
          </div>
          <div className="mt-3 max-h-72 overflow-y-auto">
            {mediaAssetsQuery.isLoading ? (
              <div className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-center text-sm text-neutral-500">
                이미지를 불러오는 중입니다.
              </div>
            ) : mediaAssets.length === 0 ? (
              <div className="rounded-lg border border-neutral-200 bg-white px-4 py-6 text-center text-sm text-neutral-500">
                사용할 수 있는 이미지가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                {mediaAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    disabled={!asset.public_url || disabled}
                    onClick={() => insertExistingMediaAsset(asset)}
                    className="group overflow-hidden rounded-lg border border-neutral-200 bg-white text-left transition hover:border-primary-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {asset.public_url ? (
                      <img
                        src={asset.public_url}
                        alt={asset.file_name}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-neutral-100 text-xs text-neutral-400">
                        URL 없음
                      </div>
                    )}
                    <div className="px-2 py-2">
                      <p className="truncate text-xs font-medium text-neutral-700 group-hover:text-primary-700">
                        {asset.file_name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {uploadError ? (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          {uploadError}
        </div>
      ) : null}
      {uploadMessage ? (
        <div className="border-b border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          {uploadMessage}
        </div>
      ) : null}

      <EditorContent editor={editor} />

      {selectedImageAttrs ? (
        <div className="border-t border-neutral-200 bg-neutral-50 px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                <ImagePlus className="h-4 w-4" />
                선택한 이미지
              </div>
              <p className="mt-1 truncate text-xs text-neutral-500">
                {selectedImageAttrs.src}
              </p>
            </div>
            <Button
              intent="danger"
              size="sm"
              onClick={() => {
                editor?.chain().focus().deleteSelection().run();
                setSelectedImageAttrs(null);
              }}
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" />
              삭제
            </Button>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">
                대체 텍스트
              </label>
              <Input
                size="sm"
                value={selectedImageAttrs.alt || ""}
                onChange={(event) =>
                  updateSelectedImage({
                    alt: event.target.value,
                    title: event.target.value,
                  })
                }
                disabled={disabled}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">
                정렬
              </label>
              <Select
                size="sm"
                value={selectedImageAttrs.align || "center"}
                onChange={(event) =>
                  updateSelectedImage({ align: event.target.value as ImageAlign })
                }
                options={IMAGE_ALIGN_OPTIONS}
                disabled={disabled}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">
                폭
              </label>
              <Select
                size="sm"
                value={selectedImageAttrs.width || "full"}
                onChange={(event) =>
                  updateSelectedImage({ width: event.target.value as ImageWidth })
                }
                options={IMAGE_WIDTH_OPTIONS}
                disabled={disabled}
              />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-neutral-600">
                캡션
              </label>
              <Textarea
                size="sm"
                rows={2}
                resize={false}
                value={selectedImageAttrs.caption || ""}
                onChange={(event) =>
                  updateSelectedImage({ caption: event.target.value || null })
                }
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2 text-xs text-neutral-500">
        <span>{characterCount.toLocaleString()} / 20,000자</span>
        <Button
          intent="ghost"
          size="sm"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          disabled={disabled}
        >
          구분선
        </Button>
      </div>
    </div>
  );
}
