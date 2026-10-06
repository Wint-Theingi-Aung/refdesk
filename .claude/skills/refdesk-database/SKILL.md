---
name: refdesk-database
description: This skill should be used when working on refdesk's Prisma + Neon PostgreSQL database — schema changes, ResourceType enum updates, indexes, migrations vs db push, data safety for existing LINK rows, Prisma client regeneration, validating DATABASE_URL config, or when the user mentions Prisma, Neon, schema, migration, db push, or database errors.
---

# refdesk Database (Prisma + Neon)

## Stack

- **Provider:** Neon PostgreSQL (never Supabase)
- **ORM:** Prisma 5 (`prisma/schema.prisma`)
- **Connection:** `DATABASE_URL` only (pooled URL, `sslmode=require`)
- **Access helper:** `src/lib/prisma.ts` (singleton client)

## Commands

```bash
npx prisma validate          # schema syntax / validity
npx prisma generate          # emit client to node_modules/@prisma/client
npm run db:migrate           # LOCAL: create a migration (prisma migrate dev)
npm run db:deploy            # NEON: apply committed migrations (prisma migrate deploy)
npm run db:push              # LOCAL/dev prototyping only — do not use on Neon
npm run db:studio            # browse data
```

**Neon is Migrate-baselined:** `prisma/migrations/0001_baseline/` is already applied. Live schema matches `prisma/schema.prisma`.

**Rule:** after editing `schema.prisma`, always `prisma generate` before `tsc`/`build`. For schema changes that must reach Neon: create a migration locally (`npm run db:migrate`), commit it, then `npm run db:deploy`. Do **not** `db:push` Neon. Do **not** `prisma migrate dev` against existing Neon. **Never** `prisma migrate reset` on this database.

## Model overview

Single table `Resource`:

| Column | Type | Notes |
|--------|------|--------|
| `id` | cuid | PK |
| `type` | `ResourceType` | `LINK`, `PDF`, `EXCEL`, `PPTX`, `DOCX`, `IMAGE` |
| `title` | string | required |
| `url` | string? | links |
| `fileName` / `storageKey` / `mimeType` / `fileSize` | optional | files |
| `description` / `category` | optional | |
| `tags` | string[] | Postgres array |
| `favorite` | bool | default false |
| `createdAt` / `updatedAt` | DateTime | |

Indexes: `type`, `category`, `favorite`, `createdAt`, `fileName`.

## Safe change rules

1. **Additive first.** New columns → nullable or with defaults.
2. **Enum values:** adding `ResourceType` values is safe; existing rows keep their value.
3. **Never** `DROP` a column/table that holds live data without an explicit user request + backup plan.
4. **Do not** change cuids, tags array semantics, or timestamp behavior casually.
5. Type-specific data lives on the same row (`url` vs `storageKey`) — do not split tables unless the user asks.

## Data safety checklist (before deploy)

- [ ] Read current `prisma/schema.prisma`
- [ ] Confirm change is additive (or user explicitly wants a breaking change)
- [ ] `npx prisma validate`
- [ ] `npx prisma generate`
- [ ] `npm run db:migrate` only on a **local/dev** database to author the migration
- [ ] Commit migration folder; apply to Neon with `npm run db:deploy`
- [ ] Spot-check: `SELECT type, COUNT(*) FROM "Resource" GROUP BY type;`
- [ ] App still lists/edits/deletes existing `LINK` rows
- [ ] Did **not** run `db:push`, `migrate dev` against Neon, or `migrate reset`

## Query patterns used by the app

- List: `findMany` with optional `type`, `category`, `favorite`, `OR` on `title`/`url`/`description`/`fileName`/`tags`
- Stats: `count` + `groupBy({ by: ["type"], _count: { _all: true } })`
- Categories: `findMany` + `distinct: ["category"]`
- Mutations always `revalidatePath("/")` after write

Server code must go through `src/actions/resources.ts` or a thin API route — do not scatter raw Prisma calls in UI components.

## Common errors

| Error | Likely cause | Fix |
|-------|--------------|-----|
| `Environment variable not found: DATABASE_URL` | missing `.env` | copy `.env.example`, set Neon URL |
| `P1001` can't reach DB | bad host / SSL / network | check pooler URL + `sslmode=require` |
| `P2021` table does not exist | migration not applied to Neon | `npm run db:deploy` (never `db:push` on Neon) |
| Client types stale after schema edit | forgot generate | `npx prisma generate` |
| Invalid enum value | raw SQL insert of unknown type | use `ResourceType` values |

## Output to the user

State:

1. Exact schema diff (fields/enum/index)
2. Commands run
3. Whether data was preserved (counts before/after if relevant)
4. Any follow-up (e.g. set `STORAGE_PROVIDER` after file types are used)
