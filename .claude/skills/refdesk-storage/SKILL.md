---
name: refdesk-storage
description: This skill should be used when working on refdesk file storage — Cloudflare R2, local uploads, the storage abstraction layer, upload validation (extensions, MIME, max size), storage keys, download/open URLs, API routes under /api/resources or /api/files, or when the user mentions upload, R2, storageKey, file download, or "where do files go".
---

# refdesk File Storage

## Architecture (do not bypass)

```
Next.js UI / Server Actions / API routes
        → Storage abstraction (src/lib/storage/)
            → Cloudflare R2 (production / Vercel)   STORAGE_PROVIDER=r2
            → Local ./uploads (development only)    STORAGE_PROVIDER=local
```

Resource code calls **only** `getStorage()` from `src/lib/storage/index.ts`. Never import `r2.ts` or `local.ts` from actions/UI.

## Provider interface

`src/lib/storage/types.ts`:

- `putObject({ key, body, contentType, fileName })`
- `deleteObject(key)` — missing object = success
- `getDownloadUrl(key, { download?, fileName? })`
- `getPreviewUrl(key)` — falls back to download URL

Factory (`src/lib/storage/index.ts`) caches one provider instance.

## Configuration

| Variable | Role |
|----------|------|
| `STORAGE_PROVIDER` | `r2` \| `local` (auto: r2 if R2 vars present, else local) |
| `R2_ACCOUNT_ID` | Cloudflare account |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API token |
| `R2_BUCKET_NAME` | e.g. `refdesk-uploads` |
| `R2_PUBLIC_URL` | optional public URL (skips signed URLs) |
| `MAX_FILE_SIZE_BYTES` | default 10485760 (10 MiB) |

**Vercel:** must use `r2`. Local storage is ephemeral on serverless — never production.

## Storage key format

```
resources/{type}/{uuid}/{safeFileName}
```

Example: `resources/pdf/a1b2…/budget-2026.pdf`

- `type` lowercase enum value
- random UUID folder prevents collisions
- `sanitizeFileName` strips path segments / unsafe characters

DB stores `storageKey`, `fileName`, `mimeType`, `fileSize` — not the bytes.

## Upload path (server)

1. Client sends `FormData` to `createFileResource`
2. Reject if type invalid or not file-backed
3. `validateUploadedFile(type, { name, size, type })` — extension + size + strict MIME for PDF/image
4. `getStorage().putObject(...)`
5. `prisma.resource.create` with metadata
6. On DB failure: best-effort `deleteObject(storageKey)` then return error

## Validation rules

- Allowed extensions per type in `FILE_TYPE_CONFIG` (`src/lib/constants.ts`)
- Empty file rejected
- Size > `getMaxFileSizeBytes()` rejected with human-readable size
- PDF/IMAGE: MIME must match when browser reports a type
- Office formats: extension is primary (generic MIME common)

Mirror the same checks in the client form before submit; server always re-validates.

## Open / download

| Route | Behavior |
|-------|----------|
| `GET /api/resources/[id]/file` | 302 to signed/app URL (view/inline) |
| `GET /api/resources/[id]/file?download=1` | 302 with attachment disposition |
| `GET /api/files/[...key]` | **Local dev only** — streams `./uploads` |

R2: presigned GET (1h) or `R2_PUBLIC_URL` shortcut.  
Local: `/api/files/{key}` route reads disk.

## Delete

1. Delete DB row first (app stays consistent)
2. Best-effort `deleteObject(storageKey)` if present
3. Log storage failures; orphaned objects are acceptable vs broken UI

## Common failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| “R2 is not configured” | missing R2 env | set vars + `STORAGE_PROVIDER=r2` |
| Upload rejected “Unsupported file type” | extension/MIME mismatch | check `FILE_TYPE_CONFIG` |
| “File is too large” | over max size | raise `MAX_FILE_SIZE_BYTES` or shrink file |
| 404 on file open | bad `storageKey` or R2 key missing | verify bucket contents / local file |
| Works in dev, gone on Vercel | `STORAGE_PROVIDER=local` | switch to R2 on Vercel |

## When changing storage

1. Keep the `StorageProvider` interface stable
2. Add a new provider class + factory branch — do not fork resource actions
3. Never write permanent files to disk in production paths
4. Re-run: `npx tsc --noEmit`, `npm run lint`, `npm run build`
5. Update `.env.example` and README if new env vars appear

## Output to the user

State: provider used, validation rules, env vars needed, files touched, and which checks passed.
