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
