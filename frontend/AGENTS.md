# AGENTS.md — Frontend Agent Instructions (EduFlow Frontend)

Read the repo root `AGENTS.md` first — its guardrails and learning loop apply
here unchanged. This file adds frontend-specific standards.

## Stack (as built)

- React 19 + Vite (ES modules, `"type": "module"`)
- Tailwind CSS 4 (via `@tailwindcss/vite` plugin, `index.css`)
- `react-router-dom` 7 (`BrowserRouter` + `Routes`/`Route`)
- `@heroicons/react` for icons
- ESLint (flat config, `eslint.config.js`) with react-hooks + react-refresh

## Structure

- `src/main.jsx` — entry; renders `<App />` inside `<BrowserRouter>`
- `src/App.jsx` — route table. Add routes here, not in screen files.
- `src/screens/*.jsx` — page-level components (kebab-case filenames)
- `src/component/*.jsx` — reusable components (footer, navigation, sidebar, etc.)
- `src/assets/` — static images/icons
- `src/index.css` — Tailwind entry + global styles

## Coding standards

- ES modules: `import`/`export default`. Named exports only when multi-symbol.
- `.jsx` extensions on imports (matches existing code).
- Functional components + hooks only — no class components.
- Match existing naming: screens/components in kebab-case `.jsx`.
- API calls hit the backend at relative `/api/...` (dev proxy via `vite.config.js`
  if configured; otherwise match the existing fetch pattern used in the app).
- No inline comments unless explaining non-obvious intent.

## Conventions to preserve

- All routes are defined in `App.jsx`; screens do not own navigation config.
- Tailwind utility classes inline; no separate CSS modules introduced unless
  the pattern already exists.
- Reusable chrome (nav, sidebar, footer) lives in `src/component/` and is
  shared, not duplicated per-screen.

## Guardrails (frontend-specific)

- Do not commit `node_modules`, `dist`, or `.env`-style files.
- Do not rewrite the routing structure or component layout unless asked.
- When adding a screen: create the file, register the route in `App.jsx`,
  and verify it renders via `npm run dev` or build.

## Verification

- Lint: `npm run lint` (eslint) in `frontend/` — run before finishing
- Build: `npm run build` (vite) — must succeed
- Dev: `npm run dev` then open the printed localhost URL and exercise the
  changed screen — never claim it works unverified.

## Learning loop hooks

- Before starting, grep `.agents/LESSONS.md` for keywords (vite, tailwind,
  router, jsx, eslint, build).
- After finishing, record any non-obvious gotcha there.
