"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStorage, StorageError } from "@/lib/storage";
import {
  linkCreateSchema,
  linkUpdateSchema,
  fileResourceMetadataSchema,
  fileResourceUpdateSchema,
  resourceIdSchema,
  resourceQuerySchema,
  validateUploadedFile,
} from "@/lib/validations/resource";
import {
  RESOURCE_TYPE,
  getMaxFileSizeBytes,
  isResourceType,
  isFileResourceType,
  type ResourceTypeId,
} from "@/lib/constants";
import { sanitizeFileName } from "@/lib/utils";
import type { ActionResult, ResourceDTO, ResourceFilters } from "@/types/resource";

type PrismaResource = {
  id: string;
  type: string;
  title: string;
  url: string | null;
  fileName: string | null;
  storageKey: string | null;
  mimeType: string | null;
  fileSize: number | null;
  description: string | null;
  category: string | null;
  tags: string[];
  favorite: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toDTO(resource: PrismaResource): ResourceDTO {
  return {
    ...resource,
    type: resource.type as ResourceTypeId,
    createdAt: resource.createdAt.toISOString(),
    updatedAt: resource.updatedAt.toISOString(),
  };
}

function fieldErrorsFromZod(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError || (error as Error)?.name === "StorageError";
}

/* -------------------------------------------------------------------------- */
/* Read                                                                        */
/* -------------------------------------------------------------------------- */

export async function getResources(filters: ResourceFilters = {}): Promise<ResourceDTO[]> {
  const parsed = resourceQuerySchema.safeParse({
    search: filters.search ?? "",
    category: filters.category ?? "",
    type: filters.type ?? "",
    favorites: filters.favorites ? "true" : "false",
  });

  if (!parsed.success) {
    return [];
  }

  const { search, category, type, favorites } = parsed.data;

  const where = {
    ...(type && isResourceType(type) ? { type } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { url: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { fileName: { contains: search, mode: "insensitive" as const } },
            { tags: { has: search } },
          ],
        }
      : {}),
    ...(category
      ? { category: { equals: category, mode: "insensitive" as const } }
      : {}),
    ...(favorites ? { favorite: true } : {}),
  };

  const resources = await prisma.resource.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return resources.map(toDTO);
}

export async function getResourceStats(): Promise<{
  total: number;
  favorites: number;
  byType: Record<ResourceTypeId, number>;
  categories: string[];
}> {
  const allTypes = Object.values(RESOURCE_TYPE) as ResourceTypeId[];

  const emptyByType = allTypes.reduce(
    (acc, type) => {
      acc[type] = 0;
      return acc;
    },
    {} as Record<ResourceTypeId, number>
  );

  const [total, favorites, byTypeRows, categoryRows] = await Promise.all([
    prisma.resource.count(),
    prisma.resource.count({ where: { favorite: true } }),
    prisma.resource.groupBy({
      by: ["type"],
      _count: { _all: true },
    }),
    prisma.resource.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  const byType = { ...emptyByType };
  for (const row of byTypeRows) {
    if (isResourceType(row.type)) {
      byType[row.type] = row._count._all;
    }
  }

  return {
    total,
    favorites,
    byType,
    categories: categoryRows
      .map((row) => row.category)
      .filter((value): value is string => Boolean(value)),
  };
}

/* -------------------------------------------------------------------------- */
/* Create                                                                      */
/* -------------------------------------------------------------------------- */

export async function createLink(input: unknown): Promise<ActionResult<ResourceDTO>> {
  const parsed = linkCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const created = await prisma.resource.create({
      data: {
        type: RESOURCE_TYPE.LINK,
        title: parsed.data.title,
        url: parsed.data.url,
        description: parsed.data.description || null,
        category: parsed.data.category || null,
        tags: parsed.data.tags,
        favorite: parsed.data.favorite,
      },
    });

    revalidatePath("/");
    return { success: true, data: toDTO(created) };
  } catch (error) {
    console.error("createLink failed:", error);
    return { success: false, error: "Could not create the link. Please try again." };
  }
}

/**
 * Create a file-backed resource from FormData.
 * formData: type, title, description?, category?, tags?, favorite?, file
 */
export async function createFileResource(
  formData: FormData
): Promise<ActionResult<ResourceDTO>> {
  const rawType = String(formData.get("type") ?? "");
  const file = formData.get("file");

  if (!isResourceType(rawType) || rawType === RESOURCE_TYPE.LINK) {
    return { success: false, error: "Select a valid file resource type." };
  }

  if (!file || !(file instanceof File)) {
    return {
      success: false,
      error: "Choose a file to upload.",
      fieldErrors: { file: ["A file is required."] },
    };
  }

  const tagsRaw = formData.get("tags");
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map(String)
    : String(tagsRaw ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

  const metadataParsed = fileResourceMetadataSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || null,
    category: String(formData.get("category") ?? "") || null,
    tags,
    favorite: formData.get("favorite") === "true" || formData.get("favorite") === "on",
  });

  if (!metadataParsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(metadataParsed.error),
    };
  }

  const fileError = validateUploadedFile(rawType as ResourceTypeId, {
    name: file.name,
    size: file.size,
    type: file.type,
  });

  if (fileError) {
    return {
      success: false,
      error: fileError,
      fieldErrors: { file: [fileError] },
    };
  }

  if (file.size > getMaxFileSizeBytes()) {
    return {
      success: false,
      error: "File exceeds the maximum allowed size.",
      fieldErrors: { file: ["File is too large."] },
    };
  }

  const safeName = sanitizeFileName(file.name);
  const folder = randomUUID();
  const storageKey = `resources/${rawType.toLowerCase()}/${folder}/${safeName}`;

  let body: Uint8Array;
  try {
    body = new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    console.error("createFileResource read failed:", error);
    return { success: false, error: "Could not read the uploaded file." };
  }

  try {
    await getStorage().putObject({
      key: storageKey,
      body,
      contentType: file.type || "application/octet-stream",
      fileName: safeName,
    });
  } catch (error) {
    console.error("createFileResource storage failed:", error);
    return {
      success: false,
      error: isStorageError(error)
        ? error.message
        : "File upload failed. Please try again.",
    };
  }

  try {
    const created = await prisma.resource.create({
      data: {
        type: rawType as ResourceTypeId,
        title: metadataParsed.data.title,
        fileName: safeName,
        storageKey,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        description: metadataParsed.data.description || null,
        category: metadataParsed.data.category || null,
        tags: metadataParsed.data.tags,
        favorite: metadataParsed.data.favorite,
      },
    });

    revalidatePath("/");
    return { success: true, data: toDTO(created) };
  } catch (error) {
    console.error("createFileResource db failed:", error);
    // Best-effort cleanup of uploaded object
    try {
      await getStorage().deleteObject(storageKey);
    } catch (cleanupError) {
      console.error("createFileResource cleanup failed:", cleanupError);
    }
    return {
      success: false,
      error: "Could not save the file resource. Please try again.",
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Update                                                                      */
/* -------------------------------------------------------------------------- */

export async function updateLink(input: unknown): Promise<ActionResult<ResourceDTO>> {
  const parsed = linkUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const { id, ...data } = parsed.data;

  try {
    const existing = await prisma.resource.findUnique({ where: { id } });

    if (!existing || existing.type !== RESOURCE_TYPE.LINK) {
      return { success: false, error: "Link not found." };
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        title: data.title,
        url: data.url,
        description: data.description || null,
        category: data.category || null,
        tags: data.tags,
        favorite: data.favorite,
      },
    });

    revalidatePath("/");
    return { success: true, data: toDTO(updated) };
  } catch (error) {
    console.error("updateLink failed:", error);
    return { success: false, error: "Could not update the link. Please try again." };
  }
}

/** Update metadata for any resource type (file bytes are not replaced here). */
export async function updateResource(input: unknown): Promise<ActionResult<ResourceDTO>> {
  const parsed = fileResourceUpdateSchema.safeParse(input);

  if (!parsed.success) {
    // Allow link-shaped payloads through the link schema as well
    const linkParsed = linkUpdateSchema.safeParse(input);
    if (!linkParsed.success) {
      return {
        success: false,
        error: "Please fix the highlighted fields.",
        fieldErrors: fieldErrorsFromZod(parsed.error),
      };
    }
    return updateLink(linkParsed.data);
  }

  const { id, ...data } = parsed.data;

  try {
    const existing = await prisma.resource.findUnique({ where: { id } });

    if (!existing) {
      return { success: false, error: "Resource not found." };
    }

    // Links also need URL updates when provided in payload
    const linkParsed = linkUpdateSchema.safeParse(input);
    const urlUpdate =
      existing.type === RESOURCE_TYPE.LINK && linkParsed.success
        ? { url: linkParsed.data.url }
        : {};

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description || null,
        category: data.category || null,
        tags: data.tags,
        favorite: data.favorite,
        ...urlUpdate,
      },
    });

    revalidatePath("/");
    return { success: true, data: toDTO(updated) };
  } catch (error) {
    console.error("updateResource failed:", error);
    return { success: false, error: "Could not update the resource. Please try again." };
  }
}

/**
 * Update a file-backed resource. When FormData includes a new file, stored
 * bytes are replaced (old object cleaned up). Without a file, metadata only.
 * formData: id, title, description?, category?, tags?, favorite?, file?
 */
export async function updateFileResource(
  formData: FormData
): Promise<ActionResult<ResourceDTO>> {
  const id = String(formData.get("id") ?? "");
  const idParsed = resourceIdSchema.safeParse({ id });
  if (!idParsed.success) {
    return { success: false, error: "Invalid resource id." };
  }

  const rawFile = formData.get("file");
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

  const tagsRaw = formData.get("tags");
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map(String)
    : String(tagsRaw ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

  const metadataParsed = fileResourceMetadataSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || null,
    category: String(formData.get("category") ?? "") || null,
    tags,
    favorite: formData.get("favorite") === "true" || formData.get("favorite") === "on",
  });

  if (!metadataParsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(metadataParsed.error),
    };
  }

  try {
    const existing = await prisma.resource.findUnique({ where: { id } });

    if (!existing) {
      return { success: false, error: "Resource not found." };
    }

    if (!isFileResourceType(existing.type)) {
      return {
        success: false,
        error: "This resource type does not support file replacement.",
      };
    }

    const metadataData = {
      title: metadataParsed.data.title,
      description: metadataParsed.data.description || null,
      category: metadataParsed.data.category || null,
      tags: metadataParsed.data.tags,
      favorite: metadataParsed.data.favorite,
    };

    // No new file: keep existing fileName/storageKey/mimeType/fileSize
    if (!file) {
      const updated = await prisma.resource.update({
        where: { id },
        data: metadataData,
      });
      revalidatePath("/");
      return { success: true, data: toDTO(updated) };
    }

    const type = existing.type as ResourceTypeId;
    const fileError = validateUploadedFile(type, {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (fileError) {
      return {
        success: false,
        error: fileError,
        fieldErrors: { file: [fileError] },
      };
    }

    const safeName = sanitizeFileName(file.name);
    const folder = randomUUID();
    const storageKey = `resources/${type.toLowerCase()}/${folder}/${safeName}`;

    let body: Uint8Array;
    try {
      body = new Uint8Array(await file.arrayBuffer());
    } catch (error) {
      console.error("updateFileResource read failed:", error);
      return { success: false, error: "Could not read the uploaded file." };
    }

    try {
      await getStorage().putObject({
        key: storageKey,
        body,
        contentType: file.type || "application/octet-stream",
        fileName: safeName,
      });
    } catch (error) {
      console.error("updateFileResource storage failed:", error);
      return {
        success: false,
        error: isStorageError(error)
          ? error.message
          : "File upload failed. Please try again.",
      };
    }

    const previousKey = existing.storageKey;
    try {
      const updated = await prisma.resource.update({
        where: { id },
        data: {
          ...metadataData,
          fileName: safeName,
          storageKey,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
        },
      });

      if (previousKey && previousKey !== storageKey) {
        try {
          await getStorage().deleteObject(previousKey);
        } catch (cleanupError) {
          console.error("updateFileResource old object cleanup failed:", cleanupError);
        }
      }

      revalidatePath("/");
      return { success: true, data: toDTO(updated) };
    } catch (error) {
      console.error("updateFileResource db failed:", error);
      try {
        await getStorage().deleteObject(storageKey);
      } catch (cleanupError) {
        console.error("updateFileResource cleanup failed:", cleanupError);
      }
      return {
        success: false,
        error: "Could not update the file resource. Please try again.",
      };
    }
  } catch (error) {
    console.error("updateFileResource failed:", error);
    return { success: false, error: "Could not update the file resource. Please try again." };
  }
}

/* -------------------------------------------------------------------------- */
/* Delete / favorite                                                           */
/* -------------------------------------------------------------------------- */

export async function deleteResource(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = resourceIdSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid resource id.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const existing = await prisma.resource.findUnique({ where: { id: parsed.data.id } });

    if (!existing) {
      return { success: false, error: "Resource not found." };
    }

    // Delete DB row first so the app stays consistent if storage cleanup fails
    await prisma.resource.delete({ where: { id: parsed.data.id } });

    if (existing.storageKey) {
      try {
        await getStorage().deleteObject(existing.storageKey);
      } catch (storageError) {
        // Orphaned object is acceptable; log for manual cleanup
        console.error("deleteResource storage cleanup failed:", storageError);
      }
    }

    revalidatePath("/");
    return { success: true, data: { id: parsed.data.id } };
  } catch (error) {
    console.error("deleteResource failed:", error);
    return { success: false, error: "Could not delete the resource. Please try again." };
  }
}

/** @deprecated Prefer deleteResource — kept for any external callers. */
export async function deleteLink(input: unknown): Promise<ActionResult<{ id: string }>> {
  return deleteResource(input);
}

export async function toggleFavorite(input: unknown): Promise<ActionResult<ResourceDTO>> {
  const parsed = resourceIdSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid resource id.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  try {
    const existing = await prisma.resource.findUnique({ where: { id: parsed.data.id } });

    if (!existing) {
      return { success: false, error: "Resource not found." };
    }

    const updated = await prisma.resource.update({
      where: { id: parsed.data.id },
      data: { favorite: !existing.favorite },
    });

    revalidatePath("/");
    return { success: true, data: toDTO(updated) };
  } catch (error) {
    console.error("toggleFavorite failed:", error);
    return { success: false, error: "Could not update favorite status." };
  }
}

/* -------------------------------------------------------------------------- */
/* File access helpers                                                         */
/* -------------------------------------------------------------------------- */

export async function getResourceFileUrl(
  input: unknown
): Promise<ActionResult<{ url: string; fileName: string }>> {
  const parsed = resourceIdSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid resource id.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  const query = parsed.data;

  try {
    const resource = await prisma.resource.findUnique({ where: { id: query.id } });

    if (!resource || !resource.storageKey) {
      return { success: false, error: "File not found for this resource." };
    }

    const url = await getStorage().getDownloadUrl(resource.storageKey, {
      download: false,
      fileName: resource.fileName ?? resource.title,
    });

    return {
      success: true,
      data: { url, fileName: resource.fileName ?? resource.title },
    };
  } catch (error) {
    console.error("getResourceFileUrl failed:", error);
    return {
      success: false,
      error: isStorageError(error)
        ? error.message
        : "Could not open the file. Please try again.",
    };
  }
}
