import { resolveStorageProvider } from "@/lib/constants";
import { LocalStorageProvider } from "@/lib/storage/local";
import { R2StorageProvider } from "@/lib/storage/r2";
import type { StorageProvider } from "@/lib/storage/types";

let cached: StorageProvider | null = null;

/**
 * Storage factory.
 *
 * Architecture:
 *   Next.js → Server Actions/API → Storage abstraction → File Storage (R2 | local)
 *
 * Switch providers by setting STORAGE_PROVIDER=r2|local (or omit and let env
 * auto-detect). Resource actions never import a concrete provider.
 */
export function getStorage(): StorageProvider {
  if (cached) return cached;

  const providerId = resolveStorageProvider();
  cached = providerId === "r2" ? new R2StorageProvider() : new LocalStorageProvider();
  return cached;
}

export type { StorageProvider } from "@/lib/storage/types";
export { StorageError } from "@/lib/storage/types";
