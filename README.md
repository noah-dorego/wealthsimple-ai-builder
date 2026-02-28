# RegScope

AI-native regulatory change impact analyzer for Canadian fintech.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: SQLite via better-sqlite3
- **AI**: Claude API via @anthropic-ai/sdk
- **Runtime**: Node.js v22

## Setup

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add your ANTHROPIC_API_KEY
   ```

3. **Start the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

4. **Optional: Seed the database**

   Add `.txt` files to `seed-documents/` following the naming convention:
   ```
   {SOURCE_AGENCY}_{descriptive-title}.txt
   ```
   Example: `CRA_tfsa-contribution-room-2025.txt`

   Then run:
   ```bash
   npx tsx db/seed.ts
   ```

## Project Structure

```
app/
  api/
    documents/          # GET list, POST create
      [id]/process/     # POST trigger AI pipeline
    changes/            # GET list with filters
      [id]/             # GET single change
      [id]/review/      # PATCH update review status
    stats/              # GET dashboard aggregates
  changes/[id]/         # Change detail page
  documents/            # Documents list page
    upload/             # Upload form page
  globals.css
  layout.tsx
  page.tsx              # Dashboard

db/
  schema.sql            # SQLite DDL
  seed.ts               # Seed script

lib/
  claude.ts             # Anthropic SDK wrapper
  db.ts                 # SQLite helpers (singleton + all CRUD)
  prompts.ts            # AI prompt builders
  taxonomy.ts           # Product taxonomy / regulatory domains
  types.ts              # Shared TypeScript types
  utils.ts              # cn(), formatDate(), color maps

seed-documents/         # Drop .txt files here to seed
components/ui/          # shadcn components
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npx tsc --noEmit` | Type-check without emit |
| `npx tsx db/seed.ts` | Seed DB from seed-documents/ |
