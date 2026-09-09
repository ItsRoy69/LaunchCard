# LaunchCard

Standalone Vite + React studio for polished launch assets. Runs entirely in the browser. Drafts stay on-device — no account, no upload of card content.

[![License: MIT](https://img.shields.io/badge/License-MIT-stone.svg)](./LICENSE)

## Features

- **8 templates** — editorial, flex, split, terminal, poster, quiet, ledger, frame
- **7 export sizes** — OG, X post/header, square, Instagram, Product Hunt, story
- **6 palettes** + logo / screenshot marks
- **Live canvas** preview at 2×
- **PNG**, clipboard copy, and multi-size **ZIP pack**
- **Undo / redo** and **compact share links** (text + layout in the URL hash only)
- **IndexedDB** for images, localStorage for text — quota-safe
- Error boundary, 404 page, export progress, canvas skeleton

## Quick start

```bash
npm install
npm run dev
```

App runs at `http://localhost:8080`.

```bash
npm run build
npm run preview
```

## Keyboard

| Shortcut | Action |
|----------|--------|
| `⌘Z` / `Ctrl+Z` | Undo |
| `⌘⇧Z` / `Ctrl+⇧Z` / `Ctrl+Y` | Redo |
| `⌘S` / `Ctrl+S` | Download PNG |

## Analytics (admin dashboards only)

LaunchCard is a **Vite + React** SPA, so packages use **`/react`**, not `/next`:

```ts
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
```

| Tool | What you get | Where to look |
|------|----------------|---------------|
| **Vercel Analytics** | Visitors, page views, custom events | [Vercel](https://vercel.com) → Project → **Analytics** |
| **Speed Insights** | Web Vitals | Project → **Speed Insights** |
| **Microsoft Clarity** | Heatmaps, session replay | [clarity.microsoft.com](https://clarity.microsoft.com) |
| **Lifetime counter** | `GET /api/views` → `{ total }` | API / Redis only (not shown in the app UI) |

### Enable Clarity

1. Create a project at [clarity.microsoft.com](https://clarity.microsoft.com)
2. Copy the **Project ID** (Setup)
3. In Vercel → Project → Settings → Environment Variables:

```
VITE_CLARITY_PROJECT_ID=your_project_id
```

4. Redeploy

### Enable Vercel Analytics / Speed Insights

Project → **Analytics** / **Speed Insights** → Enable (code is already integrated).

### Lifetime page views (optional Redis)

Connect Upstash Redis / Vercel KV so `POST /api/views` can increment. Read with `GET /api/views`. This is for you as the operator — **not** displayed on the public site.

## Privacy

- Draft text: `localStorage`. Logos/screenshots: IndexedDB.
- Share links: text + layout in the URL hash only.
- Card content is never uploaded.
- Analytics (Vercel + optional Clarity) measure anonymous usage only; nothing is shown to end users in the UI.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS 4 · Zustand · Canvas 2D · Vercel Analytics · Microsoft Clarity (optional)

## License

MIT
