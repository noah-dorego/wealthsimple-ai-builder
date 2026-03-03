# Feed Refresh Options — Feasibility Analysis

Margin's feed checks Canadian regulatory sources for new bulletins. This document evaluates approaches for automating that refresh, from simplest to most complex.

---

## Options

| Option | Feasibility | Notes |
|---|---|---|
| **Manual (current)** | ✅ Done | User-initiated "Check All" button. Simple, zero infra. No automation. |
| **Client polling** | ✅ Easy | `useEffect` + `setInterval` in `CheckAllButton` triggers check-all every N minutes while the page is open. ~10 lines. Only runs while the feed page is open. |
| **OS cron (dev)** | ✅ Easy for dev | `crontab` entry calling `curl -X POST http://localhost:3000/api/feed/check-all`. Not portable. |
| **Vercel Cron** | ✅ Easy for prod | `vercel.json` cron job hitting `/api/feed/check-all`. Free tier: 1/day. Paid: up to 1/min. Deploy-dependent. |
| **`node-cron` in instrumentation** | 🟡 Medium | `instrumentation.ts` registers a cron schedule on server boot. Works self-hosted. Risk: doesn't work with Next.js edge/serverless deploys. |
| **GitHub Actions** | 🟡 Medium | Scheduled workflow that POSTs to a deployed URL. Free. Requires public/deployed instance. |
| **SSE / WebSocket** | 🔴 High complexity | Real-time push when new items are found. Requires SSE endpoint + client listener. Significant overkill for a polling use case. |

---

## Details

### Manual (current)
The "Check All" button on the feed page POSTs to `/api/feed/check-all`, which sequentially fetches each source and upserts any new article links. No automation — the user must click each time.

**Best for:** Development and low-frequency monitoring needs.

---

### Client polling
Add a `useEffect` in `CheckAllButton` (or a new wrapper) that calls the check-all endpoint on an interval:

```typescript
useEffect(() => {
  const id = setInterval(async () => {
    await fetch('/api/feed/check-all', { method: 'POST' })
    router.refresh()
  }, 30 * 60 * 1000) // every 30 minutes
  return () => clearInterval(id)
}, [])
```

**Pros:** ~10 lines, works immediately, no infrastructure.
**Cons:** Only refreshes while the feed page is open in a browser tab.

---

### OS cron (dev)
Add a crontab entry on your development machine:

```
*/30 * * * * curl -X POST http://localhost:3000/api/feed/check-all
```

**Pros:** Runs independently of the browser, easy to set up.
**Cons:** Tied to your local machine and running dev server. Not portable to other environments.

---

### Vercel Cron
Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/feed/check-all",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Pros:** Native to Vercel hosting, declarative, reliable.
**Cons:** Requires deployment to Vercel. Free tier limited to once per day; paid plans allow up to 1/minute.

---

### `node-cron` in instrumentation
Create `instrumentation.ts` at the project root and register a cron job on server boot using the `node-cron` package:

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = await import('node-cron')
    cron.schedule('*/30 * * * *', async () => {
      await fetch('http://localhost:3000/api/feed/check-all', { method: 'POST' })
    })
  }
}
```

**Pros:** Self-contained within the app, works on any Node.js host.
**Cons:** Doesn't work on Vercel or other serverless/edge platforms. Requires `node-cron` dependency.

---

### GitHub Actions
Add a scheduled workflow that hits the deployed app:

```yaml
# .github/workflows/feed-refresh.yml
on:
  schedule:
    - cron: '0 * * * *'
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST ${{ secrets.APP_URL }}/api/feed/check-all
```

**Pros:** Free, runs on GitHub's infrastructure, no changes to the app.
**Cons:** Requires a publicly accessible deployed instance. Adds CI/CD complexity.

---

### SSE / WebSocket
Implement a Server-Sent Events endpoint that streams new items to clients in real time as sources are checked:

```
GET /api/feed/stream → EventSource that pushes new items as they're found
```

**Pros:** True real-time updates without polling.
**Cons:** Significantly more complex (SSE endpoint, connection management, client-side EventSource). Overkill for a use case where sources update at most a few times per day.

---

## FCAC Note

FCAC's source (`/en/news/advanced-news-search/news-results.html`) is a JavaScript-rendered search page. Simple HTML parsing via `node-html-parser` will likely return few or no article links because the content is loaded dynamically. If FCAC coverage is important, options include:

1. **Manual monitoring** — check FCAC directly when needed.
2. **Playwright/Puppeteer** — headless browser to render the page before parsing. Adds significant complexity and a Node.js runtime dependency.
3. **Find a static RSS/Atom feed** — FCAC may publish one; check their developer resources.

---

## Recommendation

**Start with client polling** — it's the lowest-effort approach (~10 lines) and works immediately without any infrastructure changes. When ready to deploy, migrate to **Vercel Cron** for reliable, hands-off automation.
