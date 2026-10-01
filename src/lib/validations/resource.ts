import { z } from "zod";
import { RESOURCE_TYPE } from "@/lib/constants";

/**
 * Shared Zod schemas for the Resource model.
 * MVP validates LINK resources only; non-link types can extend this later.
 */

const tagsSchema = z
  .array(z.string().trim().min(1))
  .max(20)
  .default([]);

const baseResourceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .url("Enter a valid URL (include https://)")
    .max(2048, "URL must be 2048 characters or fewer"),
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
});

export const linkInputSchema = baseResourceSchema;

export type LinkInput = z.infer<typeof linkInputSchema>;

export const linkCreateSchema = linkInputSchema;

export const linkUpdateSchema = baseResourceSchema.extend({
  id: z.string().cuid("Invalid resource id"),
});

export type LinkUpdateInput = z.infer<typeof linkUpdateSchema>;

export const resourceIdSchema = z.object({
  id: z.string().cuid("Invalid resource id"),
});

export type ResourceIdInput = z.infer<typeof resourceIdSchema>;

export const resourceQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  category: z.string().trim().max(60).optional().default(""),
  favorites: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
});

export type ResourceQueryInput = z.infer<typeof resourceQuerySchema>;

export const RESOURCE_TYPE_LABEL = RESOURCE_TYPE.LINK;
