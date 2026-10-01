"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  linkCreateSchema,
  linkUpdateSchema,
  resourceIdSchema,
  resourceQuerySchema,
} from "@/lib/validations/resource";
import { RESOURCE_TYPE } from "@/lib/constants";
import type { ActionResult, ResourceDTO, ResourceFilters } from "@/types/resource";

type PrismaResource = {
  id: string;
  type: string;
  title: string;
  url: string | null;
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
    type: resource.type as ResourceDTO["type"],
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

export async function getResources(filters: ResourceFilters = {}): Promise<ResourceDTO[]> {
  const parsed = resourceQuerySchema.safeParse({
    search: filters.search ?? "",
    category: filters.category ?? "",
    favorites: filters.favorites ? "true" : "false",
  });

  if (!parsed.success) {
    return [];
  }

  const { search, category, favorites } = parsed.data;

  const where = {
    type: RESOURCE_TYPE.LINK,
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { url: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
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
  categories: string[];
}> {
  const [total, favorites, categoryRows] = await Promise.all([
    prisma.resource.count({ where: { type: RESOURCE_TYPE.LINK } }),
    prisma.resource.count({ where: { type: RESOURCE_TYPE.LINK, favorite: true } }),
    prisma.resource.findMany({
      where: { type: RESOURCE_TYPE.LINK, category: { not: null } },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  return {
    total,
    favorites,
    categories: categoryRows
      .map((row) => row.category)
      .filter((value): value is string => Boolean(value)),
  };
}

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

export async function deleteLink(input: unknown): Promise<ActionResult<{ id: string }>> {
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

    if (!existing || existing.type !== RESOURCE_TYPE.LINK) {
      return { success: false, error: "Link not found." };
    }

    await prisma.resource.delete({ where: { id: parsed.data.id } });

    revalidatePath("/");
    return { success: true, data: { id: parsed.data.id } };
  } catch (error) {
    console.error("deleteLink failed:", error);
    return { success: false, error: "Could not delete the link. Please try again." };
  }
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

    if (!existing || existing.type !== RESOURCE_TYPE.LINK) {
      return { success: false, error: "Link not found." };
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
