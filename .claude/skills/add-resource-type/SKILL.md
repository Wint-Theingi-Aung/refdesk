---
name: add-resource-type
description: This skill should be used when adding a new refdesk resource type (for example Note, Prompt, Audio, Video, Code snippet), when the user says "add resource type", "support a new file type", "extend ResourceType enum", or asks how resource types are structured. Covers Prisma enum/model changes, Zod validation, server actions, storage/file fields, UI icons, sidebar nav, filters, and migration steps without breaking existing LINK or file data.
---

# Add a Resource Type to refdesk

refdesk stores multiple resource types in one `Resource` table with a `type` discriminator. Extending types is designed to be **additive** — never drop or rewrite existing columns/types that hold data.

## When to use

- Adding Note, Prompt, Audio, Video, or any new `ResourceType`
- Adding a new file extension/MIME under an existing file type (rare — prefer new type)
- Asking “how do resource types work in refdesk?”

## Do not

- Invent a separate database per type
- Remove or rename `LINK` / existing enum values
- Put auth, AI, or sharing into a “new type” unless explicitly asked
- Skip Zod or file validation

## Checklist (in order)

### 1. Prisma schema (`prisma/schema.prisma`)

1. Add the enum value to `ResourceType`.
2. Reuse shared columns: `title`, `description`, `category`, `tags`, `favorite`, timestamps.
3. Add **only** type-specific nullable columns if needed (e.g. `noteBody`, `promptText`, `mimeType`, `fileSize`).
4. Link-type rows keep `url`; file-type rows keep `fileName` / `storageKey` / `mimeType` / `fileSize`.
5. Add an index only if you filter/sort on a new column often.

Then run (Neon is Migrate-baselined with `0001_baseline`):

```bash
npx prisma validate
npx prisma generate
npm run db:migrate   # local: create the new migration folder
# commit prisma/migrations/<new_folder>/
npm run db:deploy    # Neon: apply committed migrations
```

Do **not** use `npm run db:push` on Neon. Do **not** `prisma migrate dev` against existing Neon. **Never** `prisma migrate reset` on this database. Keep `0001_baseline/migration.sql` unchanged.

### 2. Constants (`src/lib/constants.ts`)

1. Add the value to `RESOURCE_TYPE`.
2. Add `RESOURCE_TYPE_META` entry: `{ label, shortLabel, isFile, kind }`.
3. If file-backed:
   - Add to `FILE_RESOURCE_TYPES`
   - Add `FILE_TYPE_CONFIG[type]` with `extensions[]` and `mimeTypes[]`
4. Update icon map if you introduce `resourceTypeIcon` entries in `src/components/resources/resource-type-icon.tsx`.

### 3. Validation (`src/lib/validations/resource.ts`)

1. Extend `resourceTypeEnum` (it derives from `RESOURCE_TYPE_IDS`).
2. File types: ensure `validateUploadedFile` covers the new type via `FILE_TYPE_CONFIG`.
3. Link-like types: define create/update Zod schema (URL or body text as appropriate).
4. Metadata-only types (e.g. Note): extend `fileResourceMetadataSchema` pattern or add a dedicated schema; still validate length limits.

### 4. Server actions (`src/actions/resources.ts`)

1. `getResources` / `getResourceStats`: no special-case if the type uses the shared table — `groupBy` on `type` already counts new values once the enum exists.
2. Create path:
   - File-backed → extend or reuse `createFileResource` (FormData + `validateUploadedFile` + `getStorage().putObject` + DB create).
   - Text/URL-backed → follow `createLink` pattern (Zod parse → prisma.create → `revalidatePath("/")`).
3. Update/delete/favorite: operate on **any** resource id; do not hard-code `type === LINK` for delete/toggle.
4. Storage cleanup on delete only when `storageKey` is set.

### 5. UI

1. **Sidebar** (`src/components/layout/app-sidebar.tsx`): add nav item with icon; href `/?type=NEWTYPE`.
2. **Type filter** (`search-and-filter.tsx`): type select uses `RESOURCE_TYPE_IDS` — usually automatic.
3. **Stats** (`stats-cards.tsx`): by-type grid uses `RESOURCE_TYPE_IDS` — usually automatic.
4. **Card** (`resource-card.tsx`): branch on `isFileResourceType` / `kind` for open/download vs external link.
5. **Form dialog** (`resource-form-dialog.tsx`): add type option; show the right input (URL vs file vs textarea).
6. **Icon** (`resource-type-icon.tsx`): add Lucide icon mapping.

### 6. Env / storage (files only)

- Production: `STORAGE_PROVIDER=r2` + R2 env vars.
- Local: `STORAGE_PROVIDER=local` writes under `./uploads`.
- Keep keys as `resources/{type}/{uuid}/{safeFileName}`.

### 7. Verify

```bash
npx tsc --noEmit
npm run lint
npx prisma validate
npm run build
```

Manual: create one item of the new type, search it, filter by type, favorite, edit metadata, delete (confirm dialog).

## Output to the user

Report:

1. Enum + schema column changes (additive only)
2. Files touched
3. Validation rules added
4. UI touchpoints
5. Prisma command that was run
6. Checks that passed
7. Anything intentionally skipped
