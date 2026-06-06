# Contributing

## Setup

```bash
git clone https://github.com/your-org/falcon
cd falcon
npm install
npm run dev   # http://localhost:3000
```

## Project layout

```
src/
  components/   Sidebar, Toolbar, AssetGrid, Inspector, QuickLook…
  store/        AssetContext.tsx — all state, persistence, IndexedDB
  lib/          utils.ts (formatters, color-bucket matching)
  data/         mockAssets.ts (seed data shown on first launch)
  types.ts      Shared TypeScript types
```

## Ground rules

- **No `any`.** TypeScript strict mode is on.
- **No new runtime dependencies** without opening an issue first. The goal is to keep the bundle small and the dependency tree shallow.
- **All global state lives in `AssetContext`.** Local UI state (open/closed dropdowns, draft values) stays in the component.
- **Styles via Tailwind utilities.** Touch `index.css` only for things Tailwind can't express inline — custom scrollbars, keyframe animations, global resets.
- **`npm run lint` must pass** (tsc --noEmit, zero errors) before opening a PR.

## Submitting changes

1. Fork the repo and create a branch — `fix/paste-crash`, `feat/zip-export`, etc.
2. Test manually in Chrome and Firefox.
3. Open a PR. Keep the description short: what changed and why.

## Bug reports

Please include browser + OS, steps to reproduce, and the browser console output if there's an error.

## Feature requests

Open an Issue first and describe the use case. Implementation details can be worked out together.
