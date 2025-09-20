# Roadmap App

Interactive product roadmap timeline built with React, TypeScript, Vite and Tailwind CSS.

## Features
- Lanes (with color + ordering) and Stages (swim‑lanes) management
- Roadmap items with date range, percent complete, owner, stage, lane, color
- Milestones per item with optional dates
- Quarter + month grid with adjustable start/end month & year
- LocalStorage persistence (versioned keys) and JSON export / import
- Single‑file production build (inlines all assets) for easy static hosting / embedding

## Prerequisites
- Node.js 18+ (recommended LTS)
- npm 9+ (comes with Node) or compatible package manager (pnpm, yarn)

## Getting Started
```bash
# Clone
git clone https://github.com/wentingsun-fun/roadmap-app.git
cd roadmap-app/vite-project

# Install dependencies
npm install

# Start development server
npm run dev
```
Then open the printed local URL (default: http://localhost:5173).

## Available Scripts
| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server (HMR) |
| `npm run build` | Production build (single self‑contained HTML) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint (if configured) |

## Building
```bash
npm run build
```
Output goes to `dist/` and (because of `vite-plugin-singlefile`) produces a single `index.html` with all JS/CSS inlined. This is convenient for:
- Dropping the file into CMS / Confluence / Notion embeds (if allowed)
- Email attachments (size permitting)
- Very simple static hosting

If you prefer normal chunked output, remove `vite-plugin-singlefile` usage in `vite.config.ts`.

## Preview Production Build
```bash
npm run build
npm run preview
```
Opens a local server serving the built assets.

## Deploy / Host
Because the build is a self‑contained `index.html`, any static file host works:
- GitHub Pages
- Netlify / Vercel / Render
- S3 + CloudFront / GCS
- Internal static web server

### GitHub Pages (quick way)
1. Build: `npm run build`
2. Commit `dist/` (or better: use a `gh-pages` branch / workflow) 
3. Enable Pages in the repo settings pointing to the deployed branch / folder.

(For automated deploys consider adding a GitHub Action that runs `npm ci && npm run build` then publishes `dist`.)

### Netlify / Vercel
- Build command: `npm run build`
- Publish directory: `dist`

## Data Persistence
- All roadmap data is stored in browser `localStorage` under versioned keys (`roadmap.items.v2`, etc.)
- Use the Export button to download a JSON snapshot
- Use Import to restore / move data between browsers
- Clearing site data or using a different browser profile resets the state

## Path Alias
`@` resolves to `src` (configured in `tsconfig.json` and `vite.config.ts`). Example:
```ts
import { Button } from '@/components/ui/button'
```

## Project Structure (simplified)
```
src/
  RoadmapApp.tsx       # Main application
  components/ui/*      # Minimal UI primitives (button, dialog, etc.)
  main.tsx             # App entry
```

## Customization Ideas
- Replace minimal UI primitives with a design system (e.g. shadcn/ui) 
- Add drag & drop ordering for items
- Add authentication + backend persistence
- Enhance accessibility for Dialog & Select

## Troubleshooting
| Issue | Fix |
|-------|-----|
| Blank screen after deploy | Ensure `index.html` served at site root |
| Import alias not resolving | Confirm `@` alias in both tsconfig & vite config |
| Data missing | LocalStorage cleared / different browser profile |

## License
Add a license file (e.g. MIT) if you intend to distribute.

---
Generated from the Vite + React + TypeScript template and extended for the roadmap application.
