import type { Resource } from "@prisma/client";

/** Serialized resource shape used by UI components (Dates → ISO strings). */
export type ResourceDTO = Omit<Resource, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

export type ResourceStats = {
  total: number;
  favorites: number;
};

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export type ResourceFilters = {
  search?: string;
  category?: string;
  favorites?: boolean;
};
