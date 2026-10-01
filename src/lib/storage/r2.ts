import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  StorageError,
  type GetObjectUrlOptions,
  type PutObjectInput,
  type StorageProvider,
} from "@/lib/storage/types";

/**
 * Cloudflare R2 via the S3-compatible API.
 *
 * R2 is a practical free option for Vercel apps:
 * - No egress fees on public buckets
 * - Generous free storage tier
 * - S3-compatible, so any S3-compatible provider can be swapped in later
 */

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string;
};

function readR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, "") || undefined;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new StorageError(
      "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME in your environment."
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

export class R2StorageProvider implements StorageProvider {
  readonly id = "r2" as const;

  private client: S3Client | null = null;
  private config: R2Config | null = null;

  private ensureConfig(): R2Config {
    if (!this.config) {
      this.config = readR2Config();
    }
    return this.config;
  }

  private getClient(): S3Client {
    const config = this.ensureConfig();
    if (!this.client) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
    }
    return this.client;
  }

  async putObject(input: PutObjectInput): Promise<void> {
    const config = this.ensureConfig();
    try {
      await this.getClient().send(
        new PutObjectCommand({
          Bucket: config.bucketName,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType || "application/octet-stream",
          Metadata: {
            "original-filename": input.fileName,
          },
        })
      );
    } catch (error) {
      throw new StorageError("Failed to upload file to Cloudflare R2.", { cause: error });
    }
  }

  async deleteObject(key: string): Promise<void> {
    const config = this.ensureConfig();
    try {
      await this.getClient().send(
        new DeleteObjectCommand({
          Bucket: config.bucketName,
          Key: key,
        })
      );
    } catch (error) {
      throw new StorageError("Failed to delete file from Cloudflare R2.", { cause: error });
    }
  }

  async getDownloadUrl(key: string, options: GetObjectUrlOptions = {}): Promise<string> {
    const config = this.ensureConfig();
    const fileName = options.fileName ?? key.split("/").pop() ?? "download";

    // Public bucket shortcut (optional)
    if (config.publicUrl) {
      const url = new URL(`${config.publicUrl}/${key}`);
      if (options.download) {
        url.searchParams.set("download", fileName);
      }
      return url.toString();
    }

    try {
      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        ...(options.download
          ? {
              ResponseContentDisposition: `attachment; filename="${fileName.replace(/"/g, "")}"`,
            }
          : {}),
      });
      return await getSignedUrl(this.getClient(), command, { expiresIn: 3600 });
    } catch (error) {
      throw new StorageError("Failed to create a signed download URL.", { cause: error });
    }
  }

  async getPreviewUrl(key: string): Promise<string> {
    return this.getDownloadUrl(key, { download: false });
  }
}
