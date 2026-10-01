import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorage, StorageError } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Open / download a stored file resource.
 * GET /api/resources/[id]/file            → view/inline
 * GET /api/resources/[id]/file?download=1 → attachment download
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resource = await prisma.resource.findUnique({ where: { id: params.id } });

    if (!resource || !resource.storageKey) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    const download = request.nextUrl.searchParams.get("download") === "1";
    const storage = getStorage();

    const url = await storage.getDownloadUrl(resource.storageKey, {
      download,
      fileName: resource.fileName ?? resource.title,
    });

    // Local provider returns an app-relative path — redirect to the files route
    return NextResponse.redirect(new URL(url, request.url), 302);
  } catch (error) {
    console.error("GET /api/resources/[id]/file failed:", error);
    if (error instanceof StorageError || (error as Error)?.name === "StorageError") {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Storage error." },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "Could not access file." }, { status: 500 });
  }
}
