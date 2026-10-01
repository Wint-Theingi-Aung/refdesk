# Storage reference — refdesk

## File layout

```
src/lib/storage/
  types.ts    # StorageProvider interface + StorageError
  r2.ts       # Cloudflare R2 via S3-compatible AWS SDK
  local.ts    # Dev-only ./uploads adapter
  index.ts    # getStorage() factory (caches provider)
```

## R2 client notes

- Endpoint: `https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
- `region: "auto"`
- Presigned GET URLs expire in 3600 seconds
- Optional `R2_PUBLIC_URL` skips signing

## Local adapter notes

- Root: `path.join(process.cwd(), "uploads")`
- Keys must not contain `..`; paths are resolved under the upload root
- Served by `src/app/api/files/[...key]/route.ts`
- Add `uploads/` to `.gitignore` (already present)

## API routes

### `GET /api/resources/[id]/file`

1. Load resource by id
2. Require `storageKey`
3. `storage.getDownloadUrl(..., { download })`
4. Redirect 302 to signed URL or `/api/files/...`

Query: `?download=1` for attachment.

### `GET /api/files/[...key]`

Local only. Streams file with `Content-Type` from extension map and optional `Content-Disposition`.

## Env checklist for file types to work in prod

```
DATABASE_URL=postgresql://…neon.tech/neondb?sslmode=require
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=…
R2_ACCESS_KEY_ID=…
R2_SECRET_ACCESS_KEY=…
R2_BUCKET_NAME=…
```

## Size limit

Default 10 MiB (`DEFAULT_MAX_FILE_SIZE_BYTES`). Override with `MAX_FILE_SIZE_BYTES`.
Next.js `serverActions.bodySizeLimit` is set to `15mb` in `next.config.mjs` to leave headroom.
