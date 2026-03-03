# Margin — Implementation Roadmap

## Completed

### Phase 1 — Core Pipeline ✓
- SQLite DB via `better-sqlite3` (WAL mode, singleton, JSON array columns)
- AI pipeline: extraction → per-finding assessment → persist (`lib/pipeline.ts`)
- Full CRUD API routes for documents, findings, and stats
- Upload form (file drag-drop, URL, manual paste)
- Dashboard with severity bar, filter sidebar (severity / regulator / product), findings table
- Finding detail page (metadata, key quotes, actions, confidence bar)
- Documents list with per-document ProcessButton
- Error + 404 pages, Sonner toasts throughout

### Phase 2 — Regulatory Feed ✓
- `feed_sources` and `feed_items` tables; 10 pre-seeded Canadian regulator sources
- Per-source CSS selector map + full browser headers for scraping; RSS/HTML branch via `feed_type` column
- `extractArticleLinks()` and `extractRssItems()` shared helpers; max 5 items per source, `published_at` extraction
- Sources disabled where unavailable (CRA, CIRO News, FCAC, Dept-of-Finance)
- Feed page: collapsible source list with category filter, Rss/Globe icons, per-source Check button
- Feed inbox: category + source filter chips, 5-item default + "Show N more", title links open in new tab, Process / Dismiss actions
- CheckAllButton: auto-check on mount + 10-minute background polling
- `source_regulator` surfaced on findings via JOIN; Regulator column in findings table
- Hardcoded seed findings (5 docs, 6 findings) seeded on DB init — no Claude API calls required

---

## Phase 3 — Branding & Quality of Life

**Goal:** Ship a polished, named product ready for external viewing.

### 3.1 New name
- Brainstorm 5–8 candidates; pick one. Current codename: _Margin_.
- Update: page `<title>`, sidebar logo/wordmark, `package.json` name, repo name.
- Consider a simple SVG logo or text-based wordmark (no external assets needed).

### 3.2 Empty states
- Dashboard with zero findings: illustration + "No findings yet — ingest a document or check the feed."
- Feed inbox with zero items: "Check sources to discover new bulletins."
- Finding detail 404: back button + friendly message.

### 3.3 Sidebar toggle
- Collapse/expand button in the header or sidebar rail.
- Collapsed state shows icon-only nav; expanded shows icon + label.
- Persist preference in `localStorage`.

---

## Phase 4 — Railway Deployment

**Goal:** Live, persistent deployment accessible via public URL.

### 4.1 Environment setup
- `DATABASE_PATH` env var already implemented with auto-`mkdirSync`.
- Set `DATABASE_PATH=/data/margin.db` in Railway Variables.
- Mount a Railway Volume at `/data` for SQLite persistence across deploys.
- Set `ANTHROPIC_API_KEY` in Railway Variables.

### 4.2 Start command
Already configured: `"start": "tsx db/seed.ts && next start"` in `package.json`.
Railway will pick this up from `package.json` automatically.

### 4.3 Dockerfile (optional)
If nixpacks fails on `better-sqlite3` native bindings, add a minimal Dockerfile:
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 4.4 Checklist
- [ ] Create Railway project, connect GitHub repo
- [ ] Add Volume → mount at `/data`
- [ ] Set `DATABASE_PATH=/data/margin.db` and `ANTHROPIC_API_KEY`
- [ ] Deploy — confirm DB auto-creates on first boot
- [ ] Run one "Check All Sources" and ingest one article to verify end-to-end
- [ ] Set custom domain (optional)

---

## Phase 5 — Video Demo Script

**Goal:** 3–5 minute screen recording showcasing the full workflow for a non-technical audience.

### Scene 1 — Hook (0:00–0:20)
Open on the **Dashboard**. Several findings already visible (seeded): FINTRAC critical finding highlighted in red, OSC high findings, CIRO margin amendment. No narration yet — let the UI speak.

> _"This is Margin — an AI-powered tool that monitors Canadian financial regulators and surfaces the findings that matter."_

### Scene 2 — Dashboard walkthrough (0:20–1:00)
- Point out severity bar (critical / high / medium / low counts).
- Filter by "CRYPTO" product → findings narrow to OSC + FINTRAC items.
- Click into the FINTRAC LCTR finding → detail page.
- Walk through: summary, key quotes, recommended actions, confidence score.
- Click back.

### Scene 3 — Feed page (1:00–2:15)
- Navigate to **Feed**.
- Point out 10 source tiles — regulators auto-discovered.
- Feed inbox already has items (auto-checked on mount).
- Click **Check All Sources** → spinner, new items appear.
- Filter inbox by "Orders" category → OSC / FINTRAC items only.
- Filter by "OSFI" source chip → narrows further.

### Scene 4 — Live ingest (2:15–3:15)
- Pick a real feed item (e.g. an OSC order link).
- Click **Process →** → spinner for ~15–20 seconds.
- Toast: "2 findings extracted."
- Navigate to Dashboard → new findings visible at top of table.
- Click into the freshly ingested finding → full AI-generated detail.

### Scene 5 — Manual upload (3:15–3:45)
- Navigate to **Documents → Upload**.
- Paste a short regulatory text snippet.
- Click **Save Document** → click **Process** → findings appear.
- _"Any document — paste text, upload a PDF, or provide a URL."_

### Scene 6 — Close (3:45–4:00)
Return to Dashboard. All new findings visible.

> _"Margin turns regulatory noise into structured, actionable intelligence — automatically."_

### Recording tips
- Use demo seed data so the dashboard is never empty.
- Pre-check sources before recording so inbox items are ready.
- Record at 1440p or higher; zoom to 125% in browser for readability.
- Edit out the 15-second ingest wait with a cut or speed ramp.

---

## Package summary

| Package            | Purpose                                  |
| ------------------ | ---------------------------------------- |
| `node-html-parser` | Link extraction + HTML stripping         |
| `rss-parser`       | RSS/Atom XML parsing for CRA feed        |
| `better-sqlite3`   | Local SQLite (works on Railway + local)  |
| `@anthropic-ai/sdk`| Claude API calls for extraction/assessment|
| `uuid`             | Row ID generation                        |
| `tsx`              | Run seed + process scripts via npm start |
