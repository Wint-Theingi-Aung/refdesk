import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { resolveLocalUploadPath } from "@/lib/storage/local";
import { getFileExtension } from "@/lib/constants";

export const dynamic = "force-dynamic";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
};

/**
 * Serve files from local ./uploads (development only).
 * Production should use Cloudflare R2 and never rely on this route.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { key: string[] } }
) {
  try {
    const key = params.key.join("/");
    const filePath = resolveLocalUploadPath(key);

    const info = await stat(filePath);
    if (!info.isFile()) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const extension = getFileExtension(path.basename(filePath));
    const contentType = MIME_BY_EXTENSION[extension] || "application/octet-stream";
    const download = request.nextUrl.searchParams.get("download") === "1";
    const fileName = path.basename(filePath);

    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Cache-Control": "private, max-age=0, must-revalidate",
        "Content-Disposition": download
          ? `attachment; filename="${fileName.replace(/"/g, "")}"`
          : `inline; filename="${fileName.replace(/"/g, "")}"`,
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
    console.error("GET /api/files failed:", error);
    return NextResponse.json({ error: "Could not read file." }, { status: 500 });
  }
}
