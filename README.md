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

## Privacy

- Draft text lives in `localStorage`; logos/screenshots in IndexedDB.
- Share links encode only text + layout in the URL hash. Images are never included.
- Editing and export never upload card content.
- **Vercel Web Analytics** counts page views / visitors and a few anonymous product events (export, copy, share). No draft text or images are sent. Enable **Web Analytics** (and optionally **Speed Insights**) on the Vercel project dashboard after deploy.
- Use **Clear local data** in the sidebar to wipe everything on this device.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS 4 · Zustand · Canvas 2D · Vercel Analytics

## License

MIT
