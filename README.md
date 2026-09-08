# LaunchCard

Standalone Vite + React studio for polished launch assets. Runs entirely in the browser. Drafts stay on-device — no account, no API, no upload.

## Features

- **8 templates** — editorial, flex, split, terminal, poster, quiet, ledger, frame
- **7 export sizes** — OG, X post/header, square, Instagram, Product Hunt, story
- **6 palettes** + logo / screenshot marks
- **Live canvas** preview at 2×
- **PNG**, clipboard copy, and multi-size **ZIP pack**
- **Undo / redo** (⌘Z / ⌘⇧Z) and **shareable draft links** (text + layout in the URL hash)
- **IndexedDB** for images, localStorage for text — quota-safe
- **404 page** for unknown routes, error boundary, export progress, canvas skeleton

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

## Privacy

- No network calls for editing or export (fonts load from Google Fonts on first visit).
- Draft text lives in `localStorage`; logos/screenshots in IndexedDB.
- Share links encode only text + layout in the URL hash. Images are never included.
- Use **Clear local data** in the sidebar to wipe everything on this device.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS 4 · Zustand · Canvas 2D
