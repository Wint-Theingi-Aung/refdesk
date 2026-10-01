import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  StorageError,
  type GetObjectUrlOptions,
  type PutObjectInput,
  type StorageProvider,
} from "@/lib/storage/types";

/**
 * Local filesystem storage — development only.
 *
 * Vercel serverless functions have ephemeral storage; production must use
 * an external provider (Cloudflare R2 by default). This adapter exists so
 * local development works without cloud credentials.
 */

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

function resolveKeyPath(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) {
    throw new StorageError("Invalid storage key.");
  }
  const fullPath = path.join(UPLOAD_ROOT, normalized);
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(UPLOAD_ROOT))) {
    throw new StorageError("Invalid storage key.");
  }
  return resolved;
}

export class LocalStorageProvider implements StorageProvider {
  readonly id = "local" as const;

  async putObject(input: PutObjectInput): Promise<void> {
    const filePath = resolveKeyPath(input.key);
    try {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, input.body);
    } catch (error) {
      throw new StorageError("Failed to save file locally.", { cause: error });
    }
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = resolveKeyPath(key);
    try {
      await unlink(filePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code === "ENOENT") return;
      throw new StorageError("Failed to delete local file.", { cause: error });
    }
  }

  async getDownloadUrl(key: string, _options: GetObjectUrlOptions = {}): Promise<string> {
    const encoded = key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `/api/files/${encoded}`;
  }

  async getPreviewUrl(key: string): Promise<string> {
    return this.getDownloadUrl(key);
  }
}

export function getLocalUploadRoot(): string {
  return UPLOAD_ROOT;
}

export function resolveLocalUploadPath(key: string): string {
  return resolveKeyPath(key);
}
