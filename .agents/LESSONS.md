# LESSONS.md — Lessons Registry (EduFlow)

Read this before starting any task. Grep for keywords related to your work.
Append one dated entry per lesson, deduplicating against existing entries.

Format per entry:

    ## YYYY-MM-DD — Short title (category)
    - **What happened:** ...
    - **Root cause:** ...
    - **Fix / prevention:** ...
    - **Files involved:** ...

---

## Database / Sequelize

### 2026-08-05 — `sequelize.on is not a function` (DB driver init)
- **What happened:** Backend crashed at boot with `TypeError: sequelize.on is not a function`.
- **Root cause:** That call existed only in an old version of `config/database.js`;
  it was already removed. The real crash was a silent MySQL `ECONNREFUSED` because
  `DB_DIALECT=mysql` in `.env` but no MySQL server was running, and `connectDB()`
  was not awaited so the failure surfaced as an invisible unhandled rejection.
- **Fix / prevention:** Await `connectDB()` before `app.listen()`; log
  `error.message` + `error.original/parent`. Always reproduce the current error
  directly instead of trusting a stale stack trace.
- **Files involved:** `backend/server.js`, `backend/config/database.js`

### 2026-08-05 — Sequelize SQLite dialect requires `sqlite3`, not `better-sqlite3` (DB driver init)
- **What happened:** `this.lib.Database is not a constructor` when booting with `DB_DIALECT=sqlite`.
- **Root cause:** Sequelize's sqlite driver calls `new lib.Database(path, mode, cb)`
  and reads `lib.OPEN_READWRITE`/`OPEN_CREATE`. That is the `sqlite3` package API.
  `better-sqlite3` exposes a synchronous `new Database(path, opts)` — a different
  API — and cannot be used as `dialectModule`.
- **Fix / prevention:** Use `dialectModule: require('sqlite3')`. Verify a library's
  API matches what the consumer expects before wiring it in.
- **Files involved:** `backend/config/database.js`, `backend/package.json`

### 2026-08-05 — DB engine must be chosen via env, never edited in code (config discipline)
- **What happened:** Backend tried to reach MySQL while the developer intended SQLite.
- **Root cause:** `.env` had `DB_DIALECT=mysql`; the code branch already existed but
  the env pointed elsewhere.
- **Fix / prevention:** `DB_DIALECT` is the single switch (`sqlite` | `mysql`).
  Change the env, not the source. Document this in AGENTS.md so agents never "fix"
  code to mask a wrong env.
- **Files involved:** `backend/.env`, `backend/.env.example`, `backend/config/database.js`

## Frontend / Integration

### 2026-08-06 — Shared layout chrome (sidebar) must wrap dashboard content, not sit inline (layout)
- **What happened:** Adding the existing `Sidebar` to the admin/instructor/student
  dashboards without a flex wrapper collapsed the content area.
- **Root cause:** `Sidebar` is `h-screen` fixed-width; the dashboards had their own
  `min-h-screen` + `px/py` containers, so the sidebar and content competed for the
  same root box.
- **Fix / prevention:** Use a root `flex min-h-screen` wrapper with `<Sidebar />`
  beside a `flex-1` content column. Reuse the shared component; do not duplicate
  nav markup per screen.
- **Files involved:** `frontend/src/screens/adminDashboard.jsx`, `frontend/src/screens/instructorDashboad.jsx`, `frontend/src/screens/studentDashboard.jsx`

## Backend / Agents

### 2026-08-06 — Backend is CommonJS; `.agents` ESM agents would not load (module system mismatch)
- **What happened:** The three agents in `backend/.agents/` (assessment, recommendation,
  evaluation) used ESM `import`/`export` while the backend is CommonJS
  (`require`/`module.exports`, no `"type": "module"`). Any `require()` of them would
  throw; the old `services/openaiservices.js` also had ESM + a top-level `await` and
  exported nothing, and it referenced a nonexistent `openaiService.js` path.
- **Root cause:** Mixed module systems and a broken OpenAI service; the assessment
  route file existed but pointed at a controller that did not exist and was never
  mounted in `server.js`.
- **Fix / prevention:** Converted the agents and the OpenAI service to CommonJS,
  exported a graceful client (`null` when `OPENAI_API_KEY` unset), added a fallback
  question set so the endpoint works without a key, created
  `controllers/assessmentController.js`, wired `routes/assessmentRoutes.js` and
  mounted it under `/api/assessment`. Always verify module system + real import paths
  before wiring new files into the app.
- **Files involved:** `backend/.agents/*.js`, `backend/services/openaiservices.js`, `backend/controllers/assessmentController.js`, `backend/routes/assessmentRoutes.js`, `backend/server.js`, `backend/.env.example`

### 2026-08-06 — Literal routes must precede `/:id` in every router (route ordering, recurring)
- **What happened:** `GET /api/quizzes/my-attempts` returned 404 while building the
  student dashboard. `courses.js` had the same bug earlier (`/my-courses` after `/:id`).
- **Root cause:** Express matches routes in registration order; `/:id` swallowed
  `/my-attempts` (and `/my-courses`) and resolved the id to a missing record → 404.
- **Fix / prevention:** Always register literal routes like `/my-attempts`,
  `/my-courses`, `/instructor-courses` BEFORE any `/:id` route in the same router.
  Check every router when wiring new frontend endpoints, not just the one you edited.
- **Files involved:** `backend/routes/quizzes.js`, `backend/routes/courses.js`

### 2026-08-06 — Dashboards should fetch their data in parallel and handle empty states (frontend layout)
- **What happened:** The student dashboard needed enrolled courses, quiz attempts, and
  grades, but only fetched courses.
- **Root cause:** The original dashboard only wired one endpoint per screen.
- **Fix / prevention:** Use `Promise.all` of independent `api.get()` calls with
  per-request `.catch(() => ({ empty: [] }))` so one failing endpoint never blanks the
  whole dashboard; render explicit empty states. Verify every endpoint a new layout
  depends on actually exists (route-ordering bugs surface here).
- **Files involved:** `frontend/src/screens/studentDashboard.jsx`, `frontend/src/screens/instructorDashboad.jsx`, `frontend/src/screens/adminDashboard.jsx`

### 2026-08-08 — Assessment must keep correct answers server-side; use two-phase start/submit (security/flow)
- **What happened:** The original assessment flow returned `correctAnswer` inside each
  question to the client and required the client to echo those answers back to
  `/assessment/evaluate`. That leaks answers and makes the grading trivially
  cheat-able.
- **Root cause:** The agents were stateless: `generateAssessment` produced
  questions + answers, `evaluateAnswers` compared client-supplied arrays, and there
  was no session store.
- **Fix / prevention:** Added an in-memory `Map` of active assessments keyed by a
  generated `assessmentId`. `POST /assessment/start` now strips `correctAnswer`
  before returning questions and stores them server-side; `POST /assessment/submit`
  looks them up, evaluates, recommends a level, and deletes the session (stale ids
  get a 404). The old `evaluate`/`recommend` endpoints were kept for backward
  compat. Also note: the recommendation agent takes a *percentage*, not the raw
  score — pass `percentage` from the evaluated result.
- **Files involved:** `backend/controllers/assessmentController.js`, `backend/routes/assessmentRoutes.js`, `frontend/src/screens/studentDashboard.jsx`

### 2026-08-08 — Seed scripts must be idempotent and run `sync` before inserting (data seeding)
- **What happened:** The platform had zero courses, so the student dashboard's
  "Available Courses" and the assessment wizard had nothing to act on.
- **Root cause:** No seeding path existed for courses/modules.
- **Fix / prevention:** Added `backend/scripts/seedCourses.js` (idempotent
  `findOrCreate` by title, picks the first instructor user) and wired it as
  `npm run db:seed`. It authenticates + `sync({ alter: true })` before inserting,
  matching `connectDB()`. Run it against the same `.env` dialect as the app.
  Note: `findOrCreate` only inserts on create, so when adding a new column
  (e.g. Module.content) the seed must also `update()` existing rows to backfill.
- **Files involved:** `backend/scripts/seedCourses.js`, `backend/package.json`

### 2026-08-08 — Sequelize 6 SQLite `sync({alter:true})` crashes once FK references exist (SQLite alter)
- **What happened:** After adding a `content` column to the Module model, the
  backend crashed at boot and `npm run db:seed` failed with
  `SequelizeUniqueConstraintError` / `FOREIGN KEY constraint failed` while
  rebuilding the `Users` table.
- **Root cause:** With `alter: true`, Sequelize calls `changeColumn` for every
  non-PK column, and SQLite implements column changes by recreating the table
  (`CREATE *backup`, `INSERT SELECT`, `DROP TABLE`, `CREATE`, `INSERT`,
  `DROP backup`). Sequelize forces `PRAGMA FOREIGN_KEYS=ON` on every SQLite
  connection, so `DROP TABLE Users` fails because `Courses.instructorId` (and
  `Modules.courseId`) reference it. A failed run also leaves a populated
  `*_backup` table whose next `INSERT` then violates the id PK.
- **Fix / prevention:** In `config/database.js` set `foreignKeys: false` in the
  sqlite Sequelize options (the documented escape hatch so connections do not
  force FK enforcement). This lets alter rebuild referenced tables; integrity is
  guarded by the app layer + model constraints. Clean leftover `*_backup` tables
  before re-running sync. Verify a boot log shows "Database synchronized" after
  any model change.
- **Files involved:** `backend/config/database.js`, `backend/models/Module.js`, `backend/scripts/seedCourses.js`

### 2026-08-08 — Fallback assessments were identical for every course; add per-course banks (assessment content)
- **What happened:** "Take Assessment" returned the same 10 HTML/JS questions for
  every course when no `OPENAI_API_KEY` was configured, so the wizard felt broken.
- **Root cause:** `generateAssessment(course)` ignored the course when falling
  back to its static question list.
- **Fix / prevention:** In `backend/.agents/assessmentAgent.js` added a
  `courseBanks` map (normalized title → 10 tailored MCQs) for the 5 seeded
  courses with a substring-match lookup as a fallback; OpenAI is still preferred
  when a client exists. Any unknown course gets the generic bank. Verified live:
  three different courses returned three different first questions, each 10 items,
  with no `correctAnswer` leak, and submit still evaluates + recommends.
- **Files involved:** `backend/.agents/assessmentAgent.js`

### 2026-08-08 — Wrapping an existing JSX block in a new `<div>` without a closing tag breaks parse (frontend)
- **What happened:** `npm run lint` failed with a parse error
  (`Unexpected token '}'`) in `settings.jsx` after adding a BackButton wrapper.
- **Root cause:** The edit opened `<div>` around the header card but the closing
  tag was never added, unbalancing the JSX tree.
- **Fix / prevention:** When wrapping existing JSX, close the new wrapper before
  the following sibling; run `npm run lint` after each structural edit. ESLint's
  parser catches the imbalance immediately.
- **Files involved:** `frontend/src/screens/settings.jsx`

## Frontend / Theming
- **What happened:** The whole SPA was built with hardcoded dark-only classes
  (`bg-slate-950`, `bg-white/5`, `text-slate-400`, `text-emerald-200`), so a
  light-mode toggle rendered unreadable pale-on-white pages.
- **Root cause:** Tailwind's arbitrary slate/white utilities don't swap per theme.
- **Fix / prevention:** Centralized theme via CSS variables in `index.css`
  (`:root` = dark, `html.light` overrides) with semantic utility classes
  (`.bg-page`, `.bg-card`, `.bg-card-deep`, `.bg-card-hover`, `.border-line`,
  `.text-content`, `.text-secondary`, `.text-muted`, `.text-faint`,
  `.text-accent*`, `.text-danger`, `.text-info`). Converted every screen to use
  them. Keep accent CTA buttons (`bg-white text-slate-900`) and dark accent bands
  (`bg-hero-dark` with white text) as intentional constants that read well in both
  themes. Light-mode text accent colors (`--accent-soft: #047857` dark green) keep
  emerald-tinted pills legible. Modal overlays stay `bg-slate-950/80`.
- **Files involved:** `frontend/src/index.css`, `frontend/src/component/theme.jsx`, all `frontend/src/screens/*.jsx`, `frontend/src/component/navigation.jsx`, `frontend/src/component/sidebar.jsx`, `frontend/src/component/footer.jsx`

### 2026-08-08 — `react-refresh/only-export-components` forbids named exports that aren't components (react-refresh)
- **What happened:** `npm run lint` failed on `frontend/src/component/theme.jsx`
  because it exported `useTheme` alongside `ThemeProvider`.
- **Root cause:** The react-refresh eslint rule only allows component exports from a
  component file; a hook export breaks Fast Refresh.
- **Fix / prevention:** Split the shared context + hook into
  `frontend/src/component/themeContext.js` (a file with no components passes the
  rule); `theme.jsx` now exports only components and imports the hook/context.
  Shared hooks go in their own module, never exported from a component file.
- **Files involved:** `frontend/src/component/theme.jsx`, `frontend/src/component/themeContext.js`, `frontend/src/screens/settings.jsx`
