# Falcon

A fast, keyboard-first digital asset manager that runs entirely in your browser.

Built as a free, open-source alternative to [Eagle](https://eagle.cool).

---

## What it does

Falcon lets you organise images, vectors, videos, audio files, PDFs and fonts — without any server, without any subscription, and without anything leaving your machine. Files are stored in the browser's IndexedDB; metadata lives in localStorage.

## Features

**Three view modes** — uniform grid, waterfall (natural aspect ratios), and list  
**Folders** — nested, drag-to-assign, right-click to rename or create subfolders  
**Smart Folders** — saved filters based on tags, type, rating, or starred state  
**Tags** — autocomplete, bulk-tag, sidebar tag cloud, filter by tag  
**Color labels** — 12 colour labels per asset, filterable  
**Color palette extraction** — dominant colours extracted from every imported image  
**Rating** — 0–5 stars; press `1`–`5` to rate the current selection  
**Quick Look** — `Space` to preview; `←` / `→` to step through results  
**Annotation** — draw and save freehand annotations on images  
**Rubber-band selection** — drag on empty space to select multiple assets  
**Batch operations** — star/unstar, tag, move to folder, rename, download, delete  
**Batch rename** — patterns like `{name}`, `{index}`, `{date}`  
**Duplicate detection** — SHA-256 fingerprint blocks importing the same file twice  
**Export / Import** — full library backup as JSON (blobs included as base64)  
**Library lock** — PIN-protected, hash stored locally  
**URL import** — paste a direct link; Falcon fetches and stores it  
**Clipboard import** — `⌘V` to paste an image directly from the clipboard  
**Undo** — `⌘Z` restores the last deleted batch  

## Getting started

```bash
git clone https://github.com/your-org/falcon
cd falcon
npm install
npm run dev   # → http://localhost:3000
```

### Build

```bash
npm run build  # outputs to dist/
```

Drop `dist/` on Vercel, Netlify, Cloudflare Pages, or any static host — no backend required.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Open / close Quick Look |
| `← →` | Previous / next asset in Quick Look |
| `⌘A` | Select all visible assets |
| `1`–`5` | Rate selected assets |
| `0` | Clear rating |
| `Delete` | Move to Trash |
| `⌘Z` | Undo last delete |
| `⌘V` | Paste image from clipboard |
| `Esc` | Close preview / clear selection |
| `⌘/` | Show all shortcuts |

## Storage

| What | Where |
|------|-------|
| Asset metadata (name, tags, rating, notes…) | `localStorage` |
| File blobs (images, videos, audio…) | IndexedDB |

Everything stays in the browser. Use **Export Library** (toolbar `···` menu) to create a portable backup before clearing browser data.

## Tech stack

- React 19 + TypeScript
- Tailwind CSS v4
- Vite 6
- Lucide React icons
- Web APIs: IndexedDB, Canvas, Clipboard, File System Access

## Roadmap

- [ ] ZIP batch export
- [ ] Figma / Sketch plugin to push assets directly
- [ ] Browser extension for one-click web asset capture
- [ ] Electron wrapper for unlimited local file storage
- [ ] Perceptual duplicate detection (image hashing)
- [ ] Multi-library support

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).
