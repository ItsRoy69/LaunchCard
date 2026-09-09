# LaunchCard

Standalone Vite + React studio for polished launch assets. Runs entirely in the browser. Drafts stay on-device — no account, no API, no upload.

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

## Privacy & analytics

- Draft text lives in `localStorage`; logos/screenshots in IndexedDB.
- Share links encode only text + layout in the URL hash. Images are never included.
- Editing and export never upload card content.
- **Vercel Web Analytics** — last ~30 days visitors (Hobby). Enable in the Vercel project dashboard.
- **Lifetime page views** — `POST /api/views` increments a counter in Upstash Redis (connected as `launchcard-kv`). Count once per browser tab session. Read total with `GET /api/views` → `{ "total": N }`.
- Use **Clear local data** in the sidebar to wipe device drafts only (does not reset the global counter).

## Stack

Vite · React 19 · TypeScript · Tailwind CSS 4 · Zustand · Canvas 2D · Vercel Analytics · Upstash Redis

## License

MIT
