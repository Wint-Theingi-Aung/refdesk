# Agents — refdesk

Agent-facing instructions for working on **refdesk**, a Personal Resource Manager.

Full project instructions live in [`CLAUDE.md`](./CLAUDE.md). This file is the agent-oriented summary: constraints, dispatch guidance, and quality bars.

## What this project is

* Next.js 14 + TypeScript + Tailwind + shadcn-style UI
* **Neon PostgreSQL** + Prisma (not Supabase)
* Resource types: `LINK`, `PDF`, `EXCEL`, `PPTX`, `DOCX`, `IMAGE`
* Files stored via a **storage abstraction** (Cloudflare R2 in prod, `local` only in dev)
* Metadata in Neon; file bytes never in the database

## Hard constraints

* Keep existing **Link** CRUD/search/filter/favorite working
* Preserve existing database rows; schema changes must be **additive** when possible
* No authentication, AI features, sharing, or notifications unless asked
* No hard-coded credentials; secrets only in env vars
* Do not replace Neon, Prisma, or the storage abstraction without explicit instruction
* Do not invent features outside the requested scope

## When to dispatch which agent

| Agent | Use for |
|-------|---------|
| `resource-schema` | Prisma schema, enum/type changes, migrations, data-safety |
| `resource-ui` | Dashboard, sidebar, cards, forms, filters, responsive layout |
| `storage-layer` | Upload/download, R2/local providers, validation, file API routes |
| `resource-reviewer` | Review diffs before merge; catch scope creep and regressions |

Use skills when the task matches a named workflow:

| Skill | Trigger phrases / topics |
|-------|---------------------------|
| `add-resource-type` | New resource type (Note, Prompt, …), enum + model + UI + validation |
| `refdesk-database` | Prisma schema, Neon, `db:push`/`migrate`, indexes, data safety |
| `refdesk-storage` | File upload, R2, storage keys, download/open URLs, size limits |

## Shared contracts

* **Server actions** (`src/actions/resources.ts`) return:

  ```ts
  type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; fieldErrors?: Record<string, string[]> };
  ```

* **Zod** schemas live in `src/lib/validations/resource.ts`.
* **Storage** is accessed only via `getStorage()` from `src/lib/storage`.
* **File checks** use `validateUploadedFile` + `FILE_TYPE_CONFIG` in `src/lib/constants.ts`.
* **Filters** use URL params: `q`, `type`, `category`, `favorites`.

## Quality bar before reporting done

1. `npx tsc --noEmit` — clean  
2. `npm run lint` — clean  
3. `npx prisma validate` — if schema changed  
4. `npm run build` — succeeds  
5. Existing LINK resources still query/edit/delete correctly  
6. New errors are user-friendly (validation, storage, DB)

## Out of scope (do not implement unprompted)

* Auth / multi-user accounts  
* AI features  
* Sharing / public links beyond optional R2 public URL  
* Notifications  
* Exercise #4 meta-work is this agent/skill/CLAUDE setup only — do not expand it further unless asked  
