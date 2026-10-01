/**
 * App-wide constants for the Personal Resource Manager.
 * Categories stay flexible (free text on create/edit); these are suggestions only.
 */

export const SUGGESTED_CATEGORIES = [
  "Development",
  "Design",
  "Productivity",
  "Research",
  "Reading",
  "Tools",
  "Finance",
  "Other",
] as const;

export const RESOURCE_TYPE = {
  LINK: "LINK",
  PDF: "PDF",
  EXCEL: "EXCEL",
  PPTX: "PPTX",
  DOCX: "DOCX",
  IMAGE: "IMAGE",
} as const;

export type ResourceTypeId = (typeof RESOURCE_TYPE)[keyof typeof RESOURCE_TYPE];

export const RESOURCE_TYPE_IDS = Object.values(RESOURCE_TYPE) as ResourceTypeId[];

export function isResourceType(value: unknown): value is ResourceTypeId {
  return typeof value === "string" && (RESOURCE_TYPE_IDS as string[]).includes(value);
}

export const RESOURCE_TYPE_META: Record<
  ResourceTypeId,
  { label: string; shortLabel: string; isFile: boolean; kind: "link" | "file" }
> = {
  LINK: { label: "Link", shortLabel: "Links", isFile: false, kind: "link" },
  PDF: { label: "PDF", shortLabel: "PDFs", isFile: true, kind: "file" },
  EXCEL: { label: "Excel", shortLabel: "Excel", isFile: true, kind: "file" },
  PPTX: { label: "PPTX", shortLabel: "PPTX", isFile: true, kind: "file" },
  DOCX: { label: "DOCX", shortLabel: "DOCX", isFile: true, kind: "file" },
  IMAGE: { label: "Image", shortLabel: "Images", isFile: true, kind: "file" },
};

export const FILE_RESOURCE_TYPES = [
  RESOURCE_TYPE.PDF,
  RESOURCE_TYPE.EXCEL,
  RESOURCE_TYPE.PPTX,
  RESOURCE_TYPE.DOCX,
  RESOURCE_TYPE.IMAGE,
] as const;

export type FileResourceTypeId = (typeof FILE_RESOURCE_TYPES)[number];

export type FileValidationConfig = {
  extensions: string[];
  mimeTypes: string[];
};

/** Default max upload size: 10 MiB. Override with MAX_FILE_SIZE_BYTES. */
export const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function getMaxFileSizeBytes(): number {
  const raw = process.env.MAX_FILE_SIZE_BYTES;
  if (!raw) return DEFAULT_MAX_FILE_SIZE_BYTES;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_FILE_SIZE_BYTES;
}

export const FILE_TYPE_CONFIG: Record<FileResourceTypeId, FileValidationConfig> = {
  PDF: {
    extensions: [".pdf"],
    mimeTypes: ["application/pdf"],
  },
  EXCEL: {
    extensions: [".xlsx", ".xls"],
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
      "",
    ],
  },
  PPTX: {
    extensions: [".pptx", ".ppt"],
    mimeTypes: [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/octet-stream",
      "",
    ],
  },
  DOCX: {
    extensions: [".docx", ".doc"],
    mimeTypes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream",
      "",
    ],
  },
  IMAGE: {
    extensions: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
    mimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"],
  },
};

export function getFileExtension(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() ?? "";
  const idx = base.lastIndexOf(".");
  if (idx <= 0) return "";
  return base.slice(idx).toLowerCase();
}

export function isFileResourceType(type: unknown): type is FileResourceTypeId {
  return typeof type === "string" && (FILE_RESOURCE_TYPES as readonly string[]).includes(type);
}

/** Storage provider used for uploaded files. Defaults to local in dev, R2 when configured. */
export type StorageProviderId = "r2" | "local";

export function resolveStorageProvider(): StorageProviderId {
  const explicit = process.env.STORAGE_PROVIDER?.toLowerCase();
  if (explicit === "r2" || explicit === "local") return explicit;
  if (process.env.R2_BUCKET_NAME && process.env.R2_ACCOUNT_ID) return "r2";
  return "local";
}
