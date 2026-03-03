# Margin

AI-native regulatory finding impact analyzer for Canadian fintech.

## Summary

Margin monitors Canadian financial regulators and surfaces the findings that matter. A compliance analyst who previously spent hours manually scanning regulator websites can now open a dashboard and see structured, severity-ranked findings with affected products, recommended actions, and key quotes already extracted. It can also be used by other employees or investors who want a centralized method to stay in the loop with updates to financial news. Documents come in via a live feed (scraped from regulator publication pages), manual upload, or URL paste; the AI pipeline handles the rest.

What AI is responsible for: reading raw regulatory text and producing structured output. It provides a finding summary, severity rating with rationale, list of affected Wealthsimple products, recommended actions, supporting quotes, and a confidence score. It runs twice per document: once to extract all discrete findings, once per finding to assess product impact.

Where AI must stop: AI output is a starting point, not a decision. It cannot verify whether a finding actually applies to a specific business arrangement, assess legal liability, or substitute for a compliance officer's sign-off. Severity ratings are model judgements, not legal opinions. The model should be fine-tuned according to Wealthsimple's standards, and every finding should be reviewed by a human before triggering any remediation work.

What would break first at scale: SQLite. The current architecture uses a single file database with a WAL-mode singleton. This is sufficient for one user and dozens of documents, but not for concurrent writes across multiple server instances or hundreds of simultaneous ingests. The second bottleneck is the AI pipeline: extraction and assessment are sequential synchronous calls, so processing large documents or many feed items at once will queue behind each other. Both are solvable (Postgres, a job queue), but neither is necessary at the current scale.

As this is a demo built in a week, the infrastructure would need to be updated for this system to be scalable.

## Regulators

The feed monitors the following Canadian financial regulators:

| Key               | Full Name                                                    |
| ----------------- | ------------------------------------------------------------ |
| `CRA`             | Canada Revenue Agency                                        |
| `CIRO`            | Canadian Investment Regulatory Organization                  |
| `OSC`             | Ontario Securities Commission                                |
| `CSA`             | Canadian Securities Administrators                           |
| `FINTRAC`         | Financial Transactions and Reports Analysis Centre of Canada |
| `OSFI`            | Office of the Superintendent of Financial Institutions       |
| `FCAC`            | Financial Consumer Agency of Canada                          |
| `Dept-of-Finance` | Department of Finance Canada                                 |
| `Payments-Canada` | Payments Canada                                              |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: SQLite via better-sqlite3
- **AI**: Claude API
- **Runtime**: Node.js v22
- **Infra**: Hosted with Railway

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
   {SOURCE_REGULATOR}_{descriptive-title}.txt
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
    findings/            # GET list with filters
      [id]/             # GET single finding
      [id]/review/      # PATCH update review status
    stats/              # GET dashboard aggregates
  findings/[id]/         # Finding detail page
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

| Command              | Description                  |
| -------------------- | ---------------------------- |
| `npm run dev`        | Start dev server             |
| `npm run build`      | Production build             |
| `npx tsc --noEmit`   | Type-check without emit      |
| `npx tsx db/seed.ts` | Seed DB from seed-documents/ |
