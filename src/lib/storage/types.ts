/**
 * Storage abstraction.
 *
 * Resource-management code depends only on this interface, so the underlying
 * provider (Cloudflare R2, S3, Vercel Blob, etc.) can be swapped later
 * without rewriting server actions or UI.
 */

export type PutObjectInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
  fileName: string;
};

export type GetObjectUrlOptions = {
  /** Suggest attachment download vs inline view */
  download?: boolean;
  fileName?: string;
};

export interface StorageProvider {
  readonly id: "r2" | "local";
  /** Upload a file object. Throws on failure. */
  putObject(input: PutObjectInput): Promise<void>;
  /** Delete a file object. Missing objects are treated as success. */
  deleteObject(key: string): Promise<void>;
  /**
   * Resolve a URL the browser can open or download.
   * May be a signed URL, public URL, or app-relative path (local dev).
   */
  getDownloadUrl(key: string, options?: GetObjectUrlOptions): Promise<string>;
  /** Optional public preview URL (e.g. images). Falls back to getDownloadUrl. */
  getPreviewUrl(key: string): Promise<string>;
}

export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageError";
  }
}
