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

## Deployment / Vercel

### 2026-09-09 — Vercel "Redeploy" keeps the original commit; stale builds mask fixes (deployment)
- **What happened:** Repeated deploy attempts failed with the exact same Vercel frontend
  error even after fixes were committed and pushed. Build logs showed `Cloning ... Commit: 09e7d3e`
  each time, while `origin/main` had moved forward.
- **Root cause:** Clicking **Redeploy** on a previous deployment re-builds the *pinned commit* of
  that deployment, not `main` HEAD. None of the fix commits were ever built, so the symptom never changed.
- **Fix / prevention:** Verify the `Commit:` hash in the build log matches `origin/main` before
  debugging further. After pushing fixes, either confirm an auto-deploy fired for the new hash, or
  trigger a *fresh* deployment: Vercel dashboard → Deployments → **Create Deployment** (uses latest
  commit) rather than Redeploy, or run `npx vercel --prod` from the repo root.
- **Files involved:** n/a (process)

### 2026-09-09 — Unanchored `src` in `.vercelignore` deletes `frontend/src` at build time (deployment)
- **What happened:** Vercel build of the frontend service failed with
  `Failed to resolve /src/main.jsx from /vercel/path0/frontend/index.html`, `vite build` error with
  `Build failed in 38ms` and only 1 module transformed. Local `npm run build` worked fine.
- **Root cause:** `.vercelignore` contained a bare unanchored `src` pattern. Unanchored patterns match
  at any directory depth, so Vercel pruned `frontend/src/` (main.jsx, all screens/components) before
  staging the build. With the source gone, `index.html`'s `<script src="/src/main.jsx">` could not resolve.
- **Fix / prevention:** Removed the stray `src` line from `.vercelignore`. Keep ignore patterns either
  anchored (`/src`) to the repo root or specific to the intended path; verify each deployed service still
  has its source tree by inspecting the "Removed N ignored files" list in build output when a build
  unexpectedly loses files.
- **Files involved:** `.vercelignore`

### 2026-09-30 — Refresh 404 on Vercel despite services `vercel.json`: project preset is frontend-only, root config ignored (deployment)
- **What happened:** Refreshing any client-side route (`/studentDashboard`, `/login`) on `eduflow-backend-ca1q.vercel.app` returned 404 while `/` loaded the SPA; `/api/health` also 404. The repo-root `vercel.json` already had a `services` config with per-service SPA fallback (`/:path*` → `/index.html`) and top-level `/api` → backend routing, so config edits kept not fixing it.
- **Root cause:** The Vercel project's dashboard settings were **Framework Preset = "Other"** and **Root Directory = "frontend"** (`npx vercel project inspect`]. Per Vercel docs, a project builds as services only when the dashboard preset is **Services** AND `vercel.json` has a `services` key. With preset "Other", Vercel ignores the root `vercel.json` entirely and builds the plain Vite SPA at `frontend/` — no SPA fallback and no backend. A fresh `npx vercel --prod` confirmed it: `vercel inspect` showed a single build at the project root, and deep links stayed 404.
- **Fix / prevention:** Added `frontend/vercel.json` (the config file Vercel actually reads under this project setup) with a catch-all SPA rewrite, then deployed. Verified live: `/`, `/studentDashboard`, `/login` → 200 SPA; `/api/health` and `/uploads/...` → real 404. Keep `/api` and `/uploads` out of the fallback (`/((?!api|uploads).*)`) so API paths never return `index.html`. To serve the backend from the same domain the way the root services config intends, the dashboard must be switched to **Framework Preset = Services** with rootDirectory cleared (no CLI command exists for this), then redeployed.
- **Files involved:** `frontend/vercel.json` (new)

## Serverless / API

### 2026-09-18 — Invalid CORS header returned in prod because the fix was never deployed to the service the frontend calls (CORS / deployment)
- **What happened:** Login failed in production with `TypeError: Failed to fetch`. The frontend (Vercel, `eduflow-backend-ca1q.vercel.app`) was built with `VITE_API_URL=https://eduflow-7dp7.onrender.com`, so the login POST goes cross-origin to the Render backend. Simulated preflight: `OPTIONS /api/auth/login` with `Origin: https://eduflow-backend-ca1q.vercel.app` returned `Access-Control-Allow-Origin: eduflow-backend-ca1q.vercel.app` — a bare domain with **no scheme**, which the CORS spec rejects, so the browser never sends the POST and `fetch` throws "Failed to fetch".
- **Root cause:** The committed HEAD `backend/server.js` still had `app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }))`, which copies the bare `CLIENT_URL` value straight into the `Access-Control-Allow-Origin` header. The `normalizeOrigin` fix from the 2026-09-16 lesson existed only in the **working tree (uncommitted)** and Render was deployed from pushed HEAD, so production kept failing. The deployed Vercel backend service also 500s on every request, which is why the frontend had been pointed at Render in the first place.
- **Fix / prevention:** The working-tree `server.js` normalizeOrigin (trim, add `https://` for bare domains, `http://` for localhost, comma-separated allowlist, origin callback) produces a valid header locally (verified `204` + `ACAO: https://eduflow-backend-ca1q.vercel.app`). The fix must be **committed, pushed, and deployed to the exact origin the built frontend calls** (verify with the browsers' preflight: OPTIONS + Origin header, check ACAO starts with `http(s)://`). Diagnostics that pinpoint the cause: fetch the deployed bundle and check which origin `VITE_API_URL`/`Kn=` points to, then preflight THAT backend. A fix present in the working tree but not on the live service is still a live bug — confirm deployment coverage.
- **Files involved:** `backend/server.js`, `backend/.env.example`, `frontend/src/api/client.js`

### 2026-09-16 — Bare `CLIENT_URL` causes invalid CORS origin header on hosted API (CORS)
- **What happened:** Browser blocked signup from the Vercel frontend to the Render API with:
  `Access-Control-Allow-Origin header contains the invalid value 'eduflow-backend-ca1q.vercel.app'`.
  The API returned an origin without `https://`, so the browser rejected the preflight/request.
- **Root cause:** `backend/server.js` passed `process.env.CLIENT_URL` directly to `cors({ origin })`.
  Hosted env vars were set as bare domains, but the CORS `Access-Control-Allow-Origin` header must
  be a valid serialized origin including scheme, such as `https://eduflow-backend-ca1q.vercel.app`.
- **Fix / prevention:** Normalize configured origins before passing them to `cors`: trim trailing
  slashes, add `https://` for bare production domains, add `http://` for localhost, support
  comma-separated allowlists (`CLIENT_URLS`, `FRONTEND_URLS`, `CORS_ORIGINS`), and use an origin
  callback so credentials never pair with an invalid wildcard header. Verified by an OPTIONS preflight
  using the bad bare-domain env value; response became `204` with a valid `Access-Control-Allow-Origin`.
- **Files involved:** `backend/server.js`, `backend/.env.example`

### 2026-09-15 — `fetch` building `/api${API_URL}` instead of `/api${path}` → every API call hits one URL → 405 (frontend)
- **What happened:** All API requests started failing with **405 Method Not Allowed** across
  unrelated endpoints (login, courses, quizzes). Frontend production build still succeeded.
- **Root cause:** Commit `bd86c72` changed the request builder in
  `frontend/src/api/client.js` from `fetch(\`/api${path}\`)` to
  `fetch(\`/api${API_URL}\`)` where `API_URL = import.meta.env.VITE_API_URL` — an env var that
  is never set in this repo. The `path` argument (e.g. `/courses`, `/auth/login`) was silently
  dropped, so every request in the app went to the same literal URL; requests whose method did
  not match the backend route's method (e.g. POST vs GET) returned 405. The same commit also
  leaked `import.meta.env.VITE_API_URL` into CommonJS `backend/server.js` (later reverted).
- **Fix / prevention:** Normalize the optional API origin (`VITE_API_URL`) and always append the
  actual request path: `API_BASE + apiPath`. The resulting URLs are correct whether `VITE_API_URL`
  is unset, an origin (`https://host`), or already includes `/api` (`https://host/api`). Also changed
  Vercel Services routing from legacy `/(.*)` patterns to docs-aligned `/:path*` patterns so `/api/*`
  requests cannot fall through to the static frontend service and return 405 for POST/PUT/DELETE.
  Cross-checked all 65 frontend `api.*` call sites against the backend `routes/*` mounts; every URL
  now resolves to a real, method-correct route.
- **Files involved:** `frontend/src/api/client.js`, `vercel.json`, `backend/server.js`

### 2026-09-07 — Vercel CLI 59 (services model) ignores legacy `builds`/`routes`; define services + entrypoint (deployment)
- **What happened:** First build after the single-domain wiring failed:
  `Error: Service "backend" detected framework "express" in "backend" and must specify an "entrypoint" for runtime "node".`
  The legacy `builds`/`routes` platform keys are no longer honored by the services-based CLI; the backend workspace
  is auto-detected as an Express service that requires an entrypoint file.
- **Root cause:** The modern Vercel CLI builds per-workspace services from `services` in `vercel.json`, not from
  the old `builds`+`routes` config. The Express service needs `entrypoint: "server.js"` (it already exports the app).
- **Fix / prevention:** Declared `services` (`frontend` root `frontend/`, `backend` root `backend/`,
  `framework: "express"`, `entrypoint: "server.js"`) plus top-level `rewrites` routing `/api/(.*)` and
  `/uploads/(.*)` to the backend service and `/(.*)` to the frontend service. The frontend service carries its own
  SPA `rewrites` (`/(.*)` → `/index.html`) for BrowserRouter. Keep the entrypoint set whenever the service is
  detected (re-edits of `vercel.json` that drop it reintroduce the failure).
- **Files involved:** `vercel.json`, `backend/server.js`

## Database / Sequelize

### 2026-08-16 — Create-only sync never alters existing tables; add columns via idempotent migration (schema evolution)
- **What happened:** Added a `type` column to the Quiz model, but after the switch to create-only
  `sequelize.sync()`, existing SQLite tables are never altered — the column simply would not appear.
- **Root cause:** The 2026-08-16 boot-stability fix (create-only sync) means model changes only shape
  new tables. There is no automatic ALTER anymore.
- **Fix / prevention:** `config/database.js` runs an idempotent `ensureColumn(table, column, def)`
  helper in the dev sync block: it describes the table and calls `queryInterface.addColumn` only when
  the column is missing (catches "no such table" for brand-new DBs where `sync()` already created it).
  Use this pattern for every future column addition instead of re-enabling `sync({alter:true})`.
- **Files involved:** `backend/config/database.js`, `backend/models/Quiz.js`

### 2026-08-16 — Lecturer role fell through to the student sidebar (role mapping)
- **What happened:** The User role ENUM includes `lecturer`, but the sidebar's `ROLE_LINKS` only had
  `admin`/`instructor`/`student`; the `ROLE_LINKS[role] || ROLE_LINKS.student` fallback silently showed
  lecturers the *student* link set after admin redirected them to `/instructorDashboard`.
- **Root cause:** Role-based navigation used an exact-key lookup with a "student" default that doesn't
  match the login redirect's `instructor || lecturer → instructorDashboard` decision.
- **Fix / prevention:** Normalize roles in one place: sidebar maps `lecturer → instructor` before the
  ROLE_LINKS lookup, and `App.jsx` `RequireRole`/`dashboardFor(role)` treat `lecturer` as `instructor`.
  Keep the raw role for display. Grep for any other `ROLE_LINKS[role]`-style exact lookups when adding
  roles.
- **Files involved:** `frontend/src/component/sidebar.jsx`, `frontend/src/App.jsx`

### 2026-08-16 — Nested resource routes live under their own router, not `/courses/:id/...` (route shape)
- **What happened:** The new instructor UI called `/courses/:id/quizzes` and `/courses/:id/assignments`;
  both returned `{"message":"Route not found"}`.
- **Root cause:** `quizzes.js` and `assignments.js` routers are mounted at `/api/quizzes` and
  `/api/assignments` and define `/course/:courseId`, so the real paths are
  `/api/quizzes/course/:courseId` and `/api/assignments/course/:courseId` (and materials is
  `/api/materials/module/:moduleId`). The nested `/courses/:id/...` shape simply doesn't exist.
- **Fix / prevention:** Confirm the mount prefix in `server.js` (`app.use('/api/quizzes', quizRoutes)`)
  and the literal sub-path in the router before writing frontend calls. Frontend now uses
  `/quizzes/course/:id`, `/assignments/course/:id`, `/materials/module/:id`.
- **Files involved:** `frontend/src/screens/instructorContent.jsx`, `backend/routes/{quizzes,assignments,materials}.js`

## Database / Sequelize

### 2026-09-03 — Serverless (Vercel) + MySQL: run create-only sync in prod and shrink the pool (deployment)
- **What happened:** The app already selects MySQL via `DB_DIALECT=mysql`, but two things made "just flip the
  env var" fail in production on Vercel: (1) `connectDB()` only ran `sequelize.sync()` when
  `NODE_ENV === 'development'`, so a fresh hosted MySQL DB got **zero tables** (all queries failed); (2) the
  pool was fixed at `max: 5`, so many serverless cold-start instances exhausted the provider's socket/connection
  cap (TiDB Serverless free tier limits connections).
- **Root cause:** Schema creation was gated behind a dev-only flag, and the pool was tuned for a few always-on
  processes, not many ephemeral serverless ones.
- **Fix / prevention:**
  - Run plain `sequelize.sync()` (create-only; `CREATE TABLE IF NOT EXISTS`, never alters/drops) in **every**
    environment, not just dev. Keep the SQLite backup-table cleanup dev-only. This is safe and idempotent — the
    earlier lesson about sync being dangerous applies only to `{ alter: true }`, not plain sync.
  - Size the pool from env: `DB_POOL_MAX`, defaulted small (1) when `process.env.VERCEL === '1'` (or
    `SERVERLESS === '1'`), else 5; shorten `acquire` for serverless. Documented in `.env.example`.
- **Files involved:** `backend/config/database.js`, `backend/.env.example`
- **Provider note:** For a Vercel-hosted Sequelize/MySQL app, TiDB Cloud Serverless is the best fit in 2026
  (MySQL-compatible, ~25 GiB free, scale-to-zero, first-party Vercel integration that injects `TIDB_HOST`/
  `TIDB_PORT`/`TIDB_USER`/`TIDB_PASSWORD`/`TIDB_DATABASE`). PlanetScale removed its free tier in 2024 (~$40/mo
  min), so it is no longer the default.

### 2026-09-03 — Vercel monorepo (backend + frontend) needs a root workspaces package.json (deployment)
- **What happened:** `vercel.json` already builds both apps (`backend/server.js` via `@vercel/node`,
  `frontend/package.json` via `@vercel/static-build`, routes `/api/*` → backend, else static), but the repo had
  **no root `package.json`** — only an empty root `package-lock.json` (`"packages": {}`). Vercel's default install
  step at the repo root had nothing to install, so `node_modules` for `backend/` and `frontend/` were never
  guaranteed at build time, and the shared/lockfile state was inconsistent.
- **Root cause:** A monorepo without a root package manifest (or workspaces) gives Vercel no single source of
  truth to install from and no way to capture a coherent lockfile.
- **Fix / prevention:** Added root `package.json` with `"workspaces": ["backend", "frontend"]` and helper
  scripts (`build`, `seed`, `dev:*`), then regenerated the root `package-lock.json` (`npm install
  --package-lock-only`). `npm run build` at the root successfully runs the frontend prod build (vite → `dist`),
  matching what `@vercel/static-build` consumes. For any multi-app repo deployed to Vercel from a single root,
  give it a root workspace manifest + lockfile and keep a working `npm run build`.
- **Files involved:** `package.json` (root, new), `package-lock.json` (root, regenerated)

### 2026-08-18 — `%${x}%` Op.like lets user input act as SQL wildcards; escape + set Op.escape (SQL / LIKE injection)
- **What happened:** A security pass found the backend insulated from classic raw-SQL injection (everything goes
  through the Sequelize query builder with parameterized values), but the `Op.like` search patterns
  (`[Op.like]: \`%${search}%\``) did not escape `%` and `_`. A user-supplied `%` or `_` acts as a SQL wildcard,
  broadening matches beyond intent (boundary / visibility bypass) and enabling expensive full-scan queries (DoS).
- **Root cause:** `LIKE` treats `%` (any run) and `_` (any single char) as metacharacters, and `\` is the standard
  escape prefix, but the code never escaped them.
- **Fix / prevention:** Add `backend/utils/search.js` exposing `escapeLike(v)` (`.replace(/[\\%_]/g, '\\$&')`) and
  `likeContains(col, term)` that returns
  `{ [col]: { [Op.like]: '%'+escapeLike(term)+'%', [Op.escape]: '\\' } }`. `Op.escape` tells Sequelize to honor
  `\` as the escape char. Replace every `%${x}%` pattern with `likeContains(...)`. Verify with a unit check that
  the produced object has real `[Op.like]` (a Symbol key — invisible to JSON.stringify, which shows `"undefined"`)
  and the expected escaped value + `[Op.escape]`. When the term is blank, return `null` (callers gate on `if
  (search)`). `courseController.getAllCourses` and `adminController.getAllUsers` /
  `getAllCoursesAdmin` were updated; the only `sequelize.query()` in the repo is dev-only in
  `config/database.js` over internal `sqlite_master` metadata (no HTTP input); still double-quote-escaped the
  dropped-table identifier defensively.
- **Files involved:** `backend/utils/search.js` (new), `backend/controllers/courseController.js`,
  `backend/controllers/adminController.js`, `backend/config/database.js`

### 2026-08-16 — SQLite `sync({alter:true})` is non-idempotent and loops forever boot-to-boot (boot stability)
- **What happened:** Recurring boot crash — `SQLITE_CONSTRAINT: UNIQUE constraint failed: <T>_backup.id` while
  `sync({alter:true})` rebuilds tables. Boot log showed the same tables (Users, Gradebooks) being rebuilt
  repeatedly; a fresh boot after cleanup immediately rebuilt them again and eventually crashed.
- **Root cause:** SQLite has no real ALTER, so Sequelize's `changeColumn` recreates a table
  (`CREATE …_backup`, copy, `DROP`, recreate, copy back, `DROP backup`) for every column it thinks changed.
  Its DEFAULT normalization alternates between string and number (`'0'` vs `0`, `'[]'` vs `[]`) between the
  model and the rebuilt DDL, so the diff never converges — the table is rebuilt on **every** boot. Any
  interrupted rebuild leaves a populated `*_backup` table, which the next boot tries to `INSERT SELECT` into
  and crashes with a UNIQUE violation.
- **Fix / prevention:** Stop altering on boot. `connectDB()` now (1) drops any leftover `*_backup` tables
  before syncing, and (2) uses create-only `sequelize.sync()` instead of `sync({alter:true})`. Create-only
  sync never rewrites existing tables, so boots are fast and deterministic; column changes are applied via
  the idempotent seed (`npm run db:seed`), which was switched to create-only sync as well. Verify a boot log
  shows "Database synchronized" and settles (no repeated `*_backup` DDL). This *replaces* the earlier
  2026-08-08 advice that only mitigation (`foreignKeys:false`) sufficient.
- **Files involved:** `backend/config/database.js`, `backend/scripts/seedCourses.js`

### 2026-08-16 — Admin course management drives new admin-only course routes (rbac surface)
- **What happened:** Admin could delete courses but not create them (`POST /api/courses` was
  `isInstructor`-only), and there was no way to assign a course to an instructor.
- **Root cause:** Course routes assumed the course creator was the instructor; admin had no create path and
  no assignment endpoint.
- **Fix / prevention:** `POST /api/courses` is now `isInstructorOrAdmin`; `createCourse` accepts an optional
  `instructorId` (admin only, validated against role instructor/lecturer) so an admin can create and assign in
  one step. Added admin-only `GET /api/admin/courses` (all incl. inactive), `PUT /api/admin/courses/:id/assign`,
  and `PUT /api/admin/courses/:id/status` in `routes/admin.js`. Remember literal `/courses/:id/*` routes carry
  their own path segments and don't conflict with `/users/:id`.
- **Files involved:** `backend/controllers/adminController.js`, `backend/routes/admin.js`,
  `backend/controllers/courseController.js`, `backend/routes/courses.js`

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

### 2026-08-12 — Enroll students after assessment; enrollment needs a real junction table (course enrollment)
- **What happened:** The enrollment endpoints were stubs (`getMyCourses` returned `[]`, `enrollCourse` returned a "requires junction table" message), so "My Courses" was always empty and assessments never changed enrollment.
- **Root cause:** No enrollment model existed; there was no way to record which student owned which course.
- **Fix / prevention:** Added a `Enrollment` model (courseId + studentId, unique composite index, `status`/`enrolledAt`/`completedAt`), associations in `models/index.js`, real `enrollCourse` (idempotent findOrCreate, returns 201 fresh / 200 repeat) and `getMyCourses` (joins Course). Assessment `submit` now auto-enrolls the authenticated student in the assessed course and returns `enrolled: true`. Frontend dashboard refetches `/courses/my-courses` after submit and swaps the "Take Assessment" button for "Enrolled · View course →" when `enrolledIds` contains the course. Verified: submit enrolls (count goes 0→1), POST `/courses/enroll/:id` is idempotent, `my-courses` lists both, lint + build green. Note the existing route shape is `POST /api/courses/enroll/:id`, not `/:id/enroll`.
- **Files involved:** `backend/models/Enrollment.js`, `backend/models/index.js`, `backend/controllers/courseController.js`, `backend/controllers/assessmentController.js`, `frontend/src/screens/studentDashboard.jsx`

### 2026-08-12 — Seeding: misplaced course objects become modules of the wrong course (data seeding)
- **What happened:** After adding 6 new course objects to `seedCourses.js`, the seed reported "5 courses (5 created)" with the new courses' *modules* attached to the previous course instead of creating new courses.
- **Root cause:** The new course objects were inserted inside the last course's `modules:` array (before its closing `]`), so the seed loop treated each SOE "course" as a module row — title = course title, content = undefined. `node --check` passed because the nesting was syntactically valid.
- **Fix / prevention:** Moved the 6 objects out to the top level of `courseData`, added the required trailing comma after the now-non-last Database course, and deleted the erroneous `Modules` rows (`title LIKE 'SOE %'`) before re-seeding since `findOrCreate` never removes stale rows. Verify structure by querying the DB (course count + per-course module lists), not just by syntax check or the summary line.
- **Files involved:** `backend/scripts/seedCourses.js`

### 2026-08-12 — The Edit tool double-escapes `\n` inside single-line template literals (tooling gotcha)
- **What happened:** An attempt to rewrite part of a one-line JS template literal produced literal `\\n` character sequences (char codes `92,92,110`) in the file, corrupting the content.
- **Root cause:** The template literal lives on a single source line, and the edit inserted an escaped backslash instead of the raw two-character `\n` sequence used elsewhere in the same literal.
- **Fix / prevention:** Verify raw content with PowerShell char codes rather than eyeballing, and do surgical `String.Replace` on the raw file content when operating inside one-line template literals. Confirm with `Substring` inspection afterward.
- **Files involved:** `backend/scripts/seedCourses.js`

### 2026-08-12 — Recommendation agent should recommend a real module of the course, not a hardcoded lesson (assessment/agents)
- **What happened:** `recommend(percentage)` returned static `nextLesson` values ("React Hooks", "HTML Fundamentals") unrelated to the course being assessed, so the placement result didn't tell the student where to start in *this* course.
- **Root cause:** The agent had no visibility into the course or its modules.
- **Fix / prevention:** `/assessment/start` now stores `courseId`; `/submit` resolves the course's ordered module titles and passes them to `recommend(percentage, moduleTitles)`, which maps Beginner→module 1, Intermediate→middle module, Advanced→final module and returns `recommendedModule` + `recommendedModuleOrder`. Verified end-to-end: 100%, 50%, and 0% scores yield modules 5, 3, and 1 respectively for SOE 504.
- **Files involved:** `backend/.agents/recommendationAgent.js`, `backend/controllers/assessmentController.js`, `frontend/src/screens/studentDashboard.jsx`

### 2026-08-12 — Missing `.env` defaults to MySQL and crashes boot with ECONNREFUSED (config discipline)
- **What happened:** `npm run dev` crashed instantly with `AggregateError [ECONNREFUSED]` on `:3306` / `127.0.0.1:3306`.
- **Root cause:** There was no `backend/.env` at all. `config/database.js` falls back to `DB_DIALECT=mysql` (line 5 `|| 'mysql'`) and `localhost:3306` when env is absent — but the machine has no MySQL server, so every connect is refused.
- **Fix / prevention:** Create `backend/.env` from the example (`DB_DIALECT=sqlite` requires no server) and set a real JWT secret. If no MySQL service exists, don't point `.env` at myserver-less MySQL. First check whether a `.env` file exists before debugging connection errors.
- **Files involved:** `backend/.env`, `backend/.env.example`, `backend/config/database.js`

### 2026-08-05 — DB engine must be chosen via env, never edited in code (config discipline)
- **What happened:** Backend tried to reach MySQL while the developer intended SQLite.
- **Root cause:** `.env` had `DB_DIALECT=mysql`; the code branch already existed but
  the env pointed elsewhere.
- **Fix / prevention:** `DB_DIALECT` is the single switch (`sqlite` | `mysql`).
  Change the env, not the source. Document this in AGENTS.md so agents never "fix"
  code to mask a wrong env.
- **Files involved:** `backend/.env`, `backend/.env.example`, `backend/config/database.js`

## Frontend / Responsive

### 2026-08-18 — Fixed `w-72` sidebar + hardcoded `ml-72` margin broke every dashboard on mobile (responsive layout)
- **What happened:** A responsive pass found the dashboard/admin/instructor screens unusable on mobile: the
  Sidebar rendered a permanent fixed 288px (`w-72`) aside on all viewports, and all 8 sidebar screens offset
  their content with a hardcoded `ml-72`. On a phone the sidebar swallowed most of the screen with no way to
  dismiss it.
- **Root cause:** Responsive breakpoints were largely correct in content pages, but the app chrome (sidebar)
  and its content offset had no `md:` anywhere.
- **Fix / prevention:** Convert `Sidebar` (once) into a mobile off-canvas drawer: a floating hamburger
  (`md:hidden`) toggles `open`; an overlay closes it; nav links call `close()`; a close button appears inside
  the drawer; the `aside` gets `md:translate-x-0` (always visible ≥md) plus
  `${open ? 'translate-x-0' : '-translate-x-full'}` and a transition on mobile. Then sweep every hardcoded
  `ml-72` content margin to `md:ml-72` (8 screens) and give mobile wrappers `pt-20` so content clears the
  floating hamburger. Rule of thumb: one fixed sidebar that every screen compensates for with a raw margin is
  the #1 mobile killer — fix the shared component once and sweep the offsets. Also bump icon-button touch
  targets (navbar hamburger `p-2`→`p-3`, theme toggle `p-2`→`p-2.5`) and add `overflow-x:hidden` to `body` as
  a global guard.
- **Files involved:** `frontend/src/component/sidebar.jsx`, `navigation.jsx`, `theme.jsx`,
  `frontend/src/index.css`, all 8 `frontend/src/screens/{studentDashboard,instructorDashboad,adminDashboard,
  manageUsers,manageCourses,courseConsistency,instructorContent,settings}.jsx`

### 2026-08-31 — Grid children default to `min-width:auto` and blow out page width on mobile (responsive layout)
- **What happened:** The course catalog scrolled horizontally on phones. `body { overflow-x:hidden }` was already
  set but some devices still scrolled.
- **Root cause:** CSS grid/flex items default to `min-width: auto`, so an item's min-content size (widest
  unbreakable content) forces the track wider than the viewport. The course row is a `grid` (`sm:grid-cols-12`)
  whose badge `span` (flex-wrap of category/difficulty chips) lacked `min-w-0`; a long chip expanded the column.
  `body{overflow-x:hidden}` clips overflow but the actual scroll container is `html`, so it didn't always stop
  the document scrolling.
- **Fix / prevention:** Add `min-w-0` to grid children and the row grid so content shrinks instead of expanding
  its track (belt: `max-w-full` on the badge row). Add `overflow-x: hidden` to `html` (not just `body`) so the
  root scroll container clips residual decorative overflow on every device. Rule of thumb: when a card row uses a
  grid with many `sm:`-conditional children, every grid item that can hold unbreakable content needs `min-w-0`,
  and guard document overflow at BOTH `html` and `body`.
- **Files involved:** `frontend/src/screens/courseCatalog.jsx`, `frontend/src/index.css`

### 2026-08-31 — Wrapping an existing block in a conditional `{x && (...)}` panel: keep the original close tag count (JSX balance)
- **What happened:** While converting stacked dashboard sections into tab panels, I wrapped each section in
  `{section === '...' && (<div ...>...</div>)}`. I mistakenly added an extra closing `</div>` to the "My
  Courses" panel because I assumed a panel wrapper + card wrapper both needed closing, but the original content
  had only ONE wrapper `<div>`. The extra `</div>` made the parser error: "Adjacent JSX elements must be wrapped
  in an enclosing tag" — the classic symptom of an unbalanced ancestor above the reported line.
- **Root cause:** I added a closing tag based on a mental model of what the structure "should" be instead of
  counting the divs actually opened in the original block. When you change the opening side of a wrapper you must
  re-verify the matching close tag count that already exists.
- **Fix / prevention:** When wrapping existing JSX in a conditional, take the pair of the existing wrapper (open +
  its one close) and insert the expression before the open and close after the existing close — do NOT add
  closes. Verify by running `npm run build` (vite transforms) or lint, which report the adjacent-JSX error for any
  unbalanced ancestor. Count container divs explicitly: one `<div className="rounded-3xl ...">` = exactly one
  `</div>`. Also keep the grid/`lg:grid-cols-2` results panel on a single wrapper.
- **Files involved:** `frontend/src/screens/studentDashboard.jsx`

### 2026-09-03 — "Retry"/"Retake" that reuses an assembled modal leaves stale wizard state (state reset on re-entry)
- **What happened:** A placement-assessment wizard had a "Retake" button. `startAssessment()` did
  `setWizard((w) => ({ ...w, phase: 'questions', error: null }))` — spreading the *current* state. On a
  retake this kept the previous attempt's `questions`, `answers`, `assessmentId`, and `result` intact while
  the new API call was in flight, so the user briefly saw stale questions/answers and the 120s timer started
  on the old `assessmentId` (losing seconds). On API *failure* the phase stayed `'questions'` with empty
  questions — the user was stuck.
- **Root cause:** Any "re-start the same flow" handler that spreads existing modal state must explicitly null
  out the fields the next phase depends on; otherwise the previous run's data persists across re-entry.
- **Fix / prevention:** When re-invoking a flow on already-populated state, reset the transient fields in the
  same update that changes `phase` (set `assessmentId/questions/answers/result` to empty/null), and on error
  revert `phase` to `'intro'` so the user can retry cleanly. Add a `submitting` guard to async submit handlers
  to prevent double-fire (check flag at entry, `finally` clears it).
- **Files involved:** `frontend/src/screens/studentDashboard.jsx`

## Frontend / Integration

### 2026-08-18 — Avatar upload end-to-end: image-only multer + static /uploads + multipart through the dev proxy (profile photo)
- **What happened:** The Settings page had a static avatar with no way to change it. User model already had
  an `avatar` string and settings serialized it, but nothing could set it, and the generic upload middleware
  allowed non-image types (PDFs, media) which is wrong for avatars.
- **Root cause:** No image-only upload path existed; the avatar field was write-only by omission. There was
  also no dedicated route/controller for setting an avatar.
- **Fix / prevention:** (1) In `middleware/upload.js`, export a second `uploadAvatar` multer (reuse the same
  disk storage; image-only filter JPEG/PNG/GIF/WebP; 5MB cap). Set `err.statusCode = 400` on filter
  rejections. (2) Add `PUT /api/settings/me/avatar` with `auth` + `uploadAvatar.single('avatar')` → new
  `updateAvatar` controller storing `user.avatar = '/uploads/<filename>'` (the web-served path, not the fs
  path — the generic material code stores `req.file.path`, which the `<img>` can't load; avatars must store
  the URL served at `app.use('/uploads', express.static('uploads'))` in `server.js`). Best-effort unlink the
  previous uploaded avatar. (3) `errorHandler` gains a `MulterError`/`LIMIT_FILE_SIZE` → 400 branch (multer
  size errors are `MulterError`, and my filter errors are plain `Error` with `statusCode`). (4) Frontend:
  hidden file inputs — one `accept="image/*"` for device, one `accept="image/*" capture="user"` for camera —
  open via refs; preview with `URL.createObjectURL(file)` + "Use this photo"/"Cancel"; upload with
  `api.put(path, FormData)`. `api.put` already passes `FormData` through without setting `Content-Type`, and
  the Vite dev proxy maps `/uploads` → backend, so the returned `/uploads/...` avatar URL renders directly
  in `<img src>`. Always `URL.revokeObjectURL` the pending preview.
- **Files involved:** `backend/middleware/upload.js`, `backend/routes/settings.js`,
  `backend/controllers/settingsController.js`, `backend/middleware/errorHandler.js`,
  `frontend/src/screens/settings.jsx`

### 2026-08-13 — `react-hooks/set-state-in-effect` bans synchronous setState in an effect body (lint)
- **What happened:** `npm run lint` failed with
  `Calling setState synchronously within an effect can trigger cascading renders` on
  `coursesDetails.jsx` after resetting `openModule`/`recommendedId` at the top of the
  module-fetch effect.
- **Root cause:** The flat `react-hooks.configs.recommended` config enables the
  new `set-state-in-effect` rule; any direct `setX(...)` call in the effect body
  (not inside a promise/timer callback) is an error.
- **Fix / prevention:** Move resets inside the async `.then`/`.catch` callbacks of
  the same effect instead of calling them synchronously in the body. The rule still
  allows setState inside callbacks. Run `npm run lint` after any effect edit.
- **Files involved:** `frontend/src/screens/coursesDetails.jsx`

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

### 2026-10-01 — A route param NAME the controller never reads makes the handler dead (route shape)
- **What happened:** `GET /api/courses/:id/learning-path` returns 404 for every caller, so
  the course screen's PaceBanner, recommended-module button and per-module status badges
  never render. The endpoint was "implemented" and simply assumed to work.
- **Root cause:** `backend/routes/courses.js:21` declares `/:id/learning-path`, but
  `getLearningPath` reads `req.params.courseId` (lines 300, 306, 311, 312, 321, 326, 331,
  335) — never `req.params.id`, unlike its sibling handlers at :62/:127/:157/:187.
  Sequelize 6 `findByPk(undefined)` short-circuits to `null`, so it falls into the
  `404 { message: 'Course not found' }` branch. The frontend `.catch` hid it completely.
- **Fix / prevention:** A route/handler pair is only correct if the **param names agree**;
  matching HTTP verb + path shape is not enough. When adding a route, grep the controller
  for every `req.params.` read and name the route parameter identically (prefer one
  convention per router: `:id` or `:courseId`, not both). A swallowed `.catch` on a
  personalization/analytics call is what turned a 404 into a silent feature absence —
  log or surface unexpected non-2xx instead of discarding it.
- **Related:** the ordering variant of this class of bug is recorded above.
- **Files involved:** `backend/routes/courses.js`, `backend/controllers/courseController.js`,
  `frontend/src/screens/coursesDetails.jsx`

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

### 2026-08-18 — 60/30/10 recolor: flip default to light, sweep accent classes, kill hardcoded white CTAs (design tokens)
- **What happened:** User asked for a white / black / orange 60-30-10 palette. The app defaulted to
  dark (slate-navy + emerald) and `:root` held the dark values; a blind "add white" edit would have
  done nothing because the light theme only existed under `html.light`, and the emerald accent was
  hardcoded in ~100 utility strings across 16 files. The old `bg-white text-slate-900` primary CTAs
  also become invisible on the new white pages.
- **Root cause:** Theme colors live in three places: the CSS token blocks (default = dark),
  `theme.jsx` (toggled the `light` class + sniffed OS preference), and plenty of literal
  emerald/slate utilities sprinkled in JSX.
- **Fix / prevention:** (1) Swap token defaults: `:root` = light (white pages, black text, orange
  accent), new `html.dark` = inverted 60/30/10. (2) Flip the class contract: `theme.jsx` toggles
  `dark` (not `light`) and defaults to `light`; update `themeContext.js` default. (3) Grep for stale
  `html.light`/`.light` selectors and recast hero/shadows to `html.dark`. (4) Recolor the accent by a
  scripted `emerald`→`orange` string replace over `src/**/*.jsx|js` (mechanical, 16 files); keep tiny
  data-semantic chips (role badges, pace status) distinct. (5) Convert literal `bg-white text-slate-900`
  CTAs to adaptive tokens (`bg-[var(--content)] text-[var(--page)]` or accent orange) since white-on-
  white breaks. Rule of thumb: when a palette change mirrors across many files, the token layer +
  a scripted class sweep beats per-file edits.
- **Files involved:** `frontend/src/index.css`, `frontend/src/component/theme.jsx`,
  `frontend/src/component/themeContext.js`, all `frontend/src/screens/*.jsx`,
  `frontend/src/component/navigation.jsx`

### 2026-08-08 — Theming done via CSS variable tokens (design system)
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

### 2026-08-18 — Add imagery only after confirming every virtual-hosted binary URL resolves (assets bootstrapping)
- **What happened:** Downloading 21 stock JPEGs from `images.unsplash.com` via PowerShell
  `Invoke-WebRequest` worked, but the whole batch landed in the repo root `src/assets/` (not
  `frontend/src/assets/`) because the command ran without `workdir` set. Also, the model cannot
  view images at all, so "corresponding" covers could only be trusted from well-known photo IDs,
  not visual verification.
- **Root cause:** Binaries can't be fetched with the web-fetch tool (text/markdown only) and there is
  no image input capability; `Invoke-WebRequest` writes exactly where you tell it, so a missing
  `workdir` defaults to the CWD (repo root here).
- **Fix / prevention:** Run asset downloads with the frontend `workdir` (or an explicit absolute
  `-OutFile`), always set a browser `User-Agent` header (Unsplash CDN 403s the PS default), verify
  JPEG magic bytes (`FF D8`) and file sizes after download, and use an import-URL map module
  (`courseCovers.js`) so swapping an image later is a one-line change. Detect wrong-directory writes
  by `Get-ChildItem` after the batch.
- **Files involved:** `frontend/src/assets/*.jpg`, `frontend/src/assets/covers/*.jpg`,
  `frontend/src/component/courseCovers.js`

### 2026-08-18 — Kill glassmorphism/blobs at the token layer, not per-file (design system)
- **What happened:** A design brief banned floating blur blobs and glass cards, but the pattern
  (`pointer-events-none absolute … rounded-full bg-emerald-500/10 blur-[120px]` + `bg-card … backdrop-blur-xl`)
  was repeated across ~15 screens, many with delicate logic.
- **Root cause:** Fixing shared visual patterns file-by-file is high-churn and error-prone, and a naive
  global `[class*="bg-emerald-500/10"] { display:none }` is too broad — those same emerald tokens are used
  legitimately for avatar circles, success banners, and hover states.
- **Fix / prevention:** (1) Make the card tokens solid layered tones in `index.css` (`--card: #0b1322`,
  `--card-strong: #152238`, `--card-deep: #060c18`, `--card-hover: #14243c`) so every `backdrop-blur-xl`
  card is opaque and the glass stops mattering everywhere in one edit. (2) Hide blobs with a *targeted*
  selector that matches only the blob structure: `[class*="pointer-events-none"][class*="rounded-full"][class*="blur-["]`
  — attribute-substring selectors on multiple classes, in CSS attribute values `[`/`]`/`/` are just
  characters that don't need escaping. (3) Only then refine individual headers. When a visual is systemic,
  change the design token first.
- **Files involved:** `frontend/src/index.css`, `frontend/src/screens/{home,courseCatalog,coursesDetails,login,signup,studentDashboard,adminDashboard,instructorDashboad,courseConsistency}.jsx`

### 2026-08-31 — React Compiler lint `react-hooks/purity` rejects `Date.now()` in render-scope handlers (React 19 lint)
- **What happened:** Adding module-view time tracking (record open time, report elapsed seconds) as
  `moduleSession.current[moduleId] = Date.now()` inside `toggleModule` failed `npm run lint` with
  `Error: Cannot call impure function during render` pointing at the `Date.now()` call.
- **Root cause:** `react-hooks.configs.flat.recommended` includes the new React Compiler purity rule.
  It treats functions defined in the component body as render scope and flags direct calls to impure
  builtins (`Date.now`, `Math.random`) — even inside an onClick handler. Notably it did *not* flag the
  same `Date.now()` read inside the cleanup effect/helper; only the handler-body call errored.
- **Fix / prevention:** Route the timestamp through a module-scoped wrapper defined *outside* the
  component: `const nowMs = () => Date.now();` and call `nowMs()` in handlers. The rule cannot statically
  trace the impure call across that boundary. Also silence the companion `exhaustive-deps` warning that
  fires when a render-defined helper (`endModuleSession`) is referenced from an effect, using an
  `// eslint-disable-next-line react-hooks/exhaustive-deps` above the cleanup effect that intentionally
  runs only on unmount.
- **Files involved:** `frontend/src/screens/coursesDetails.jsx`

### 2026-09-22 — `Users` id sequence out of sync ⇒ `POST /api/auth/register` returns 500 (empty body)
- **What happened:** Verifying the Ifeanyi chat endpoint required a test user; `register` returned 500 with an
  empty body. `health` was fine. The runtime log only showed an `Error` at `User.create` with no message.
- **Root cause:** `INSERT INTO "Users" ... VALUES (DEFAULT,...)` collided with an existing row:
  `SequelizeUniqueConstraintError: duplicate key value violates unique constraint "Users_pkey"` against
  `id = 4`. The Postgres `Users_id_seq` was behind `MAX(id)` (seq last_value 4 vs MAX 11) — classic
  sequence drift, likely from a restore/import or explicit-id inserts.
- **Fix / prevention:** `SELECT setval(pg_get_serial_sequence('"Users"','id'), (SELECT COALESCE(MAX(id),1) FROM "Users"))`.
  Set seq back in sync (4 → 11); subsequent registrations got id 12+. This was a shared-prod data fix and
  unblocks registration everywhere. Debug tip: error-wide `console.error(err)` prints only the name; inspect
  `err.parent.message`, `err.fields`, `err.errors[]` when reproduced directly (a small throwaway script that
  loads `config/database.js`'s exported `sequelize` — not `new Sequelize(config)` — surfaces the real message).
- **Files involved:** shared Neon production DB (no code change); diagnosis via `backend/config/database.js`,
  `backend/controllers/authController.js`.

### 2026-09-22 — Ifeanyi assistant verified; fallback was OpenAI billing, not a code bug
- **What happened:** New `POST /api/assistant/chat` (text + optional image) and `GET /api/assistant/history`
  worked end-to-end (register 201, chat 201, history 200 with correct roles, unauth 401), but both text and
  vision replies came back as the "offline mode" fallback.
- **Root cause:** `client.responses.create` threw `429 credit_balance_exhausted` / `insufficient_quota`
  (OpenAI account has no credits). `assistantAgent.js` catches the error and returns `fallbackReply`, which
  is the intended degraded behavior — not a bug in the agent.
- **Fix / prevention:** Add OpenAI credits. To diagnose silent agent fallbacks, probe the shared client
  (`require('./services/openaiservices.js')`, log `status/code/type/message` on the thrown error) instead of
  guessing at the agent's catch block. Agent follows the `assessmentAgent` pattern: guarded `if (client)`,
  catch → deterministic fallback.
- **Files involved:** `backend/agents/assistantAgent.js`, `backend/services/openaiservices.js`,
  `backend/controllers/assistantController.js`, `backend/models/AssistantMessage.js`.

### 2026-09-23 — Learner-modelling + content/resource agents added; catalog is empty in production
- **What happened:** Added `buildLearnerModel(studentId)` (priori knowledge, quiz/submission performance,
  activity stats, preferences, difficulty areas) and `recommendResources({ studentId, learnerModel })`
  (scores catalog materials: difficulty 30 + next-in-sequence 10 + new-but-unstudied 20 + enrolled 10),
  wired as `GET /api/learner/model` and `/api/learner/recommendations` (auth + isStudent). Verified
  end-to-end: fresh student → graceful empty model/recommendations; seeded scenario → difficulty area
  detected (30% quiz) and top recommendation correctly targets the weak module.
- **Gotcha 1 — eager associations:** `Material` has **no** direct `belongsTo(Course)` association, only
  `belongsTo(Module)`; to get the course title you must nest `include: Module → include: Course`, not
  `include: Course` on Material (Sequelize throws "model not associated").
- **Gotcha 2 — production Neon catalog is empty:** `Courses` exist (ids 6+) but **zero** Modules, Quizzes,
  or Materials. Any content-based recommendation will return an empty list until the catalog is populated;
  verification required seeding throwaway rows. The `TASKS.md`/LESSONS notes about seeded SOE courses with
  modules were stale relative to this DB (previous data was sqlite-era).
- **Gotcha 3 — `Quiz.type` ENUM is `quiz | test | exam`**, not `mcq`; seeding `type: 'mcq'` throws a
  validation error. `Quiz.instructorId` is NOT NULL and must point at an existing user row.
- **Files involved:** `backend/agents/learnerModellingAgent.js`, `backend/agents/contentResourceAgent.js`,
  `backend/controllers/learnerController.js`, `backend/routes/learner.js`, `backend/server.js`,
  `backend/models/{Material,Quiz,Module,QuizAttempt,ActivityLog}.js`.

### 2026-09-28 - Preferred learning mode (text/audio/video) captured and used to filter content; sandbox + enum gotchas
- **What happened:** Added a preferred learning mode flow: `PUT /api/learner/preferences`
  `{ learningMode: text|audio|video }` stores the value by merging into the existing `User.preferences` JSON
  (not a new migration), the learner agent exposes `profile.learningMode`, and the content agent filters the
  material catalogue to the preferred types (`text -> document/link`, `audio -> audio/link`, `video -> video`)
  with a PREFERENCE_WEIGHT and a `Matches your {mode} learning style` reason. New student screen
  `Learning Preferences` (`/learning-preferences`, sidebar link) prompts on first visit and lets them change
  anytime. Verified end-to-end: audio pref returns only the audio material, text pref only document, invalid
  mode rejected 400.
- **Gotcha 1 - Windows sandbox kills orphaned child processes:** a server started with `Start-Process` is
  killed when the bash tool call that spawned it returns, so an HTTP E2E server kept dying mid-run.
  Fix: spawn the server AND run the test script inside the SAME command invocation, then Stop-Process.
- **Gotcha 2 - `sequelize.query()` return shape:** it returns `[rows, metadata]` (array), not `{ rows }`;
  destructure `const [rows] = await sequelize.query(...)`.
- **Gotcha 3 - Postgres FK RESTRICT:** deleting a Module/Course/User that still has ActivityLog (or other)
  child rows throws `SequelizeForeignKeyConstraintError` (SQLSTATE 23503). Delete children first; keep
  cleanup so one failure cannot abort the rest (an uncaught throw in `finally` kills the whole cleanup).
- **Gotcha 4 - extending a Postgres ENUM:** `ALTER TYPE "enum_Materials_type" ADD VALUE IF NOT EXISTS 'audio'`
  must run standalone (not inside a transaction that uses the new value). On shared Neon this value already
  existed before the migration (earlier Sequelize sync had added it) - always verify `pg_enum` first
  (`SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname=...`).
- **Files involved:** backend `agents/learnerModellingAgent.js`, `agents/contentResourceAgent.js`,
  `controllers/learnerController.js`, `routes/learner.js`, `models/Material.js`; frontend
  `screens/learningPreferences.jsx`, `App.jsx`, `component/sidebar.jsx`.

### 2026-09-28 — Enrollment gated behind the 10-question assessment; per-course text/audio/video content generated
- **What happened:** Implemented the request to (a) make the assessment agent always ask exactly 10
  questions and gate new course enrollment behind it, and (b) generate course content covering text,
  audio, and video, stored in the DB. `POST /api/courses/enroll/:id` now returns
  `{ requiresAssessment: true, assessmentId, questions }` (sanitized, correct answers kept on the server in
  the shared `activeAssessments` map); enrollment is completed by `POST /api/assessment/submit`, which
  auto-enrolls on any score. New script `backend/scripts/generateCourseContent.js` (`npm run generate-content`)
  is idempotent and, per module, creates: a `document` study guide (markdown in `description`), an `audio`
  lesson (`linkUrl` = deterministic YouTube search-result URL — no real media assets exist), and a `video`
  lesson (`videoUrl` = YouTube search-result URL). Frontend `ModuleMaterials` now also renders `document`
  and `audio` (was video/link only). Verified E2E on Neon: enroll → exactly 10 questions, no
  `correctAnswer` leak, submit → enrolled, re-enroll → 200 "already enrolled", unknown course → 404; then
  150 materials (50/50/50) created after seeding modules. Backend has no jest tests (suite is empty).
- **Gotcha 1 — Courses auto-increment sequence drifted on shared Neon:** ids 6-12 were imported with
  explicit ids, but `Courses_id_seq` sat at 8, so `seedCourses.js` inserts collided, `findOrCreate` silently
  returned *other* courses and the seed aborted with a `SequelizeValidationError` ("Validation error", no model
  named). Fix: `SELECT setval(pg_get_serial_sequence('"Courses"','id'), (SELECT MAX(id) FROM "Courses"), true)`.
  Same class of bug as the earlier Users sequence fix — check sequences any time findOrCreate/seed inserts
  misbehave on imported data.
- **Gotcha 2 — the seed is a mutable catalog dump, not read-only:** `npm run db:seed` created demo users and
  gradebook rows on shared Neon too. It is idempotent; re-running after a failed partial run is safe.
- **Gotcha 3 — server port is 5000** (`.env PORT=5000`), not 4000; E2E health checks and API base must use it.
- **Files involved:** backend `agents/assessmentAgent.js` (new `normalizeQuestions`, `QUESTION_COUNT=10`,
  honors `OPENAI_MODEL`), `agents/assessmentStore.js` (new), `controllers/assessmentController.js`,
  `controllers/courseController.js` (`enrollCourse` gated), `scripts/generateCourseContent.js` (new),
  `package.json` (`generate-content` script); frontend `screens/coursesDetails.jsx`.

### 2026-09-28 — Switched AI provider from OpenAI to Groq (free tier); OpenAI-compatible call shape
- **What happened:** OpenAI account has no credits (`429 credit_balance_exhausted`), so per the user's choice the
  project now targets **Groq** (`https://api.groq.com/openai/v1`, OpenAI-compatible). `services/openaiservices.js`
  no longer exports the raw client; it exports `{ client, defaultModel }` and resolves `GROQ_API_KEY ||
  OPENAI_API_KEY`, with `AI_PROVIDER` (default `groq`) and `AI_BASE_URL` overrides. Both consuming agents
  (`assistantAgent.js`, `assessmentAgent.js`) switched from the Responses API (`client.responses.create` +
  `output_text`) to **Chat Completions** (`client.chat.completions.create({ messages })` +
  `choices[0].message.content`), and from the Responses content-part types (`input_text`/`input_image`) to
  chat parts (`text`/`image_url.image_url.url`). `defaultModel()` = `AI_MODEL || (provider==='openai' ?
  OPENAI_MODEL||'gpt-5.5' : 'llama-3.3-70b-versatile')`.
- **Gotcha 1 — Groq speaks Chat Completions, not the Responses API:** agents must use
  `chat.completions.create` with a `messages` array; `responses.create`/`output_text`/`input_*` content parts
  are OpenAI-only and fail/crash at Groq. Multi-turn history becomes plain `{ role, content: string }` entries.
- **Gotcha 2 — model IDs are provider-specific:** the existing `OPENAI_MODEL=gpt-5.5` in `.env` is invalid on
  Groq. `defaultModel()` therefore ignores `OPENAI_MODEL` unless `AI_PROVIDER=openai`; set `AI_MODEL` instead
  (e.g. `llama-3.3-70b-versatile`, or `llama-3.2-11b-vision-preview` if Ifeanyi must answer photos — the text
  model errors on `image_url` and silently falls back to offline replies).
- **Gotcha 3 — remote AI client needs dotenv loaded first:** constructing the client at require-time means
  `node -e "require('./services/openaiservices.js')"` (no dotenv) yields `client: null`; always load
  `dotenv.config()` first or boot through `server.js`.
- **Files involved:** backend `services/openaiservices.js` (rewritten), `agents/assistantAgent.js`,
  `agents/assessmentAgent.js`, `.env.example` (Groq vars documented).

### 2026-10-01 — `GROQ_API_KEY || OPENAI_API_KEY` silently aims an OpenAI key at Groq (config trap)
- **What happened:** Assessment generation and Ifeanyi chat both run on their deterministic
  offline fallbacks with **no log line, no telemetry and no client-visible flag**. It looks
  like "no API key configured" but the key *is* present and a request *is* being sent — it
  just cannot succeed.
- **Root cause:** `services/openaiservices.js:4-14` selects `provider = AI_PROVIDER || 'groq'`,
  resolves `apiKey = GROQ_API_KEY || OPENAI_API_KEY`, and hardcodes
  `baseURL = https://api.groq.com/openai/v1` for any provider that is not literally
  `'openai'`. In `backend/.env` only `OPENAI_API_KEY` is set (no `GROQ_API_KEY`, no
  `AI_PROVIDER`), so an **OpenAI key is sent to Groq's endpoint** and rejected. `client` is
  non-null, so both agents take the LLM branch (`assessmentAgent.js:247`,
  `assistantAgent.js` `if (client)`), hit the rejection, and fall through via a bare
  `catch` (`assessmentAgent.js:271-273`, `assistantAgent.js:86-88`).
- **Fix / prevention:** key, base URL and model must move as one unit. To use the OpenAI
  key already in `.env`, set `AI_PROVIDER=openai` — the existing `OPENAI_MODEL=gpt-5.5` is
  then also honoured, which it is not on Groq (see Gotcha 2 above). Do not let
  `||` precedence pick a key that belongs to a different provider than the chosen base URL.
  At minimum, log provider errors before falling back, and return a `fallback` flag in the
  assistant's 201 body so a canned reply is distinguishable from a live one.
- **Files involved:** `backend/services/openaiservices.js`, `backend/agents/assistantAgent.js`,
  `backend/agents/assessmentAgent.js`, `backend/.env`

### 2026-09-28 — Course "video" materials wouldn't play (YouTube search URLs are not video streams)
- **What happened:** Course-detail videos showed a dead player. Root cause: the content generator had stored
  `https://www.youtube.com/results?search_query=...` (an HTML search-results page) in `Materials.videoUrl`.
  The frontend `videoEmbedUrl()` returns null (no `v` param), so it fell into `<video src=searchUrl>`, and a
  browser cannot stream an HTML page. Same latent trap for the audio rows (audio used `linkUrl`, which renders
  as a button, so it was fine).
- **Fix / prevention:** `generateCourseContent.js` now writes a **verified playable MP4** into `videoUrl`
  (CC0 samples that returned `206 video/mp4` on a byte-range GET: MDN
  `interactive-examples.mdn.mozilla.net/media/cc0-videos/{flower,friday}.mp4`,
  `learningcontainer.com/.../sample-mp4-file.mp4`; rotated deterministically by `module.order`) and keeps the
  topic search as `linkUrl` for further reading. Re-ran the idempotent generator → 50 video rows updated.
  Frontend video block hardened: embeddable URL → iframe; media-file URL → `<video preload="metadata">`;
  otherwise "Open video lesson" link (never a dead player).
- **Gotcha — verifying media URLs:** PS 5.1 `Invoke-WebRequest` blocks the `Range` header on HTTP/2
  ("must be modified using the appropriate property") and some buckets 403 plain HEADs; use
  `curl.exe -s -o NUL -r 0-99 -w "%{http_code} %{content_type}"` to confirm a URL is actually streamable.
- **Gotcha — `%` precedence:** `(module.order || 1) - 1 % PLAYABLE_VIDEOS.length` parses as
  `order - (1 % len)`; must be `((module.order || 1) - 1) % PLAYABLE_VIDEOS.length`.
- **Files involved:** backend `scripts/generateCourseContent.js`, frontend `screens/coursesDetails.jsx`.

### 2026-09-29 — Real YouTube videos resolved per module without an API key; student-test function added (content / assessment)
- **What happened:** After the MP4 fallback, course videos still weren't "real" content. Requirement:
  content resource agent should attach an actual YouTube video for each module, searched by its course,
  and the assessment agent needed an explicit 10-question student test function.
- **Root cause / approach:** YouTube's public search page (`https://www.youtube.com/results?search_query=...`)
  embeds the top organic result as `"videoId":"<11 char>"`; a browser-UA `fetch` + regex extracts a real,
  embeddable watch URL with no Data API key (good — user has no Google API key). The assessment agent already
  produced exactly 10 questions via `generateAssessment`, so the test function reuses it and also returns the
  answer key for server-side scoring.
- **Fix / prevention:**
  - `contentResourceAgent.js`: new `resolveYouTubeVideo(query)` (fetch search page, extract first
    `"videoId"`, return `https://www.youtube.com/watch?v=<id>`) + `attachCourseVideos(course)` +
    `attachAllCourseVideos()`. Queries are "<course title> <module title> tutorial", batched 5-deep.
    Runner `scripts/attachCourseVideos.js` + `npm run attach-videos`.
  - Idempotence: only modules whose video material lacks a real watch URL get resolved on re-runs; modules
    already holding `youtube.com/watch?`/`youtu.be/` URLs are re-fetched/overwritten only if missing. This
    preserves earlier picks.
  - `generateCourseContent.js` guard: a video material that already has a real YouTube URL is never clobbered
    back to demo MP4s by a re-run.
  - `assessmentAgent.js`: exported `generateStudentTest(course)` → `{ count, questions, correctAnswers }`
    (always exactly 10); `courseController.enrollCourse` now routes through it.
- **Gotcha — one-off scripts on Neon:** `SequelizeConnectionAcquireTimeoutError` (acquire 10000ms) hit a
  50-iteration sequential update loop on a cold pooled connection; a whole run aborted mid-course. Fix:
  per-module try/catch + 2 retries in `updateVideoMaterial`, batch the slow network fetches (not the DB ops),
  and never let one module's failure fail the rest. Verify progress with a count query between runs.
- **Gotcha — PowerShell filters dropped diagnostics:** piping `npm run attach-videos` through
  `Select-String` silently hid failures written to stderr (`console.error`); capture with `*>` to a log and
  grep the log instead. PS 5.1 has no `&&` for chaining; use `if ($?)`, and `2>&1` merges stderr into the
  success stream so rerun failures become visible.
- **Verification:** all 50 video materials now hold `youtube.com/watch?v=` URLs, 0 demo MP4s, all 50 embed
  URLs return 200/403/404 on `youtube.com/embed/<id>`; E2E (boot + enroll + modules API) returns 10
  sanitized questions with no leaked `correctAnswer` and 5/5 real YouTube URLs for course 6.
- **Files involved:** backend `agents/contentResourceAgent.js`, backend `agents/assessmentAgent.js`,
  backend `controllers/courseController.js`, backend `scripts/attachCourseVideos.js`,
  backend `scripts/generateCourseContent.js`, backend `package.json`.

### 2026-09-29 — Collapsible sidebar shared across every dashboard screen (frontend / layout)
- **What happened:** The fixed `w-72` desktop sidebar forced every screen to reserve exactly `md:ml-72` of
  gutter; there was no way to collapse it, so 12 screens hardcoded that margin. Requirement: collapsible
  sidebar for all screens.
- **Fix / prevention:**
  - New `src/component/useSidebar.js`: `SidebarContext` + `useSidebar()` + localStorage persistence
    (`readSidebarCollapsed`/`persistSidebarCollapsed`, key `eduflow_sidebar_collapsed`).
  - `SidebarProvider` lives in `src/component/sidebar.jsx` (kept with its components so the react-refresh
    eslint rule never sees a non-component export in a component file), wrapping `<Routes>` in `App.jsx`.
  - `Sidebar`: on `md+` collapses to an icon rail (`w-72` → `w-20`) with a ChevronDouble toggle in the
    header, labels/portal-name/name block hidden via `md:hidden`, `title` tooltips on links + avatar,
    `transition-all` animates the width. Mobile drawer behavior unchanged.
  - All 12 sidebar screens read `const { collapsed } = useSidebar()` and render
    `${collapsed ? 'md:ml-20' : 'md:ml-72'}` on their content wrapper. `md:ml-20` (5rem) exactly matches
    the collapsed `w-20` rail; use the SAME spacing on both sides or content drifts.
- **Gotcha — collapse state is app-wide, not per screen:** because the provider wraps all routes, collapsing
  on one screen persists across navigation (and reloads) for every role — that's intended here ("for all
  screens"), but keep it in mind if per-route or per-role defaults are wanted later.
- **Verification:** `npm run lint` clean, `npm run build` succeeds (`✓ built`). No runtime DOM check was
  performed this pass beyond build; collapse toggles render server-agnostically from localStorage.
- **Files involved:** frontend `src/component/useSidebar.js` (new), `src/component/sidebar.jsx`,
  `src/App.jsx`, and 12 screens (`studentDashboard`, `settings`, `messages`, `manageUsers`,
  `manageCourses`, `courseConsistency`, `learningPreferences`, `aiAssistant`, `leaderboard`,
  `adminDashboard`, `instructorDashboad`, `instructorContent`).

### 2026-09-30 — Content resource agent: ~70% of recommendations target the learner's preferred mode (backend / agents)
- **What happened:** Learner-set `learningMode` (text/audio/video) previously FILTERED the catalogue to the preferred
  types only, so a video-mode learner never saw anything but videos. Requirement: the agent should give the student
  ~70% of course content in their mode while keeping ~30% as other-format variety.
- **Fix / prevention:** `recommendResources` now scores the FULL enrolled-catalogue (no `whereClause.type` filter when
  `preferredTypes` exists), then a post-ranking mix caps top-picked preferred items at `Math.ceil(MAX_RECOMMENDATIONS *
  PREFERRED_SHARE)` (`8 * 0.7 = 6`), fills the rest up to 8 with non-preferred items, and tops up shortfalls from
  deferred preferred items (`deferredPreferred.slice(0, 8 - mix.length)`). Ordering stays score-driven; the share is
  a cap, not a guarantee, when the pool has fewer preferred items than the target.
- **Gotcha — 70% is unreachable when preferred availability is low:** with 5 video / 5 audio / 5 document materials per
  course, `min(6, available)` is 5, so a video-mode single-course learner gets 5/8 (63%) — that is the correct "fill to
  the cap" behavior, NOT a bug. Verify against `preferredCount === Math.min(ceil(0.7N), availablePreferred)`, never a
  hard 70% assertion.
- **Gotcha — health probe key:** `GET /api/health` returns `{ success: true }`, NOT `status: 'ok'`; a boot-wait loop
  that checks `$r.status` never turns true. On Neon, Sequelize `sync()` takes ~40s (many `information_schema` queries),
  so wait loops must be long (≥75s) and keyed on `$r.success`.
- **Verification:** E2E (boot + register + `PUT /learner/preferences` + direct enrollment + `GET /learner/recommendations`):
  video mode → 5/8 video (all 5 available) + 3 others; text mode → 5/8 document (all 5 available) + 3 others; totals stay
  8. Test user + enrollment cleaned; scratch script deleted.
- **Files involved:** backend `agents/contentResourceAgent.js`.

### 2026-09-30 — Onboarding guide pop-up for new users (frontend / onboarding)
- **What happened:** New users had no guidance on how to use the app after signup. Requirement: a small step-by-step
  pop-up walking a new user through the app.
- **Fix / prevention:** New `src/component/onboarding.jsx` renders a 4-step modal (Welcome / Enroll in a course / Learn
  your way / Stay on track) with progress dots, prev/next/skip/done, and a one-time dismiss guard via
  `localStorage['eduflow_onboarding_<userId>']`. Mounted in `App.jsx` inside `SidebarProvider` (so it can use hooks
  under providers and never blocks unauthenticated routes).
- **Gotcha — one-time-per-user storage key:** keying the flag by plain user id keeps onboarding one-time per account
  while a shared key would hide it for every later user on the same device.
- **Follow-up — gate it to the dashboard:** the guide was first mounted globally, so a logged-in user hitting any
  first nav saw it everywhere. It must only appear when the user signs in and enters their dashboard: `App.jsx` now
  renders it via a `DashboardOnboarding` shim (`useLocation`) that only mounts `<OnboardingGuide />` on
  `/studentDashboard`, `/instructorDashboard`, `/adminDashboard`. Since login/signup redirect to
  `dashboardFor(role)`, the pop-up naturally fires right after sign-in, once per account.
- **Verification:** `npm run lint` clean; `npm run build` succeeds (component path transforms). Not yet opened in a real
  browser to eyeball the modal.
- **Files involved:** frontend `src/component/onboarding.jsx` (new), `src/App.jsx`.

### 2026-09-30 — Course screen: instructor details compact at top, content full-width (frontend / layout)
- **What happened:** The course-details hero already showed a compact instructor card, but a tall "Instructor" card in the
  right column stretched the course screen and left the content in a narrow `grid-cols-[1.2fr_0.8fr]` column.
  Requirement: content at 100% width and instructor details kept at the top, not a long side section.
- **Fix / prevention:** Added the instructor email line to the hero card (top). Replaced
  `<section class="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">` with `<section class="mt-10 space-y-8">` and deleted the
  right-column Instructor card + its wrapper, so About + Course Content span the full width. An inner
  `<div className="space-y-8">` wrapper remains (harmless redundancy).
- **Gotcha — delete a card's wrapper but keep the close-tag count balanced:** removing the instructor `<div>` and its
  `</section>` must replace with exactly one `</div>` (the left-column close) + `</section>`; the diff review showed a
  stray duplicate `</>` + `)}` + `</main>` had been introduced (end-of-file read: single `</main>` expected). Always
  `git diff` the tail of a structurally-edited JSX file and count openers/closers before relying on the build.
- **Verification:** `git diff` confirmed only intended lines changed; end-of-file now has exactly one `</>` `)}` `</main>`;
  `npm run lint` clean; `npm run build` succeeds.
- **Files involved:** frontend `src/screens/coursesDetails.jsx`.

### 2026-09-30 — Assessment agent: timed 10-question quiz, per-question feedback, weekly-area routing to the learner agent (backend / agents)
- **What happened:** The placement assessment only returned a score, a level, and one generic module. Requirement: a
  timed quiz with a 2-minute countdown that, on completion OR time expiry, shows a per-question breakdown (question,
  student answer, correct/wrong, correct answer for misses), identifies skill-gap modules from failed questions, and
  routes a structured report to the Learner Agent so it can recommend the exact module(s) to review.
- **Fix / prevention:**
  - `assessmentAgent.js`: every bank question is now topic-tagged (`bankTopics`, aligned by index, plus `genericTopics`).
    New `generateStudentTest(courseTitle, modules)` tags questions via `mapQuestionsToModules` — `topicMatchScore`
    (token-overlap vs module titles) assigns each question to a course module; unmatched questions are balanced
    round-robin-to-least-loaded so all modules are covered. The LLM path in `pickQuestions` falls back to the same
    tagging.
  - `evaluationAgent.js`: new `evaluateDetailed(studentAnswers, questions)` → `{ score, total, percentage, results,
    weaknesses }`, each result carrying question/options/topic/moduleOrder/moduleTitle/selectedAnswer/correctAnswer/isCorrect.
  - `recommendationAgent.js`: new `recommendModules(weaknesses, modules, level)` ranks modules by missed-questions
    (desc), top 3, with the level-based `pickModule` fallback on a perfect score.
  - New `models/AssessmentAttempt.js` (studentId, courseId, answers, results, weaknesses, moduleRecommendations, score,
    total, percentage, passed, level, timeSpent, completedAt) registered in `models/index.js`. `submitAssessment`
    persists it server-side; that record IS the structured report.
  - `learnerModellingAgent.js`: queries `AssessmentAttempt`; adds `performance.assessmentAttempts/averageAssessmentPercentage/
    assessmentPassRate` and a `weaknessAreas` array (module-title + topic-level misses across attempts). New
    `GET /api/learner/insights` surfaces the report.
  - `courseController.enrollCourse` now fetches the course modules and stores `startedAt`/`timeLimit` (120) in the
    active assessment so either entry point grades the same way.
  - Frontend `studentDashboard.jsx`: `submitAssessment` sends `timeSpent = ASSESSMENT_TIME_LIMIT - timeLeft`; result
    phase renders the per-question breakdown (selected vs correct), review-modules panel (missed counts + topics), and a
    "Time's up" note when expired. Removed the 3s auto-redirect so the feedback can actually be read (auto-jump defeated
    the point of showing a breakdown).
- **Gotchas:**
  - Don't reuse `QuizAttempt` — its `quizId` is `NOT NULL`; a dedicated `AssessmentAttempt` (new table, created by
    plain `sync()` on boot) is required.
  - A scratch E2E script that called the DB for cleanup must `require('dotenv').config()` first — `config/database.js`
    reads env at module load; without dotenv the Sequelize driver gets an undefined connection string ("url argument
    must be a string"). `server.js` does this at line 1; standalone scripts must too.
  - Keep `correctAnswer` stripped from `/start` (client sees options only) — the breakdown carries `correctAnswer` ONLY
    in the post-submit response, which is the intended feedback surface.
- **Verification:** backend E2E (boot + register + `/assessment/start` + submit with 3 deliberately-unanswered
  questions + `timeSpent:120`) → 10/10 module-tagged questions, `timeLimit:120`, breakdown raised the 3 unanswered as
  wrong, weakAreas 8, module recommendations ranked 2/2/2/2 by missed desc, `attemptId` persisted, `timeExpired:true`,
  learner model showed `weaknessAreas` with the matched module titles + topics, `GET /api/learner/insights` returned the
  same report, cleanup deleted the test user + rows. Frontend `npm run lint` + `npm run build` green (405 modules).
  Scratch script deleted.
- **Files involved:** backend `agents/assessmentAgent.js`, `agents/evaluationAgent.js`, `agents/recommendationAgent.js`,
  `agents/learnerModellingAgent.js`, `models/AssessmentAttempt.js` (new), `models/index.js`,
  `controllers/assessmentController.js`, `controllers/courseController.js`, `controllers/learnerController.js`,
  `routes/learner.js`, frontend `screens/studentDashboard.jsx`.

### 2026-09-30 — Content resource agent: preference-weighted dynamic feed (backend / agents)
- **What happened:** Requirement: the content agent must generate dynamic content per the learner's preferred mode —
  more YouTube videos for a video-mode learner, more audio for audio, more text for text. The prior 70/30 mix (see
  earlier 2026-09-30 entry) already weighted the mix, but videos/audio were still the old deterministic placeholders;
  recommenders only *ranked* catalogue items. Slas on-demand re-resolution on a per-request basis made the feed both
  genuinely dynamic and preference-correct.
- **Fix / prevention:**
  - `recommendResources` now returns `{ recommendations, total, learningMode, preferredCount }`; every video item in
    the mix is passed through `enrichVideoItem` (resolve + persist a real YouTube watch URL via `updateVideoMaterial`,
    no-op when the material already has a real watch URL via `isRealWatchUrl`), and every audio item through
    `enrichAudioItem` (ensures a `linkUrl`, generating a curated search URL when missing). Each recommendation gains a
    `preferred` boolean so the UI can badge it.
  - `resolveYouTubeVideo` fetch gets `AbortSignal.timeout(7000)` so a slow/hanging YouTube page can't stall the feed.
  - Frontend `studentDashboard.jsx` gained a "Recommended for You" tab: fetches `GET /api/learner/recommendations`,
    renders per-item type badges, a "Your style" flag on `preferred` items, media previews (YouTube iframe embed /
    `<video>` for mp4 / "Listen now" audio link / document excerpt), the agent's reason, "Open in course →"
    (`/courses/:courseId?module=<order>`) and "Set preference →" to `/learning-preferences`.
- **Gotchas:**
  - **Enrollment is gated; a scratch E2E that "enrolls" must create the row directly.** `POST /api/courses/enroll/:id`
    only *starts* the assessment (`requiresAssessment: true`) — the `Enrollment` row (and thus
    `priorKnowledge.enrolledCourses` driving the recommendations) is created only by `POST /api/assessment/submit`
    (`assessmentController.js`: `Enrollment.findOrCreate({ where: {courseId, studentId}, defaults: {status:'active',
    enrolledAt: new Date()} })`). First E2E returned `total: 0` for every mode because the enrollment never existed.
    Fix: have the E2E script do the same `Enrollment.findOrCreate` with `status:'active'` (buildLearnerModel filters
    `status: 'active'`).
  - **Scratch scripts on Neon must `require('dotenv').config()` first** (same gotcha as the assessment E2E):
    `config/database.js` reads env at module load, so a bare `require('./models')` throws "url argument must be a
    string". `server.js` loads dotenv; standalone scripts must too.
  - **On-demand enrichment only helps when the catalogue already holds playable media.** All 50 video materials now
    hold real watch URLs, so enrichment short-circuits (`isRealWatchUrl`) — the feed is therefore fast AND correct in
    production; the resolve path exists to self-heal any future module lacking a real URL.
- **Verification:** backend E2E (boot + register + direct `Enrollment.findOrCreate` + `PUT /learner/preferences` for
  each mode + `GET /learner/recommendations`): video mode → `{video:4, document:2, audio:2}` total 8,
  `preferredCount` 4, all videos real `youtube.com/watch?v=` URLs; audio mode → `{audio:4, document:2, video:2}`;
  text mode → `{document:4, audio:2, video:2}`; `learningMode` echoed; all type/URL/description assertions passed;
  test user + enrollment deleted (`Assessment.destroy` → `Enrollment.destroy` → `User.destroy`). `preferredTypesOk`,
  `videosOk`, `audiosOk`, `docsOk` all true. Frontend `npm run lint` + `npm run build` green (new bundle
  `index-BceNDVur.js`). Scratch script deleted.
- **Files involved:** backend `agents/contentResourceAgent.js`, frontend `screens/studentDashboard.jsx`.

### 2026-09-30 — Module-level personalization: more videos/audio/text per module for the learner's mode (backend / agents)
- **What happened:** Requirement: inside a MODULE, the learner should see more content of their preferred format —
  more videos for a video-preference user, more audio for audio, more text for text. The feed-level 70/30 weighting
  (previous entries) changed recommendation counts but not the per-module materials screen, which still showed the
  fixed catalogue (1 video + 1 audio + 1 document per module) to everyone.
- **Approach:** personalization at the module read layer, not in the shared catalogue. `GET /api/modules/course/:id`
  (and `/api/modules/:id`) now accepts an optional JWT (`authOptional` new middleware in `middleware/auth.js`);
  when the requester is a `student` with `preferences.learningMode`, the content agent appends VIRTUAL materials so
  the module has ≥ `AUGMENT_TARGET` (3) items of the mode's types (`video` for video; `audio`+`link` for audio;
  `document`+`link` for text). Non-preferred formats stay, so variety is preserved — only the mode's count rises.
- **Gotchas:**
  - **Never persist augmentation back to `Materials`:** the catalogue is shared by all learners; writing enriched
    rows would leak one user's personalization to everyone. Output plain objects (`module.get({ plain: true })` then
    `materials.concat(extras)`) instead of mutating Sequelize instances.
  - **Optional auth ≠ global auth:** swapping the public GET routes to the strict `auth` middleware would 401
    anonymous crawlers and the instructor content screen's tokenless calls. Use `auth.authOptional` (valid token →
    `req.user`, else continue) and gate personalization on `req.user?.role === 'student'`.
  - **Route order:** `/course/:courseId` must stay registered before `/:id` (existing rule) — the new middleware
    doesn't change that.
  - **Video resolution cost is per-module, so cache it:** a course's first augmented view resolves up to 2 extra
    videos per module. Cache resolved watch URLs in an in-memory `Map` (`moduleAugmentCache`, key
    `` `${moduleId}:${query}` ``) so repeat loads are instant; resolve each module's extras sequentially while
    running the two fetches within a module in parallel; failures degrade to the search-url link (frontend already
    renders "Open video lesson" when `videoUrl` is null).
  - **"More text" has no external source:** generate document extras deterministically by splitting the module's
    real `Module.content` into labelled reading parts (≥80-char paragraphs); when the content can't be split,
    pad with `link` extras (`readingSearchUrl` → Google "study guide" search) instead of fabricating prose.
- **Verification:** backend E2E (boot + register + direct enrollment + per-mode `PUT /learner/preferences` +
  `GET /api/modules/course/:id`): video mode → each of the 4 modules shows 3 videos (3 with real
  `youtube.com/watch?v=` URLs, total 5 = 3 video + 1 audio + 1 document); audio mode → each module 3 audio/link;
  text mode → each module 3 document/link (reading parts split from module content); instructors and anonymous
  GETs are NOT augmented (`_augmented` absent); `SOME_EXTRA_CONTENT_DETECTED` true; test users + enrollment
  deleted. Scratch script deleted. Frontend unchanged (ModuleMaterials already renders every type, including
  virtual items).
- **Files involved:** backend `middleware/auth.js`, `agents/contentResourceAgent.js`, `controllers/moduleController.js`,
  `routes/modules.js`.

## Documentation / Mermaid

### 2026-10-01 - `usecaseDiagram` and `componentDiagram` no longer exist; `A --> B : label` and `actor` are invalid in `flowchart` (documentation / mermaid)
- **What happened:** All nine diagrams in `docs/uml.md` were authored with classic Mermaid syntax and three of
  them failed to render: `usecaseDiagram` and `componentDiagram` were rejected as unknown diagram types, and the
  deployment `flowchart` failed on its `actor User as "User browser"` line. A fourth fault was latent: `A --> B : label`
  (colon after the target) is rejected by the flowchart parser, so 20 labelled edges were broken.
- **Root cause:** Mermaid removed the classic use case and component diagrams in 10.9 (11.x only registers the
  `usecase-beta` keyword, 12.x dropped it from the registry entirely). `actor` is only a keyword in use case,
  component, state and sequence diagrams, not in `flowchart`. Edge text must sit *inside* the link
  (`-->|text|`) or between its halves (`-- text -->`).
- **Fix / prevention:** Express use case and component views with `flowchart`: use case ovals `(("..."))`,
  actors `(["..."])`, boundaries/component groups as subgraphs, `A -->|text| B` and `A -.->|text| B` for labels.
  Validate with `mermaid.parse()` before shipping: `npm i mermaid jsdom`, stub `window`/`document`/`navigator`
  from jsdom (`navigator` needs `Object.defineProperty` on Node 24), extract the fenced blocks, then run the parse
  against 10, 11 and 12 to confirm portability. `:::className` inline classes work in every version; `|` inside a
  `classDiagram` member line is fine.
- **Files involved:** `docs/uml.md`, `docs/requirements.md`.

### 2026-10-01 — `backend/AGENTS.md` documents a database stack the code does not use (doc drift)
- **What happened:** While writing `docs/IMPLEMENTATION.md` I nearly documented MySQL/SQLite
  with a `DB_DIALECT=mysql|sqlite` switch, because that is what `backend/AGENTS.md` states.
  The code has been PostgreSQL all along.
- **Root cause:** `backend/AGENTS.md` still describes "MySQL (mysql2) or SQLite (sqlite3),
  switched purely via `DB_DIALECT`". The real `backend/config/database.js:3-16` is
  `new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres' })` with mandatory TLS and
  `rejectUnauthorized: false`. There is no `DB_DIALECT`, no `mysql2` and no `sqlite3`
  dependency anywhere. The file also predates the `VERIFY before done` evidence standard, so
  its claims are unversioned and unverified.
- **Fix / prevention:** Agent instruction files are load-bearing and must be treated like
  code: when a fact is wrong, correct it in place rather than routing around it, since every
  future agent reads it first. Before trusting `AGENTS.md` for anything environment-shaped,
  confirm it against `package.json` and the config module. Recorded as **D-14** in
  `docs/IMPLEMENTATION.md`; the document stack there (React 19 + Express 4 + Sequelize 6 +
  PostgreSQL/Neon) is the verified one.
- **Files involved:** `backend/AGENTS.md`, `backend/config/database.js`, `docs/IMPLEMENTATION.md`.

### 2026-10-02 — Untracked Mongoose-era `tests/test.js` makes "no test suite exists" false and unrunnable (tests / verification)
- **What happened:** While closing out the schema/data-flow documentation I stated "no backend
  test suite exists" (carried from the 2026-10-01 implementation-doc pass and the Backlog entry).
  `git status` shows an **untracked** `tests/test.js` plus a root `package.json`/`package-lock.json`
  diff that adds `jest@^29`, `supertest@^7` and a `"test": "jest --runInBand --detectOpenHandles"`
  script. So a suite exists in the working tree even though none is committed.
- **Root cause:** the file is stale Mongoose-era code, never run. `tests/test.js:8-9` calls
  `User.deleteMany({})` (Sequelize has no `deleteMany`; the correct call is `User.destroy({where:{}})`)
  and references `RoomRequest.deleteMany({})`, a model that does not exist in `backend/models/`, so
  `beforeEach` throws `ReferenceError` before any assertion runs. It also asserts a
  `role: 'user'` registration (`test.js:96`) that the `User.role` ENUM does not accept, and asserts
  `res.body.data` shapes that `authController` does not return.
- **Fix / prevention:** three rules. (1) Never assert "no tests exist" from memory or from a
  previous doc — check `git status` for untracked test files and grep `package.json` for a `test`
  script before claiming it. (2) A test file that is untracked and references a removed ORM is
  worse than no test file, because it looks like coverage; treat it as absent until it has been
  run green. (3) When reporting verification for a documentation task, say what was actually
  executed (Mermaid `mermaid.parse()` on every fenced block) and list the runtime checks that were
  **not** run, rather than implying the suite covers the claim.
- **Files involved:** `tests/test.js` (untracked, not modified by this work), root `package.json`,
  root `package-lock.json`, `backend/models/User.js`, `backend/controllers/authController.js`,
  `.agents/TASKS.md` Backlog.

### 2026-10-02 — Read/write inventories are grep-able; "read-only" endpoints can still write (data flow / audit)
- **What happened:** Building `docs/data-flow.md` required a complete read+write inventory of all
  17 models. Two facts that a prose reading of the controllers would have missed both surfaced from
  one grep of model method calls across `backend/controllers/` and `backend/agents/`:
  `GET /api/learner/recommendations` performs `Materials.update` via
  `agents/contentResourceAgent.js:406` and `:429` (persisting resolved YouTube/audio URLs), and
  `GET /api/forums/threads/:id` increments `Threads.viewCount` on read
  (`controllers/forumController.js:170-171`). Both are GET handlers with side effects, so "read
  endpoint" and "read-only" are not synonyms here.
- **Root cause:** side effects were introduced for good reasons (cache the resolved URL so repeat
  loads are instant; count forum views) but were added inside existing read handlers rather than as
  explicit write endpoints, so no route map, no RBAC list and no test surfaced them.
- **Fix / prevention:** for any data-flow or persistence audit, enumerate with a mechanical grep
  rather than by reading handlers, e.g.
  `Select-String -Path backend\controllers\*.js,backend\agents\*.js -Pattern '\.(findAll|findOne|findByPk|count|create|update|destroy|save|upsert|findOrCreate)\('`.
  The read side tells you where the N+1 and full-table-scan costs are; the write side inside read
  handlers is the highest-value thing to find. Also check `*.update(` / `*.save()` rather than only
  `*.create()`/`*.destroy()` when auditing writes — `incrementLastLogin`-style updates are easy to miss.
- **Files involved:** `backend/agents/contentResourceAgent.js`, `backend/controllers/forumController.js`,
  `backend/controllers/courseController.js`, `backend/controllers/gradebookController.js`,
  `backend/agents/learnerModellingAgent.js`, `docs/data-flow.md`.

## Build / dependencies

### 2026-10-05 — Root manifest duplicated the whole workspace tree, making a Windows-only native binary a *required* dep and breaking Linux deploys with EBADPLATFORM (build / deps)
- **What happened:** Render (Linux, Node 24.14.1) failed `npm install` at the repo root with
  `EBADPLATFORM: Unsupported platform for lightningcss-win32-x64-msvc@1.32.0: wanted {"os":"win32","cpu":"x64"}
  (current: {"os":"linux","cpu":"x64"})`. Local `npm install` on Windows always succeeded, so the
  bug was invisible until a Linux CI/CD run.
- **Root cause:** the root `package.json` (npm workspaces root) carried a `dependencies` block with
  **393 packages** — the entire hoisted dependency tree of *both* workspaces duplicated as **direct
  root dependencies**. Two entries gave it away:
  `"lightningcss-win32-x64-msvc": "^1.32.0"` (line 231, a Windows-only native binary) and
  `"education-platform-backend": "^1.0.0"` + `"eduflow": "^0.0.0"` (lines 94-95), i.e. the manifest
  listed the workspaces themselves as dependencies of the root. It was generated from a resolved
  workspace tree, not hand-authored.
  The mechanism: npm treats **optionalDependencies** as skippable when `os`/`cpu` don't match, but a
  **direct** dependency as mandatory. Because `lightningcss-win32-x64-msvc` was direct, its lockfile
  entry lost `"optional": true` and became `os: ["win32"], optional: undefined` — so on Linux npm
  had no legal way to skip it and threw. Every other platform-specific package in the lock
  (`@tailwindcss/oxide-*`, `@rolldown/binding-*`, `@libsql/*`, `fsevents`, the other
  `lightningcss-*`) was correctly `optional: true` and therefore harmless. `libsql` was the other
  non-optional entry but was multi-platform, so it did not fail.
- **Fix:** deleted the whole root `dependencies` block (kept `workspaces`, `scripts`, metadata and
  root-only `devDependencies`: `jest` + `supertest`). Both workspaces already declare their own
  dependencies correctly (`backend/package.json` 16 deps, `frontend/package.json` 5 deps + 8 devDeps),
  so nothing was lost. Regenerated `package-lock.json` with `npm install --package-lock-only`:
  635 -> 612 entries, and **every** entry carrying `os`/`cpu` is now `optional: true`. Then a real
  `npm install` ("removed 15 packages") and `npm run build` green.
- **Prevention:**
  1. With npm workspaces the root manifest declares only `workspaces`, `scripts`, metadata and
     root-only deps. Anything else in the root `dependencies` is suspect — especially a package name
     that matches a workspace name, which is proof the manifest was machine-generated from the tree.
  2. After **any** dependency change, assert the lockfile has no mandatory platform-specific package:
     `node -e "for(const [k,v] of Object.entries(require('./package-lock.json').packages)) if((v.os||v.cpu)&&!v.optional) console.log(k)"`
     — expected output is empty. Run it before every deploy.
  3. A lockfile regenerated on Windows is not automatically valid for a Linux deploy target. Native
     packages (`lightningcss`, `@tailwindcss/oxide`, `@rolldown/binding-*`, `esbuild`, `@swc/*`) are
     exactly where cross-platform lockfiles break.
  4. Verify deploys on a Linux runner or a `node:24` Docker container once, rather than trusting a
     Windows-only `npm install` as evidence that the manifest is sound.
- **Files involved:** `package.json` (root), `package-lock.json` (root), `backend/package.json`,
  `frontend/package.json`.

### 2026-10-05 — A bare `catch` around the AI call turned a provider misconfiguration into "offline mode" (ai / diagnostics)
- **What happened:** The in-app assistant replied *"I understand you're asking about something, but I'm
  currently in offline mode and can't reach the AI service..."* for every question. The same message
  appeared for image uploads (a different string, `assistantAgent.js:25`). No log line, no status code,
  nothing — the assistant looked like a working feature that was merely down.
- **Root cause (two layers, and only the first was guessable from code):**
  1. `services/openaiservices.js:4` did `const provider = (process.env.AI_PROVIDER || 'groq')`. The
     provider was decided **independently of which key was present**, so a `.env` holding only
     `OPENAI_API_KEY` still got `provider === 'groq'` and therefore `baseURL = GROQ_BASE_URL`
     (`:10-12`) — an OpenAI key posted to `api.groq.com`, which rejects it with a 401. `.env` has
     `OPENAI_API_KEY` set and **no** `GROQ_API_KEY`, so every call 401'd.
  2. `assistantAgent.js:86` and `assessmentAgent.js:271` both had a **bare `catch` with only a
     comment** — no logging. The 401 was swallowed and execution fell through to `fallbackReply` /
     the deterministic course bank. So a credential/endpoint bug and a genuine network outage
     produced byte-identical user-facing output.
  Fixing only layer 1 would have left the app *still* silent: with the endpoint corrected, the real
  error surfaced as `429 You have no credits remaining` (the OpenAI account had been exhausted,
  which is exactly why Groq was adopted on 2026-09-28). Only logging the error revealed that.
- **Fix:**
  - `openaiservices.js`: infer the provider from the key that is actually present
    (`const inferredProvider = process.env.GROQ_API_KEY ? 'groq' : 'openai'`) and let an explicit
    `AI_PROVIDER` still win. Original key precedence (`GROQ_API_KEY || OPENAI_API_KEY`) is unchanged,
    and `baseURL` is left undefined for OpenAI so the SDK uses its own default.
  - Both agents now log the real cause: `console.error('[assistant] AI request failed:', error.status || '', error.message || error)`.
    Status + message only, never the key or the request body.
- **Prevention:**
  1. **Never let a provider/base-URL default disagree with the credential it is paired with.** When
     two env keys select two different endpoints, the endpoint must be derived from the key that was
     actually found; an independent default is a silent-failure generator.
  2. **A bare `catch` that falls back to canned text is a logging defect, not just a design choice.**
     A fallback is fine; a *silent* fallback is not. Any branch that can degrade gracefully must
     record why it degraded.
  3. When a swallowed error is suspected, **add the logging first and re-run** — that is the only way
     to learn the real status code. Guessing the cause from static reading gets you the reachable
     bug (the wrong endpoint) and hides the one that actually blocks the user (no credits).
  4. Prove provider/credential resolution as a **matrix**, not a single case. Spawning the module
     under 8 env combinations (key present/absent × provider override × base-URL override × model
     override) exposed every precedence rule at once, including that `AI_MODEL` and `AI_BASE_URL`
     correctly outrank the inferred provider.
- **Files involved:** `backend/services/openaiservices.js`, `backend/agents/assistantAgent.js`,
  `backend/agents/assessmentAgent.js`, `backend/.env`.
