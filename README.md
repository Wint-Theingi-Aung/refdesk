# refdesk

refdesk is a personal resource manager. This repository currently ships the **Links-only MVP**: save, browse, search, filter, favorite, edit, and delete links.

Future resource types (PDF, PPTX, Excel, notes, AI prompts) are intentionally not implemented yet, but the data model and code layout are structured so they can be added without a redesign.

## Tech stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui-style components (Radix primitives + CVA)
- PostgreSQL (**Neon**)
- Prisma ORM
- Zod
- Lucide React

## Project structure

```
refdesk/
├── prisma/
│   └── schema.prisma          # Resource model (LINK type for MVP)
├── src/
│   ├── actions/
│   │   └── resources.ts       # Server actions: CRUD + favorite + query
│   ├── app/
│   │   ├── error.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx           # Dashboard
│   ├── components/
│   │   ├── layout/
│   │   │   ├── app-shell.tsx
│   │   │   └── app-sidebar.tsx
│   │   ├── resources/
│   │   │   ├── dashboard.tsx
│   │   │   ├── delete-link-dialog.tsx
│   │   │   ├── resource-card.tsx
│   │   │   ├── resource-form-dialog.tsx
│   │   │   ├── resource-list.tsx
│   │   │   ├── search-and-filter.tsx
│   │   │   └── stats-cards.tsx
│   │   └── ui/                # shadcn-style primitives
│   ├── lib/
│   │   ├── constants.ts
│   │   ├── prisma.ts
│   │   ├── utils.ts
│   │   └── validations/
│   │       └── resource.ts    # Zod schemas
│   └── types/
│       └── resource.ts
├── .env.example
├── package.json
└── tailwind.config.ts
```

## Database schema (Prisma + PostgreSQL / Neon)

The MVP stores resources in a single `Resource` table with a `type` discriminator so future types can reuse shared fields:

| Field         | Type            | Notes                                      |
|---------------|-----------------|--------------------------------------------|
| `id`          | `String` (cuid) | Primary key                                |
| `type`        | `ResourceType`  | MVP: `LINK` only                           |
| `title`       | `String`        | Required                                   |
| `url`         | `String?`       | Required for links; reserved for other types |
| `description` | `String?`       | Optional                                   |
| `category`    | `String?`       | Free-text category                         |
| `tags`        | `String[]`      | PostgreSQL string array                    |
| `favorite`    | `Boolean`       | Default `false`                            |
| `createdAt`   | `DateTime`      | Auto                                       |
| `updatedAt`   | `DateTime`      | Auto-updated                               |

Indexes: `type`, `category`, `favorite`, `createdAt`.

### Future resource types

When adding PDF / PPTX / Excel / Note resources later:

1. Add the enum value in `prisma/schema.prisma` (e.g. `PDF`).
2. Reuse shared columns (`title`, `category`, `tags`, `favorite`, timestamps).
3. Add type-specific columns (e.g. `fileKey`, `mimeType`, `noteBody`) or a related detail table.
4. Keep Zod schemas and server actions per resource type (or generalize the existing ones).

## Configure PostgreSQL (Neon)

Credentials are **never hard-coded**. They live only in environment variables.

1. Create a free project at [https://neon.tech](https://neon.tech).
2. Open the Neon Console → **Connection Details**.
3. Copy the **pooled** connection string (recommended for Prisma / serverless).
4. Ensure the string includes `sslmode=require` (Neon requires SSL).
5. Create your env file:

```bash
cp .env.example .env
```

6. Paste your Neon URL into `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx.aws.neon.tech/neondb?sslmode=require"
```

Do **not** commit `.env`. `.gitignore` already excludes it.

## Initialize the database (Prisma)

From the project root:

```bash
# Install dependencies (first time)
npm install

# Generate the Prisma client
npx prisma generate

# Create/update tables in Neon from schema.prisma
# Use db push for MVP / prototypes:
npm run db:push

# Or create a proper migration history:
npm run db:migrate
```

Optional inspection tools:

```bash
npm run db:studio   # Prisma Studio UI
```

## Run the app locally

```bash
# Ensure .env exists and DATABASE_URL points at your Neon database
npm run db:push

# Start Next.js dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production-style build:

```bash
npm run build
npm start
```

## Implemented (Links-only MVP)

- Add a link (title, URL, description, category, tags, favorite)
- View all saved links on the dashboard
- Edit a link
- Delete a link (with confirmation dialog)
- Mark / unmark a link as Favorite
- Search links (title, URL, description, tags)
- Filter links by category
- Dashboard stats: total resources + favorite count
- Sidebar / navigation, responsive desktop + mobile layout
- Zod validation on all server mutations
- Prisma + PostgreSQL (Neon) via `DATABASE_URL`

## Intentionally NOT implemented yet

- Authentication / user accounts
- PDF, PPTX, Excel, or Note upload
- File storage
- AI features / prompt library
- Sharing
- Notifications
- Multi-user workspaces
- Other advanced features outside the MVP

## Useful scripts

| Script            | Purpose                          |
|-------------------|----------------------------------|
| `npm run dev`     | Start development server         |
| `npm run build`   | Prisma generate + Next.js build  |
| `npm start`       | Start production server          |
| `npm run db:generate` | Generate Prisma client       |
| `npm run db:push`     | Sync schema to Neon database |
| `npm run db:migrate`  | Create/manage migrations     |
| `npm run db:studio`   | Open Prisma Studio           |
