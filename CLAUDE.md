# refdesk — Project Instructions

refdesk is a **Personal Resource Manager** (Next.js 14 App Router) that stores links and uploaded files (PDF, Excel, PPTX, DOCX, image).

Database metadata lives in **Neon PostgreSQL** via Prisma. Uploaded files live in **Cloudflare R2** (S3-compatible) behind a storage abstraction; local `./uploads` is development-only.

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- shadcn/ui-style components (Radix + CVA) under `src/components/ui/`
- PostgreSQL (**Neon** — not Supabase)
- Prisma ORM
- Zod validation (client + server)
- Lucide React
- AWS SDK S3 client for R2

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (http://localhost:3000) |
| `npm run build` | `prisma generate` + Next.js production build |
| `npm start` | Production server |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npx tsc --noEmit` | TypeScript check |
| `npx prisma validate` | Validate schema |
| `npm run db:push` | Sync schema → Neon (additive-safe) |
| `npm run db:migrate` | Prisma migrations |
| `npm run db:studio` | Prisma Studio |

**After any Prisma schema change:** run `npx prisma generate`, then `npm run db:push` (or migrate), then `npm run build`.

## Architecture

```
UI (src/components/…)
  → Server actions (src/actions/resources.ts)
  → Storage abstraction (src/lib/storage/)  ← provider-agnostic
  → Cloudflare R2 | local ./uploads
```

DB access only through `src/lib/prisma.ts`. Never import a concrete storage provider outside `src/lib/storage/index.ts`.

### Key paths

| Path | Role |
|------|------|
| `prisma/schema.prisma` | Shared `Resource` model + `ResourceType` enum |
| `src/actions/resources.ts` | CRUD, favorite, stats, file URL actions |
| `src/lib/validations/resource.ts` | Zod schemas + `validateUploadedFile` |
| `src/lib/constants.ts` | Resource types, file ext/MIME config, size limits |
| `src/lib/storage/` | `types.ts`, `r2.ts`, `local.ts`, `index.ts` factory |
| `src/app/api/resources/[id]/file/` | Open/download stored files |
| `src/app/api/files/[...key]/` | Local-dev file streaming only |
| `src/components/resources/` | Dashboard, cards, forms, filters |
| `src/components/layout/` | App shell + sidebar type navigation |

## Resource model

Single `Resource` table with `type` discriminator:

- Types: `LINK`, `PDF`, `EXCEL`, `PPTX`, `DOCX`, `IMAGE`
- Shared: `title`, `description`, `category`, `tags[]`, `favorite`, timestamps
- Link: `url`
- Files: `fileName`, `storageKey`, `mimeType`, `fileSize`

**Extend later (Note, Prompt, …):** add enum value → reuse shared columns → add type-specific columns or side table → Zod + server action + UI branch. Do not redesign the table.

## Conventions

1. **Validate with Zod** on every server mutation; mirror key rules on the client.
2. **Server actions** return `ActionResult<T>`: `{ success: true, data } | { success: false, error, fieldErrors? }`.
3. **UI components** stay presentational; data mutations go through server actions.
4. **Filters** are URL search params (`q`, `type`, `category`, `favorites`) so pages stay shareable/SSR-friendly.
5. **File validation** (extension, MIME where strict, max size) lives in `validateUploadedFile` — use it, don’t reinvent.
6. **Storage keys:** `resources/{type}/{uuid}/{safeFileName}` via `sanitizeFileName`.
7. **Do not hard-code secrets.** Env only; `.env` is gitignored.
8. **Do not** implement auth, AI, sharing, or notifications unless explicitly requested.
9. **Do not** rewrite architecture or replace Neon / the storage abstraction without a clear need.
10. Keep changes scoped; do not touch unrelated files.

## Environment variables

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Neon pooled URL, `sslmode=require` |
| `STORAGE_PROVIDER` | `r2` (Vercel/prod) or `local` (dev) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | R2 credentials |
| `R2_PUBLIC_URL` | Optional public bucket URL |
| `MAX_FILE_SIZE_BYTES` | Optional; default 10 MiB |

Never commit `.env` or print secrets in logs, commits, or docs.

## Definition of done (feature work)

- [ ] TypeScript clean (`npx tsc --noEmit`)
- [ ] Lint clean (`npm run lint`)
- [ ] Prisma valid if schema touched (`npx prisma validate`)
- [ ] `npm run build` succeeds
- [ ] Existing LINK data not broken
- [ ] Zod validation for new mutations
- [ ] README / env example updated if behavior or config changed
