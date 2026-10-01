import { z } from "zod";
import {
  FILE_RESOURCE_TYPES,
  FILE_TYPE_CONFIG,
  RESOURCE_TYPE,
  RESOURCE_TYPE_IDS,
  getFileExtension,
  getMaxFileSizeBytes,
  isFileResourceType,
  type FileResourceTypeId,
  type ResourceTypeId,
} from "@/lib/constants";
import { formatFileSize } from "@/lib/utils";

/**
 * Shared Zod schemas for the Resource model.
 * Supports LINK + file resource types (PDF, EXCEL, PPTX, DOCX, IMAGE).
 */

const tagsSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .default([]);

const commonMetadataFields = {
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer")
    .optional()
    .nullable(),
  category: z
    .string()
    .trim()
    .max(60, "Category must be 60 characters or fewer")
    .optional()
    .nullable(),
  tags: tagsSchema,
  favorite: z.boolean().default(false),
};

export const resourceTypeEnum = z.enum(RESOURCE_TYPE_IDS as [ResourceTypeId, ...ResourceTypeId[]]);

/* -------------------------------------------------------------------------- */
/* Links                                                                       */
/* -------------------------------------------------------------------------- */

export const linkInputSchema = z.object({
  ...commonMetadataFields,
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .url("Enter a valid URL (include https://)")
    .max(2048, "URL must be 2048 characters or fewer"),
});

export type LinkInput = z.infer<typeof linkInputSchema>;

export const linkCreateSchema = linkInputSchema;

export const linkUpdateSchema = z.object({
  id: z.string().cuid("Invalid resource id"),
  ...commonMetadataFields,
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .url("Enter a valid URL (include https://)")
    .max(2048, "URL must be 2048 characters or fewer"),
});

export type LinkUpdateInput = z.infer<typeof linkUpdateSchema>;

/* -------------------------------------------------------------------------- */
/* File resources (metadata validated in Zod; file bytes validated separately) */
/* -------------------------------------------------------------------------- */

export const fileResourceMetadataSchema = z.object(commonMetadataFields);

export type FileResourceMetadata = z.infer<typeof fileResourceMetadataSchema>;

export const fileResourceUpdateSchema = fileResourceMetadataSchema.extend({
  id: z.string().cuid("Invalid resource id"),
});

export type FileResourceUpdateInput = z.infer<typeof fileResourceUpdateSchema>;

export type FileValidationIssue = {
  message: string;
  field?: "file";
};

/**
 * Validate an uploaded file against the target resource type.
 * Returns null when valid, or a user-friendly error message.
 */
export function validateUploadedFile(
  type: ResourceTypeId,
  file: { name: string; size: number; type?: string }
): string | null {
  if (!isFileResourceType(type)) {
    return `"${type}" is not a supported file resource type.`;
  }

  const config = FILE_TYPE_CONFIG[type as FileResourceTypeId];
  const extension = getFileExtension(file.name);

  if (!extension) {
    return "File must have a valid extension (for example .pdf or .png).";
  }

  if (!config.extensions.includes(extension)) {
    return `Unsupported file type for ${type}. Allowed extensions: ${config.extensions.join(", ")}.`;
  }

  const maxSize = getMaxFileSizeBytes();
  if (file.size <= 0) {
    return "The selected file is empty.";
  }

  if (file.size > maxSize) {
    return `File is too large (${formatFileSize(file.size)}). Maximum allowed size is ${formatFileSize(maxSize)}.`;
  }

  // Strict MIME checks for types where browsers report reliably
  if ((type === "PDF" || type === "IMAGE") && file.type) {
    const normalized = file.type.toLowerCase();
    if (!config.mimeTypes.includes(normalized)) {
      const expected = config.mimeTypes.filter(Boolean).join(", ");
      return `Invalid file type (${file.type}). Expected: ${expected}.`;
    }
  }

  // Office formats often use generic MIME types — extension check above is primary.
  if ((type === "PDF" || type === "IMAGE") && !file.type) {
    // Allow missing MIME only if extension already matched (browser quirk).
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Shared CRUD / query schemas                                                 */
/* -------------------------------------------------------------------------- */

export const resourceIdSchema = z.object({
  id: z.string().cuid("Invalid resource id"),
});

export type ResourceIdInput = z.infer<typeof resourceIdSchema>;

export const resourceQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  category: z.string().trim().max(60).optional().default(""),
  type: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((value) => value === "" || (RESOURCE_TYPE_IDS as string[]).includes(value), {
      message: "Unsupported resource type filter",
    }),
  favorites: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
});

export type ResourceQueryInput = z.infer<typeof resourceQuerySchema>;

export const RESOURCE_TYPE_LABEL = RESOURCE_TYPE.LINK;
export const FILE_RESOURCE_TYPE_IDS = FILE_RESOURCE_TYPES;
