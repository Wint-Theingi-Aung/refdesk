# refdesk

refdesk is a **Personal Resource Manager**. It stores and organizes:

- 🔗 Links
- 📄 PDFs
- 📊 Excel (`.xlsx`, `.xls`)
- 📽️ PPTX (`.pptx`, `.ppt`)
- 📝 DOCX (`.docx`, `.doc`)
- 🖼️ Images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`)

Database metadata lives in **Neon PostgreSQL**. Uploaded files live in **Cloudflare R2** (S3-compatible) via a storage abstraction layer, so the provider can be swapped later.

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui-style components (Radix primitives + CVA)
- PostgreSQL (**Neon**)
- Prisma ORM
- Zod
- Lucide React
- AWS SDK (S3-compatible client for Cloudflare R2)

## Architecture

```
Next.js (UI / Server Actions / API routes)
        │
        ▼
Storage abstraction (src/lib/storage)
        │
        ├── Cloudflare R2  (production / Vercel)   ← STORAGE_PROVIDER=r2
        └── Local ./uploads (development only)      ← STORAGE_PROVIDER=local
```

Resource-management logic never imports a concrete storage provider.

## Project structure

```
refdesk/
├── prisma/schema.prisma              # Multi-type Resource model
├── src/
│   ├── actions/resources.ts          # Server actions: CRUD, favorite, stats, file URLs
│   ├── app/
│   │   ├── api/
│   │   │   ├── resources/[id]/file/  # Open / download stored files
│   │   │   └── files/[...key]/       # Local dev file streaming
│   │   ├── error.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                  # Dashboard
│   ├── components/
│   │   ├── layout/                   # App shell + sidebar (type navigation)
│   │   ├── resources/                # Dashboard, cards, forms, filters, stats
│   │   └── ui/                       # shadcn-style primitives
│   ├── lib/
│   │   ├── constants.ts              # Resource types + file validation config
│   │   ├── prisma.ts
│   │   ├── storage/                  # Storage abstraction (r2 | local)
│   │   ├── utils.ts
│   │   └── validations/resource.ts   # Zod schemas
│   └── types/resource.ts
├── .env.example
└── README.md
```

## Database schema

Shared `Resource` table with a `type` discriminator:

| Field | Type | Notes |
|-------|------|--------|
| `id` | `String` (cuid) | Primary key |
| `type` | `ResourceType` | `LINK`, `PDF`, `EXCEL`, `PPTX`, `DOCX`, `IMAGE` |
| `title` | `String` | Required |
| `url` | `String?` | Link target |
| `fileName` | `String?` | Uploaded file name |
| `storageKey` | `String?` | Provider object key |
| `mimeType` | `String?` | Detected / declared MIME |
| `fileSize` | `Int?` | Bytes |
| `description` | `String?` | Optional |
| `category` | `String?` | Free-text |
| `tags` | `String[]` | Postgres array |
| `favorite` | `Boolean` | Default `false` |
| `createdAt` / `updatedAt` | `DateTime` | Auto |

Indexes: `type`, `category`, `favorite`, `createdAt`, `fileName`.

### Extending later (notes, prompts, etc.)

1. Add the enum value in `prisma/schema.prisma`
2. Reuse shared columns
3. Add type-specific columns or a related detail table
4. Add Zod schema + server action + UI branch

Existing `LINK` rows remain valid; file columns are nullable.

## Configure PostgreSQL (Neon)

Credentials are **never hard-coded**. They live only in environment variables.

1. Create a project at [neon.tech](https://neon.tech)
2. Neon Console → **Connection Details** → copy the **pooled** URL
3. Ensure `sslmode=require` is present
4. Copy the env template and fill in your values:

```bash
cp .env.example .env
```

```bash
# .env
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx.neon.tech/neondb?sslmode=require"
```

Do **not** commit `.env`.

## Configure file storage (Cloudflare R2)

For Vercel / production, use **Cloudflare R2**:

1. Create an R2 bucket (e.g. `refdesk-uploads`) at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Create an **R2 API token** with *Object Read & Write*
3. Copy Account ID, Access Key ID, Secret Access Key, and bucket name into `.env`
4. Set `STORAGE_PROVIDER="r2"`

```bash
STORAGE_PROVIDER="r2"
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="refdesk-uploads"
# optional public bucket URL (skips signed URLs)
# R2_PUBLIC_URL="https://pub-xxxx.r2.dev"
```

**Local development** can use `STORAGE_PROVIDER="local"` (files under `./uploads`). Local storage is **ephemeral on Vercel** and must not be used in production.

Default max upload size: **10 MiB** (override with `MAX_FILE_SIZE_BYTES`).

## Initialize the database (Prisma)

```bash
npm install
npx prisma generate

# Sync schema to Neon (additive — safe for existing LINK rows)
npm run db:push

# Or manage migrations
npm run db:migrate
```

Optional:

```bash
npm run db:studio
```

## Run the app locally

```bash
# 1. Configure .env (Neon DATABASE_URL + storage)
# 2. Push schema
npm run db:push

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For file uploads without R2, set `STORAGE_PROVIDER=local` in `.env`.

Production-style build:

```bash
npm run build
npm start
```

## Implemented

- Multi-type resources: Link, PDF, Excel, PPTX, DOCX, Image
- Add / view / edit / delete resources
- Favorite toggle
- Search across title, description, category, tags, **filename**
- Filters: resource type + category (+ favorites view)
- Dashboard counts by resource type
- Sidebar navigation for each type
- Type-aware resource cards (icons, metadata, open/download)
- File upload with validation:
  - Allowed extensions per type
  - MIME checks for PDF/images
  - Max file size (default 10 MiB)
  - Clear user-facing errors
- Storage abstraction (R2 / local) + file open/download API routes
- Zod validation (client + server)
- Neon PostgreSQL + Prisma

## Intentionally NOT implemented

- Authentication / user accounts
- AI features
- Sharing
- Notifications
- File replace-on-edit (delete + re-upload instead)
- Multi-user workspaces
- Public buckets / permanent public CDN URLs (signed URLs by default)
- Further agent/skill extensions beyond the Exercise #4 baseline in `.claude/`

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Prisma generate + Next.js build |
| `npm start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Sync schema to Neon |
| `npm run db:migrate` | Create/manage migrations |
| `npm run db:studio` | Open Prisma Studio |

## Vercel deployment

1. Push the project to GitHub
2. Import the repo in Vercel
3. Set environment variables in **Project → Settings → Environment Variables**:
   - `DATABASE_URL` (Neon pooled connection string)
   - `STORAGE_PROVIDER=r2`
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - optional `R2_PUBLIC_URL`, `MAX_FILE_SIZE_BYTES`
4. Build command: `npm run build` (includes `prisma generate`)
5. Run `npm run db:push` once (locally or via a one-off job) to apply schema changes to Neon
6. Deploy

> Do not set `STORAGE_PROVIDER=local` on Vercel — uploads will not persist.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `STORAGE_PROVIDER` | Recommended | `r2` or `local` (auto-detects R2 if R2 vars present) |
| `R2_ACCOUNT_ID` | For R2 | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | For R2 | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | For R2 | R2 API token secret |
| `R2_BUCKET_NAME` | For R2 | Bucket name |
| `R2_PUBLIC_URL` | Optional | Public bucket URL (skips signed URLs) |
| `MAX_FILE_SIZE_BYTES` | Optional | Default `10485760` (10 MiB) |

## Claude Code project setup (Exercise #4)

Agent-facing project config lives in this repository:

| Path | Purpose |
|------|---------|
| `CLAUDE.md` | Full project instructions (stack, commands, conventions, DoD) |
| `AGENTS.md` | Agent-oriented constraints and dispatch guide |
| `.claude/skills/add-resource-type/SKILL.md` | Adding new resource types safely |
| `.claude/skills/refdesk-database/SKILL.md` | Prisma + Neon schema/migration workflow |
| `.claude/skills/refdesk-storage/SKILL.md` | File storage / R2 / validation workflow |
| `.claude/skills/refdesk-storage/references/README-storage.md` | Storage implementation reference |
| `.claude/agents/resource-schema.md` | Schema & data-safety specialist |
| `.claude/agents/resource-ui.md` | Dashboard/UI specialist |
| `.claude/agents/storage-layer.md` | Upload/storage specialist |
| `.claude/agents/resource-reviewer.md` | Diff review specialist |

Claude Code loads `CLAUDE.md`/`AGENTS.md` automatically when working in this repo. Skills and agents can be invoked by name or dispatched when a task matches their description.

