import type { Resource } from "@prisma/client";
import type { ResourceTypeId } from "@/lib/constants";

/** Serialized resource shape used by UI components (Dates → ISO strings). */
export type ResourceDTO = Omit<Resource, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  type: ResourceTypeId;
};

export type ResourceStats = {
  total: number;
  favorites: number;
  byType: Record<ResourceTypeId, number>;
  categories: string[];
};

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export type ResourceFilters = {
  search?: string;
  category?: string;
  type?: string;
  favorites?: boolean;
};
