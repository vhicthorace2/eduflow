# TASKS.md — Task Tracker (EduFlow)

Summary of longer-running work. Keep exactly one item `in_progress` at a time.
Mark `completed` only after verification. If blocked, leave `in_progress` and
add a follow-up note describing the blocker.

When you start, finish, or reprioritize work, update this file.

---

## Completed

### 2026-09-30 — Content resource agent: dynamic preference-based feed + student dashboard "Recommended for You"
- **Status:** completed
- **Summary:** The content agent now generates a dynamic, preference-weighted resource feed — video learners get
  more YouTube videos, audio learners more audio, text learners more text — and the student dashboard surfaces it
  as a "Recommended for You" tab.
- **Backend:** `contentResourceAgent.js` — `recommendResources` enriches the final mix (adds `preferred` flag each
  item, returns `{ recommendations, total, learningMode, preferredCount }`): video items via `enrichVideoItem`
  (persist a real YouTube watch URL when missing; no-op via `isRealWatchUrl` when already real), audio items via
  `enrichAudioItem` (ensure a `http(s)` `linkUrl`). `resolveYouTubeVideo` fetch hardened with
  `AbortSignal.timeout(7000)`.
- **Frontend:** `studentDashboard.jsx` — new "Recommended for You" tab fetching `GET /api/learner/recommendations`;
  per-item type badge, "Your style" flag on `preferred`, media preview (YouTube embed / `<video>` mp4 / audio link /
  document excerpt), agent reason, "Open in course →" (`/courses/:courseId?module=<order>`), and "Set preference →"
  when no mode is set.
- **Verified:** backend E2E on Neon for all three modes —
  video → `{video:4, document:2, audio:2}` totals 8, preferredCount 4, all videos real watch URLs;
  audio → `{audio:4, document:2, video:2}`;
  text → `{document:4, audio:2, video:2}`;
  `learningMode` echoed, all type/URL/description assertions passed, test user + enrollment cleaned, scratch script
  deleted. Frontend `npm run lint` clean + `npm run build` green.
- **Files:** `backend/agents/contentResourceAgent.js`, `frontend/src/screens/studentDashboard.jsx`
- **Follow-up:** UI not yet eyeballed in a real browser (visual check pending on next WATCH/live run).

### 2026-09-30 — Module-level personalization: more videos/audio/text per module for the learner's mode
- **Status:** completed
- **Summary:** The per-module study screen now adapts to the learner's preferred mode: a video-mode learner sees
  ≥3 videos in each module, an audio-mode learner ≥3 audio/link items, a text-mode learner ≥3 document/link items
  (real reading parts split from the module's own content), while the other formats stay for variety.
- **Backend:**
  - `middleware/auth.js`: new `authOptional` (valid token → `req.user`, else continue) exported alongside `auth`.
  - `agents/contentResourceAgent.js`: new `augmentModuleMaterials({ courseTitle, module, materials, learningMode })`
    — appends VIRTUAL materials until the module has `AUGMENT_TARGET` (3) items of the mode's types
    (`PREFERRED_TYPES`); video extras resolve real YouTube watch URLs on demand (cached per `moduleId:query`,
    degrade to a search link), audio extras use curated search links, text extras split `Module.content` into
    labelled reading parts (fallback: `link` items via a "study guide" search).
  - `controllers/moduleController.js`: `getModules` personalizes only for `role === 'student'` with a
    `learningMode`, and returns plain objects (`module.get({ plain: true })`) so virtual items serialize cleanly.
  - `routes/modules.js`: public GETs `/course/:courseId` and `/:id` now use `auth.authOptional`.
- **Verified:** backend E2E on Neon — video mode → 3 videos per module (3 with real watch URLs, 5 total
  materials/module); audio mode → 3 audio/link per module; text mode → 3 document/link per module; instructor
  token and anonymous GETs NOT augmented; test users + enrollment deleted. No frontend change needed —
  `ModuleMaterials` already renders every type. Scratch script deleted.
- **Files:** `backend/middleware/auth.js`, `backend/agents/contentResourceAgent.js`,
  `backend/controllers/moduleController.js`, `backend/routes/modules.js`

### 2026-09-30 — Production refresh 404: SPA fallback was missing because the Vercel project never builds as services
- **Status:** completed
- **Summary:** Refreshing deep client-side routes on the live site returned 404. The project's dashboard preset was "Other" with Root Directory "frontend", so the repo-root services `vercel.json` was ignored and the SPA had no fallback. Added `frontend/vercel.json` with a catch-all SPA rewrite (excluding `/api` and `/uploads`) and redeployed to production.
- **Verified:** `/`, `/studentDashboard`, `/login` → 200 SPA; `/api/health` → real 404 (not index.html). Deployed via `npx vercel --prod`.
- **Files:** `frontend/vercel.json` (new, uncommitted)
- **Follow-up:** Optional — set Framework Preset to **Services** in the Vercel dashboard (and clear rootDirectory) to activate the repo-root `services` config so `/api` routes to the backend on the same domain; no CLI command exists for that setting.

### 2026-09-03 — Single-domain Vercel hosting: root workspaces package.json for backend + frontend
- **Status:** completed
- **Summary:** The repo already had `vercel.json` deploying both apps under one domain. Added the missing root
  `package.json` with npm workspaces (`backend`, `frontend`) and regenerated the root `package-lock.json` so
  Vercel can install all dependencies in one step and build both apps reliably from the repo root.
- **Details:**
  - Root `package.json`: `"workspaces": ["backend", "frontend"]` + scripts `build`, `seed`, `dev:backend`,
    `dev:frontend`.
  - Regenerated root `package-lock.json` (was an empty `"packages": {}` stub) and verified the `backend`/
    `frontend` workspace entries are tracked.
  - `npm run build` at the root runs the frontend prod build (vite → `dist/`) successfully — what
    `@vercel/static-build` consumes (`distDir: dist`).
- **Verified:** `npm run build` green at the repo root; lockfile tracks both workspaces.
- **Files:** `package.json` (root, new), `package-lock.json` (root, regenerated), `vercel.json`,
  `.vercelignore` (new), `backend/server.js`
- **Follow-up:** Fixed `vercel.json` SPA fallback — final catch-all now serves `index.html` (was
  `frontend/$1`, which 404'd on BrowserRouter deep links like `/login`, `/dashboard`, `/courses/:id` on
  refresh), and added an `/uploads/(.*)` → backend route. JSON validated. Added `.vercelignore` (excludes
  node_modules, .agents, .opencode, .env, stray empty `src/`) and a `VERCEL === '1'` guard in
  `backend/server.js` so it exports the app without binding a port on serverless (local boot re-verified).

### 2026-09-03 — Configure backend for hosted MySQL (TiDB Cloud Serverless on Vercel)
- **Status:** completed
- **Summary:** The backend already supported MySQL via `DB_DIALECT=mysql`. Prepared it for online hosting on
  Vercel + a managed MySQL-compatible DB: create-only schema sync now runs in every environment (so a fresh
  hosted DB gets its tables on first boot), and the connection pool is serverless-aware so many cold-start
  instances don't exhaust the provider's socket limit.
- **Details:**
  - `backend/config/database.js`: moved plain `sequelize.sync()` + idempotent `ensureColumn` migrations out of
    the dev-only gate so they run in production too (safe — plain sync only creates missing tables). Made the
    SQLite backup-table cleanup dev-only. Pool: `DB_POOL_MAX` env, default `1` when `VERCEL=1`/`SERVERLESS=1`
    (small for serverless) else `5`; shorter `acquire` on serverless.
  - `backend/.env.example`: documented the production MySQL + serverless pooling vars and the provider mapping.
- **Verified:** `node -c config/database.js` passes; backend boots and `GET /api/health` returns
  `{ success: true }` with the refactored `connectDB`.
- **Files:** `backend/config/database.js`, `backend/.env.example`
- **Remaining (user-side):** create TiDB Serverless cluster, add its Vercel integration, set the
  `DB_*`/`JWT_SECRET` env vars, and run `npm run db:seed` once against the hosted DB to load the catalog.

### 2026-09-03 — Student dashboard: fix placement-assessment retake/stale-state bugs
- **Status:** completed
- **Summary:** Bug scan of `studentDashboard.jsx` (assessment wizard) found the retake flow kept stale
  attempt data and a versioned timer; error path stranded the user in the questions phase; submit had no
  double-fire guard.
- **Details:**
  - `startAssessment()` now clears `assessmentId/questions/answers/result` in the same update that sets
    `phase:'questions'` (so retake shows a clean loading state and the timer starts only when the new
    `assessmentId` arrives), and reverts to `phase:'intro'` on API failure so the user isn't stuck.
  - Reads `wizard.course` into a local `const` before the async boundary.
  - Added a `submitting` guard to `submitAssessment` (early-return + `finally` reset) and wired it into the
    Submit button `disabled`/label to prevent double-submit.
- **Verified:** `npm run lint` + `npm run build` green.
- **Files:** `frontend/src/screens/studentDashboard.jsx`
- **Deferred (tech debt):** N+1 `/modules/course/:id` calls, missing ARIA `tabpanel`/`aria-labelledby`
  linkage, `Invalid Date` guard on `attempt.completedAt`, `enrolledIds` not memoized.

### 2026-08-31 — Student dashboard: section tabs (My Courses / Upcoming Tasks / Recent Results / Available Courses)
- **Status:** completed
- **Summary:** Converted the stacked content sections on the student dashboard into a tab bar so
  the "My Courses", "Upcoming Tasks", "Recent Results", and "Available Courses" sections are
  separated and only the active one renders. Styled to match the existing tab pattern used on the
  instructor content screen and sized to be uniform on mobile.
- **Details:**
  - `frontend/src/screens/studentDashboard.jsx`: added a `SECTIONS` constant (courses/tasks/
    results/available) and a `section` state (default `'courses'`). Replaced the old single-column
    stack (Main grid + Available Courses + Bottom grid) with a `flex flex-wrap` tab bar
    (`role="tablist"` with `role="tab"`/`aria-selected` buttons) styled exactly like
    `instructorContent.jsx` (active = `bg-orange-500/15 text-accent ring-1 ring-inset
    ring-orange-400/30`). Each section is now a conditional panel `{section === '...' && (...)}`
    so only the active tab's content is in the DOM.
  - Made card padding mobile-friendly and consistent with the other cards: all panel cards moved
    from fixed `p-8` to `p-6 sm:p-8` so every tab matches the compact stat/Available-Courses sizing
    on phones. The Available Courses header now stacks as `flex-col sm:flex-row` on mobile.
- **Verified:** `npm run lint` + `npm run build` green.
- **Files:** `frontend/src/screens/studentDashboard.jsx`

### 2026-08-31 — Fix horizontal scroll on the courses catalog on mobile
- **Status:** completed
- **Summary:** The course catalog page scrolled horizontally on phones. Root cause: grid
  children default to `min-width: auto`, so a long category/difficulty chip could force the
  12-col grid track wider than the viewport; the page-level `body{overflow-x:hidden}` masked it
  but some devices still scrolled.
- **Details:**
  - `frontend/src/screens/courseCatalog.jsx`: added `min-w-0` to the row grid and to the badge
    (`flex flex-wrap`) grid item so content can shrink below its min-content instead of expanding
    the track; capped the badge row with `max-w-full`.
  - `frontend/src/index.css`: added `overflow-x: hidden` to `html` to complement the existing
    `body` rule, preventing document-level horizontal scroll on devices where body-level
    clipping alone wasn't enough (the root `<html>` is the actual scroll container in most
    browsers).
- **Verified:** `npm run lint` + `npm run build` green.
- **Files:** `frontend/src/screens/courseCatalog.jsx`, `frontend/src/index.css`

### 2026-08-31 — Messaging UI (student↔student/instructor) + Leaderboard (top 5 students)
- **Status:** completed
- **Summary:** Two features shipped together: an in-app Messages screen backed by the
  existing (previously headless) Message API plus the missing user-directory endpoint, and a
  Leaderboard ranking the top 5 students by 50% engagement (time on content) + 50% academics.
  Both screens are wired to App.jsx routes and sidebar links for all roles.
- **Details:**
  - Backend messaging: new `GET /api/messages/users` directory (auth, active users, excludes
    self + admins, optional `search` across name/email and `role` filter, returns
    id/name/email/role/avatar). Route registered before `/:id` in `routes/messages.js`.
  - Backend leaderboard: new `timeSpent` INTEGER column on `ActivityLog` (model + idempotent
    `ensureColumn('ActivityLogs','timeSpent')` in `config/database.js`); `POST /api/activity`
    now accepts and clamps an optional `timeSpent` (seconds, capped 24h). New
    `leaderboardController.getLeaderboard` aggregates per-student total timeSpent + best quiz
    %, graded assignment %, and gradebook overall grade; composite = 50% normalized engagement
    + 50% academics; top 5, ties broken by academic then name. Mounted `GET /api/leaderboard`
    (auth + authorize student/instructor/lecturer/admin).
  - Frontend messaging: `screens/messages.jsx` with conversation list grouped by other party,
    unread badges, inline thread view, directory search + compose, and reply. Uses
    `userStore` to determine "mine" when grouping.
  - Frontend leaderboard: `screens/leaderboard.jsx` with rank list, medal styling, time/academic
    breakdown, and composite progress bar.
  - Frontend routes: `/messages` and `/leaderboard` in `App.jsx` (RequireRole all roles);
    Messages + Leaderboard links added to every ROLE_LINKS array in `sidebar.jsx`.
  - `screens/coursesDetails.jsx`: replaced immediate `module_view` POST with session-based
    timing — `moduleSession` ref records open time (via module-scope `nowMs()` to satisfy the
    React `react-hooks/purity` lint), elapsed seconds are sent as `timeSpent` on module close,
    and an unmount cleanup flushes any still-open module.
- **Verified:** frontend `npm run lint` + `npm run build` green; backend boots clean
  (`Database synchronized`, `PRAGMA TABLE_INFO('ActivityLogs')` confirms column). Live smoke
  test: `GET /api/messages/users` (logged-in instructor sees 9 students+instructors, self+admin
  excluded), `GET /api/leaderboard` returns 5 ranked rows, `POST /api/activity` with
  `timeSpent: 120` then leaderboard recomputed Demo Student time 0→120s, composite 35.5→85.5
  (correct 50/50 blend). All new routes return 401 without a token.
- **Files:** `backend/controllers/messageController.js`, `backend/routes/messages.js`,
  `backend/models/ActivityLog.js`, `backend/config/database.js`,
  `backend/controllers/activityController.js`, `backend/controllers/leaderboardController.js`,
  `backend/routes/leaderboard.js`, `backend/server.js`,
  `frontend/src/screens/messages.jsx`, `frontend/src/screens/leaderboard.jsx`,
  `frontend/src/screens/coursesDetails.jsx`, `frontend/src/App.jsx`,
  `frontend/src/component/sidebar.jsx`

### 2026-08-18 — Settings: profile photo upload (camera or device)
- **Status:** completed
- **Summary:** The Settings page now lets a user set/change their profile photo, either by taking a
  picture with their camera or uploading an image from their device.
- **Details:**
  - Backend: added `module.exports.uploadAvatar` in `middleware/upload.js` — an image-only uploader
    (JPEG/PNG/GIF/WebP, 5MB cap) reusing the existing disk storage. New `PUT /api/settings/me/avatar`
    route (`routes/settings.js`) with `auth` + `uploadAvatar.single('avatar')`; new
    `settingsController.updateAvatar` sets `user.avatar` to the web-served URL `/uploads/<filename>` and
    best-effort deletes the previous uploaded avatar. `serializeUser` already returns `avatar`, so the
    response includes it. Error handling: filter rejections now carry `statusCode 400`; `errorHandler`
    gained a `MulterError`/`LIMIT_FILE_SIZE` → 400 branch.
  - Frontend (`settings.jsx`): profile avatar now renders the stored `avatar` URL when present (falling
    back to the static image); added "Take photo" (hidden `<input capture="user" accept="image/*">`) and
    "Upload from device" (hidden `<input accept="image/*">`) buttons, an object-URL preview with
    "Use this photo"/"Cancel" confirmation, and upload via `api.put('/settings/me/avatar', FormData)`
    (multipart). On success it updates local state and `userStore`.
  - Verified frontend `npm run lint` + `npm run build` green and backend modules load.
- **Files (backend):** `backend/middleware/upload.js`, `backend/routes/settings.js`,
  `backend/controllers/settingsController.js`, `backend/middleware/errorHandler.js`
- **Files (frontend):** `frontend/src/screens/settings.jsx`

### 2026-08-18 — Nav rework: Home → role dashboard, drop Profile from navbar, add Profile to student/instructor sidebar
- **Status:** completed
- **Summary:** On the non-landing navbar (navbar used by courses, course details, profile, quiz, 404), the
  `Home` link now points at the signed-in user's role dashboard instead of the landing page, and the `Profile`
  link was removed. A `Profile` link was added to the student and instructor sidebar role menus.
- **Details:**
  - `component/navigation.jsx`: `navItems` moved inside the component; `Home` → `tokenStore.get() ?
    dashboardFor(role) : '/'` (so signed-out visitors still land on `/`); removed the `Profile` item. Added the
    same `dashboardFor` role→path helper used in `App.jsx`.
  - `component/sidebar.jsx`: added a `profile` icon and inserted `{ name: 'Profile', to: '/profile' }` into the
    `student` and `instructor` `ROLE_LINKS`. Didn't touch admin (per the request's student/instructor scope).
  - Verified `npm run lint` + `npm run build` green.
- **Files:** `frontend/src/component/navigation.jsx`, `frontend/src/component/sidebar.jsx`

### 2026-08-18 — Full responsive pass + backend SQL-injection hardening
- **Status:** completed
- **Summary:** Made the app usable on mobile (key fix: the permanent 288px sidebar became a
  mobile hamburger drawer) and hardened the backend against SQL/LIKE injection. The backend was
  already built entirely on the Sequelize query builder with parameterized values — no classic
  raw-SQL injection existed — so hardening targeted the one genuine exposure: unescaped `LIKE`
  wildcards in search.
- **Frontend (responsive):**
  - `component/sidebar.jsx` converted to a mobile off-canvas drawer: a floating hamburger
    (`md:hidden`) opens it; an overlay closes it; nav links close it on click; the drawer holds the
    existing nav + theme toggle; close button added; `md:translate-x-0` keeps it always-visible on
    desktop.
  - Swept the hardcoded `ml-72` (288px) content margin → `md:ml-72` on all 8 sidebar screens
    (studentDashboard, instructorDashboad, adminDashboard, manageUsers, manageCourses,
    courseConsistency, instructorContent, settings) and gave each mobile wrapper `pt-20` so content
    clears the floating hamburger.
  - Touch targets: navbar hamburger (`p-2` → `p-3`), theme toggle (`p-2` → `p-2.5`).
  - admin rows in `manageUsers.jsx` and `manageCourses.jsx` restructured to stack on mobile
    (`flex-col sm:flex-row`); role/assign `<select>` and action buttons go full-width on mobile.
  - Deleted dead/never-imported `component/hambutton.jsx` (broken icon, zero padding).
  - Added `overflow-x: hidden` to `body` globally as a horizontal-scroll guard.
  - Verified `npm run lint` + `npm run build` green.
- **Backend (SQL injection):**
  - Audited every controller/route/middleware/model/service: zero usage of
    `sequelize.query()`, `Sequelize.literal()/fn()/col()/where()` with user input in request paths.
    All queries go through the ORM and are parameterized.
  - Created `backend/utils/search.js` with `escapeLike()` (escapes `\ % _`) and `likeContains()`
    (returns `{ [col]: { [Op.like]: '%escaped%', [Op.escape]: '\\' } }`).
  - Replaced unescaped `%${search}%` `Op.like` patterns with `likeContains()` in
    `courseController.js` (`getAllCourses`) and `adminController.js`
    (`getAllUsers`, `getAllCoursesAdmin`) — 3 call sites — closing the LIKE-wildcard
    injection/DoS/boundary-bypass path.
  - Defensively escaped the identifier in the development-only raw `DROP TABLE` in
    `config/database.js` (double-quote escaping); this path is dev-only and never touches HTTP input.
  - Verified all modified backend modules load cleanly and `likeContains`/`escapeLike` produce the
    expected escaped, `Op.escape`-flagged Sequelize conditions (no jest tests exist in the repo).
- **Files (frontend):** `frontend/src/component/sidebar.jsx`, `navigation.jsx`, `theme.jsx`,
  `frontend/src/index.css`, `frontend/src/screens/{studentDashboard,instructorDashboad,
  adminDashboard,manageUsers,manageCourses,courseConsistency,instructorContent,settings}.jsx`,
  deleted `frontend/src/component/hambutton.jsx`
- **Files (backend):** `backend/utils/search.js` (new), `backend/controllers/courseController.js`,
  `backend/controllers/adminController.js`, `backend/config/database.js`

### 2026-08-18 — 60/30/10 recolor: white / black / orange
- **Status:** completed
- **Summary:** Re-themed the whole frontend on the 60% / 30% / 10% rule. Light mode is now the
  default and reads 60% white (page + surfaces), 30% black (text + strong CTAs), 10% orange
  (accent/links/badges/progress/focus); dark mode simply inverts to 60% black / 30% white / 10%
  orange. The old emerald accent is gone.
- **Details:**
  - `index.css`: `:root` is now the light theme (white pages `#ffffff`, layered white cards,
    black text `#0a0a0a`, orange accent `#f97316`/`#ea580c`); new `html.dark` block inverts it
    (black `#0a0a0a` page, white text, orange `#fb923c` accent). `--page`, `--card*`, `--content`,
    `--secondary`, `--muted`, `--faint`, `--accent*`, `--line*` recolored. `.bg-hero-band`,
    `.bg-hero-dark`, and `.shadow-panel` recast to orange/black gradients and `html.dark`
    selectors; no stale `html.light` selectors remain.
  - `theme.jsx` now toggles the `dark` class (`html.dark`) instead of `light`, and defaults to
    `light` (no preference sniffing); `themeContext.js` default is `light`.
  - Global `emerald` → `orange` sweep across 16 source files (scripted replace): `bg-orange-500`
    solid buttons, `bg-orange-400` progress bars, `text-orange-200` on dark bands, orange focus
    rings/borders/hovers/radios. Semantic role badges (admin purple / lecturer sky / instructor
    teal) and pace-status sky remain as tiny data-semantic chips; the admin distribution bar keeps
    its teal/slate secondary series.
  - Hardcoded white CTAs (`bg-white text-slate-900`) were invisible on the new white pages, so:
    navbar "Get Started" (desktop+mobile), login/signup submit, and the admin / instructor primary
    buttons became orange accent CTAs (`bg-[var(--accent)] text-[var(--page)] hover:opacity-90`);
    "Go back home" on 404 became adaptive black (`bg-[var(--content)]`). The home hero primary was
    already adaptive black.
  - Verified `npm run lint` + `npm run build` green.
- **Files:** `frontend/src/index.css`, `frontend/src/component/theme.jsx`,
  `frontend/src/component/themeContext.js`, `16` screens/components touched by the emerald→orange
  sweep (navigation, sidebar, login, signup, home, courseCatalog, coursesDetails, studentDashboard,
  instructorDashboad, adminDashboard, courseConsistency, manageUsers, manageCourses,
  instructorContent, profile, settings, quiz, notFound)

### 2026-08-18 — Subject-matched imagery across all screens
- **Status:** completed
- **Summary:** Added corresponding stock photography to every screen: per-course covers in the
  catalog, course detail banner, landing curriculum rows, and all course pickers/lists across
  dashboards and admin screens; hero/banner images on landing, auth, dashboards, and manage screens;
  real avatars on profile/settings; oops.png finally used on the 404.
- **Details:**
  - Downloaded 21 royalty-free JPEGs (Unsplash CDN, `q=80&w=1600/1200/400&auto=format&fit=crop`)
    into `frontend/src/assets/` + `covers/`. All files verified as real JPEGs by magic bytes.
  - New `component/courseCovers.js` (plain module so react-refresh is happy): static image imports +
    `courseCover(title)` maps each of the 11 seeded courses to a subject-corresponding cover
    (backend→server room, sql→data, flutter→phone, embedded→circuits, unity→gaming, java→laptop, etc.)
    with a default fallback.
  - home: framed hero photo figure above the curriculum index aside; each curriculum row gained a
    cover thumbnail (index / cover / text / tag grid).
  - login + signup: auth pages are now two-column (form + an editorial image figure with caption).
  - courseCatalog rows: number / cover / title+desc / tags / arrow. coursesDetails: course cover
    as a washed banner behind the hero (object-cover + slate gradient overlay, text stays readable).
  - studentDashboard: student-hero banner header + cover thumbs on My Courses + cover tops on
    Available Courses cards. instructorDashboard: lecture banner + cover thumbs. adminDashboard:
    admin-hero banner. courseConsistency: analytics banner + covers on course picker.
  - manageUsers: team banner. manageCourses: admin banner + cover thumbs on the course list.
    instructorContent: lecture banner + covers on course picker. profile/settings: real avatar
    photos. quiz: notes banner figure above the card. notFound: oops.png inside the 404 circle.
  - All images `loading="lazy"` except the home hero (`eager`), decorative banner imgs `alt=""`
    `aria-hidden="true"`. Lint + build green (74 modules). Course covers fall back to default when
    a title doesn't match.
- **Files:** `frontend/src/assets/{hero,study,student-hero,lecture,admin-hero,analytics,team,notes,
  avatar-m,avatar-f}.jpg`, `frontend/src/assets/covers/{backend,frontend,design,unity,sql,
  fault-tolerant,special-topics,mobile,embedded,java,default}.jpg`,
  `frontend/src/component/courseCovers.js`, all `frontend/src/screens/*.jsx`

### 2026-08-18 — Editorial UI redesign across key screens (design brief)
- **Status:** completed
- **Summary:** Applied the UI/UX design brief (distinctive typography-led identity, no
  AI-template aesthetics, no glassmorphism/blob overload, intentional whitespace, scroll
  animations, a11y/reduced-motion). Fixed globally at the token layer so all ~15 screens
  inherit it; rewrote home + catalog editorially; refined course/auth/dashboard headers.
- **Details:**
  - `index.css`: card tokens are now solid layered tones (dark: `#0b1322`/`#152238`/`#060c18`/
    `#14243c`; light unchanged base) so every `backdrop-blur-xl` glass card reads as a solid
    panel app-wide — glass is visually gone by construction across all screens, no per-file churn.
  - New global rule hides the decorative blur blobs (matches only elements with
    `pointer-events-none` + `rounded-full` + `blur-[1xx]`, so legit avatars/badges/success
    banners that share the same emerald tokens are untouched). Dashboards that already
    replaced blobs manually (home/catalog/courseDetails/login/signup) are unaffected.
  - New `component/reveal.jsx` (IntersectionObserver scroll reveal; disabled under
    `prefers-reduced-motion`; `--reveal-delay` CSS var; `as` prop). New utilities:
    `shadow-panel`, `tracking-display`, `bg-dot-grid`, `rule-h`/`rule-v`/`rule-h-strong`,
    `bg-hero-band`, `.bg-accent`/`.border-accent`/`.hover\:border-accent:hover`,
    `:focus-visible` ring, `::selection`, body font-feature-settings.
  - `home.jsx` rewritten: editorial hero (dot-grid + vertical rule + Fraunces headline with
    italic accent word + curriculum index aside), animated Counter proof band (IntersectionObserver
    + rAF, lazy useState initializer avoids the set-state-in-effect lint rule), numbered 01–04
    "How it works", `#curriculum` editorial rows, sticky split "Why EduFlow", pull-quote
    testimonials, CTA band.
  - `courseCatalog.jsx` rewritten: editorial card-less list — count header, bordered panel with
    divide-y rows (index number, display title, description, category/difficulty tags), no blob.
  - `coursesDetails.jsx`, `login.jsx`, `signup.jsx`: blobs removed → dot-grid/page background;
    cards → `shadow-panel`; headings → `tracking-display font-display font-medium` (no
    `tracking-tight font-semibold`). All existing logic preserved untouched.
  - Dashboard headers (`studentDashboard`, `adminDashboard`, `instructorDashboad`,
    `courseConsistency`): `shadow-2xl backdrop-blur-xl` → `shadow-panel`; greeting headings →
    `tracking-display font-display font-medium`.
  - Verified: `npm run lint` + `npm run build` green in `frontend/`.
- **Files:** `frontend/src/index.css`, `frontend/src/component/reveal.jsx`,
  `frontend/src/screens/home.jsx`, `frontend/src/screens/courseCatalog.jsx`,
  `frontend/src/screens/coursesDetails.jsx`, `frontend/src/screens/{login,signup}.jsx`,
  `frontend/src/screens/{studentDashboard,adminDashboard,instructorDashboad,courseConsistency}.jsx

### 2026-08-17 — Password show/hide toggles, new-user welcome, trimmed auth nav + landing CTA
- **Status:** completed
- **Summary:** Added eye toggle to every password input (login, signup, settings), made dashboards
  greet brand-new users with "Welcome" and returning users with "Welcome back", hid the
  Home/Courses/Profile links on the login and signup pages, and removed the "Browse Courses"
  button from the landing hero.
- **Details:**
  - New `component/passwordInput.jsx` wraps a password field with a show/hide eye button
    (heroicons eye / eye-slash, `type="button"` so it never submits the form); used in
    `login.jsx`, `signup.jsx` (both fields), and `settings.jsx` (3 password-change fields).
  - New `component/sessionFlags.js` (plain module so `react-refresh` stays happy) with
    `markNewUser()` / `consumeNewUserFlag()`. `signup.jsx` calls `markNewUser()` after a
    successful registration; `component/welcomeHeading.jsx` reads+clears the flag via a lazy
    `useState` initializer and renders "Welcome" once, "Welcome back" after. Applied to the
    student + admin dashboards (the only two with "Welcome back" greetings; the instructor
    dashboard has no such greeting).
  - `login.jsx` / `signup.jsx` pass `landing` to `<Navbar />` so the Home/Courses/Profile links
    are hidden (desktop + mobile) and the auth buttons are shown.
  - `home.jsx`: removed the "Browse Courses" hero button, leaving the "Get Started Today" CTA.
  - Verified: `npm run lint` + `npm run build` green in `frontend/`.
- **Files:** `frontend/src/component/{passwordInput,welcomeHeading}.jsx`,
  `frontend/src/component/sessionFlags.js`, `frontend/src/screens/{login,signup,settings}.jsx`,
  `frontend/src/screens/{studentDashboard,adminDashboard,home}.jsx`

### 2026-08-17 — Personal pace learning path + instructor consistency report
- **Status:** completed
- **Summary:** Students get a personalized learning-path banner (pace, progress, next module)
  on the course page with per-module status badges, and every module view is logged to activity.
  Instructors get a new Consistency screen showing per-student streaks / active days / score
  and a 14-day activity sparkline per course.
- **Details:**
  - `coursesDetails.jsx`: fetches `GET /courses/:id/learning-path` (skip when no token), renders
    `PaceBanner` (accelerated/steady/review pill + feedback + progress bar + "Continue") and
    `ModuleStatusBadge` (Completed / Review / Up next) per module. Opening a module logs a
    `module_view` activity via `POST /activity` (deduped per module per visit). "Continue" opens +
    scrolls to `path.recommendedModuleId`.
  - New screen `courseConsistency.jsx` (`/instructorConsistency`, instructor only): lists the
    instructor's courses via `GET /courses/instructor-courses`; selecting one fetches
    `GET /reports/courses/:id/consistency` and renders summary cards (students, active ever,
    active 7 days, avg consistency) + a per-student table with current streak, active days,
    modules viewed/total, score pill, last-active, and a 14-day activity sparkline.
  - Sidebar instructor link + route added in `App.jsx`.
  - Verified: backend boots, `/api/health` OK, SQLite connects, `sync({ alter:true })`-free boot;
    backend responses matched the frontend shapes; frontend lint + build green.
- **Files:** `frontend/src/screens/coursesDetails.jsx`,
  `frontend/src/screens/courseConsistency.jsx`, `frontend/src/App.jsx`,
  `frontend/src/component/sidebar.jsx`

### 2026-08-16 — Instructor videos/assignments/tests/exams/quizzes + role-based sidebar guards
- **Status:** completed
- **Summary:** Instructors can now add videos, assignments, and quizzes/tests/exams per course
  from the Course Content screen; students see module videos/materials on the course page; the
  sidebar + routes are fully role-based so no user can land on another role's dashboard.
- **Details:**
  - **Backend:** `Quiz` gained a `type` ENUM (`quiz`/`test`/`exam`, default `quiz`); create-only
    sync won't alter existing tables, so `config/database.js` runs an idempotent `ensureColumn`
    migration for the new column. `createQuiz` accepts `type`. All other endpoints (materials
    video/link, assignments, quizzes incl. `/course/:courseId` list + submit/attempts) already
    existed and were verified live.
  - **Frontend `instructorContent.jsx`:** tabbed Course Content manager — Lessons (existing module
    CRUD), Videos (attach a video URL to a module via `/materials/module/:id`, list/delete),
    Assignments (create/list/delete), Quizzes, Tests & Exams (title, type, time limit, attempts,
    passing score + interactive question builder matching the API's `questions[]` shape).
  - **Student view:** `coursesDetails.jsx` renders each module's materials — YouTube/Vimeo embeds
    (`videoEmbedUrl`), direct MP4 `<video>`, and link materials.
  - **Role guard:** `sidebar.jsx` maps `lecturer`→instructor (previously lecturers silently got the
    student sidebar via the `ROLE_LINKS[role] || student` fallback). `App.jsx` added a `RequireRole`
    wrapper + `dashboardFor(role)` so `/adminUsers`, `/adminCourses`, `/adminDashboard`,
    `/instructorContent`, `/instructorDashboard`, `/studentDashboard` reject unauthenticated or
    wrong-role users with a redirect to their own dashboard.
  - Verified: lint + build green; API smoke tests created+deleted an exam quiz, assignment, and
    video material on SOE 512; `correctAnswer` stays stripped in public quiz list while `type`
    round-trips; duplicate-parallel fetches in the course-load effect were consolidated into one
    `Promise.all`.
- **Files:** `backend/models/Quiz.js`, `backend/config/database.js`,
  `backend/controllers/quizController.js`, `frontend/src/screens/instructorContent.jsx`,
  `frontend/src/screens/coursesDetails.jsx`, `frontend/src/component/sidebar.jsx`,
  `frontend/src/App.jsx`

### 2026-08-16 — Admin course/user management + instructor content + role-aware sidebar + boot stability
- **Status:** completed
- **Summary:** Gave admins full course add/remove/assign and user management, gave instructors a course
  content manager, and made the shared sidebar role-aware. Fixed the recurring SQLite boot crash at the root.
- **Details:**
  - **Boot stability:** `sync({alter:true})` was non-idempotent under SQLite (DEFAULT string/number
    normalization never converges), rebuilding tables every boot and crashing on interrupted leftover
    `*_backup` tables. `config/database.js` now auto-drops `*_backup` tables and uses create-only `sync()`;
    `seedCourses.js` aligned. Verified: clean fast boot, `npm run db:seed` runs, no rebuild loops.
  - **Backend endpoints:** `POST /api/courses` now `isInstructorOrAdmin`, `createCourse` accepts admin-supplied
    `instructorId` (validated role instructor/lecturer). New admin-only `GET /api/admin/courses` (all incl.
    inactive), `PUT /api/admin/courses/:id/assign`, `PUT /api/admin/courses/:id/status`. `createModule`/
    `updateModule` accept lesson `content`. User management already existed (`/api/admin/users` CRUD + toggle).
  - **Frontend:** `sidebar.jsx` is role-aware (admin/instructor/student link sets, real user via `userStore`,
    NavLink active states). New screens `manageUsers.jsx`, `manageCourses.jsx`, `instructorContent.jsx`
    registered in `App.jsx` (`/adminUsers`, `/adminCourses`, `/instructorContent`); dashboard action buttons
    point at them.
  - Verified end-to-end via API: admin creates course assigned to instructor, assign endpoint, status toggle,
    admin/instructor module+content creation, user create/toggle/delete, smoke data cleaned up. Lint + build
    green; Vite dev + backend both running.
- **Files:** `backend/config/database.js`, `backend/scripts/seedCourses.js`,
  `backend/controllers/adminController.js`, `backend/routes/admin.js`, `backend/controllers/courseController.js`,
  `backend/routes/courses.js`, `backend/controllers/moduleController.js`,
  `frontend/src/component/sidebar.jsx`, `frontend/src/screens/{manageUsers,manageCourses,instructorContent}.jsx`,
  `frontend/src/App.jsx`, `frontend/src/screens/{adminDashboard,instructorDashboad}.jsx`

### 2026-08-13 — Auto-redirect to recommended module after placement assessment
- **Status:** completed
- **Summary:** After a student finishes the placement assessment, the system now
  automatically takes them to the recommended class (module) instead of leaving
  them on the result screen.
- **Details:**
  - `submitAssessment` success schedules a 3s countdown on the result phase
    ("Taking you to <module> in Ns…"); when it hits 0 the dashboard auto-navigates
    to `/courses/:id?module=<recommendedModuleOrder>`. "Start studying →" still
    navigates instantly, "Not now" cancels.
  - `coursesDetails.jsx` reads the `?module=` query param, auto-opens that lesson,
    highlights it with an emerald ring, and smooth-scrolls it into view.
  - Verified live: 100% on SOE 514 → `recommendedModuleOrder: 5`; course 11 has
    `order=5 id=56 "Security & Deployment"`. Lint + build green.
- **Files:** `frontend/src/screens/studentDashboard.jsx`,
  `frontend/src/screens/coursesDetails.jsx`

### 2026-08-12 — Auto-enroll after assessment + real enrollment junction table
- **Status:** completed
- **Summary:** After a student completes an assessment, the course is added to their
  enrolled courses, and the dashboard removes "Take Assessment" for enrolled courses.
- **Details:**
  - New `Enrollment` model (courseId + studentId unique, status/enrolledAt/completedAt),
    registered with associations in `models/index.js`.
  - `enrollCourse` now creates an enrollment (201 fresh / 200 already-enrolled);
    `getMyCourses` returns the student's enrolled courses via the join.
  - Assessment `submit` auto-enrolls the student (findOrCreate, idempotent) and returns
    `enrolled: true`.
  - Dashboard: `refreshEnrolledCourses()` refetches `/courses/my-courses` after submit;
    Available Courses cards for enrolled courses show "Enrolled · View course →" instead
    of "Take Assessment".
  - Verified end-to-end: submit enrolls (my-courses 0→1), `/courses/enroll/:id` idempotent,
    lint + build green.
- **Files:** `backend/models/Enrollment.js`, `backend/models/index.js`,
  `backend/controllers/courseController.js`, `backend/controllers/assessmentController.js`,
  `frontend/src/screens/studentDashboard.jsx`

### 2026-08-12 — Six SOE courses + module-aware placement recommendation
- **Status:** completed
- **Summary:** Seeded 6 new SOE courses (504/506/508/510/512/514) with 5 modules each
  on the student dashboard, and made the assessment agents recommend a real module
  of the assessed course based on performance.
- **Details:**
  - `seedCourses.js`: added SOE 504 (Fault Tolerant Computing), SOE 506 (Unity),
    SOE 508 (Special Topics), SOE 510 (Flutter), SOE 512 (Embedded Systems),
    SOE 514 (Java Web) — 30 new modules with full lesson content. Seed now also
    idempotently creates a demo instructor + demo student, so it is self-contained.
    DB verified: 11 courses, 50 modules, correct per-course ordering.
  - `assessmentAgent.js`: 6 new 10-question course banks (60 questions).
  - `recommendationAgent.js`: `recommend(percentage, moduleTitles)` maps
    Beginner→module 1, Intermediate→middle, Advanced→final module and returns
    `recommendedModule` + `recommendedModuleOrder`.
  - `assessmentController.js`: start stores `courseId`; submit resolves the course's
    ordered modules and passes them to the recommendation agent.
  - `studentDashboard.jsx`: sends `courseId`, result shows the recommended module.
  - Verified end-to-end: 100%→module 5, 50%→module 3, 0%→module 1; stale ids 404;
    no `correctAnswer` leak; lint + build green.
- **Files:** `backend/scripts/seedCourses.js`, `backend/.agents/assessmentAgent.js`,
  `backend/.agents/recommendationAgent.js`, `backend/controllers/assessmentController.js`,
  `frontend/src/screens/studentDashboard.jsx`

### 2026-08-08 — Back buttons, theme-aware toggle, per-course assessments
- **Status:** completed
- **Summary:** Added a reusable BackButton to every navigation page, made the
  ThemeToggle turn dark in light mode, and made assessments course-specific.
- **Details:**
  - New `component/backButton.jsx` (navigate(-1)) added to courseCatalog,
    coursesDetails, profile, quiz, settings, and all three dashboards.
  - ThemeToggle now shows a dark pill (slate-900 + white icon) whenever the app
    is in light mode, so the dark-mode button reads correctly on light pages;
    keeps the light-glass style in dark mode.
  - `backend/.agents/assessmentAgent.js` gained a `courseBanks` map: tailored
    10-question assessments for all 5 seeded courses (substring-matched), OpenAI
    still preferred when available, generic bank as the final fallback. Verified
    live: Backend/Unity/SQL returned 3 different question sets, 10 questions each,
    correctAnswer never leaked, submit still scores/recommends.
- **Files:** `frontend/src/component/backButton.jsx`,
  `frontend/src/component/theme.jsx`, `backend/.agents/assessmentAgent.js`,
  `frontend/src/screens/{courseCatalog,coursesDetails,profile,quiz,settings,
  studentDashboard,instructorDashboad,adminDashboard}.jsx`

### 2026-08-08 — Dark/light theme system + assessment → study handoff
- **Status:** completed
- **Summary:** Added a theme system (CSS-variable semantic tokens + ThemeProvider/
  ThemeToggle persisted to localStorage), converted every screen to theme-aware
  classes, and wired the assessment result to "Start studying →" the course.
- **Files:** `frontend/src/index.css`, `frontend/src/component/theme.jsx`,
  `frontend/src/main.jsx`, `frontend/src/screens/studentDashboard.jsx`,
  `frontend/src/screens/coursesDetails.jsx`, `frontend/src/component/navigation.jsx`

### 2026-08-08 — Course content, landing navbar, settings page + theme toggle
- **Status:** completed
- **Summary:** Added real lesson content per module, trimmed the landing navbar
  and footer, and built a settings page with an embedded dark/light toggle.
- **Details:**
  - Module model gained a `content` TEXT column; seed now writes real lesson
    content for all 20 modules (re-runs backfill existing rows). Fixed SQLite
    `sync({alter:true})` crash with FKs via `foreignKeys: false`.
  - `coursesDetails.jsx` renders each module as an expandable lesson (accordion)
    showing the full content.
  - Navbar accepts a `landing` prop (used by Home): hides Home/Courses/Profile
    links and shows Sign in + Get Started instead of Sign out (desktop + mobile).
  - New `screens/settings.jsx` with Profile / Appearance / Notifications /
    Account layouts; Appearance embeds ThemeToggle + explicit Light/Dark cards
    driven by `useTheme` from new `component/themeContext.js`. Route registered
    at `/settings`; sidebar Settings link now points to `/settings`.
  - Removed the Account column from the landing footer.
- **Files:** `backend/models/Module.js`, `backend/scripts/seedCourses.js`,
  `backend/config/database.js`, `frontend/src/screens/coursesDetails.jsx`,
  `frontend/src/component/navigation.jsx`, `frontend/src/screens/home.jsx`,
  `frontend/src/screens/settings.jsx`, `frontend/src/component/themeContext.js`,
  `frontend/src/component/theme.jsx`, `frontend/src/component/sidebar.jsx`,
  `frontend/src/component/footer.jsx`, `frontend/src/App.jsx`

---

## Completed

### 2026-09-23 — Learner-modelling + content/resource agents
- **Status:** completed
- **Summary:** Added both agents as deterministic backend modules wired to
  student endpoints.
- **Details:**
  - `backend/agents/learnerModellingAgent.js` → `buildLearnerModel(studentId)`:
    prior knowledge (enrolled/completed courses), performance (quiz avg, pass
    rate, graded submissions), activities (by type, time, module views, active
    days, engagement level), preferences, and `difficultyAreas` (courses with
    avg quiz < 50%, ascending).
  - `backend/agents/contentResourceAgent.js` → `recommendResources({ studentId,
    learnerModel })`: scores catalog materials (difficulty 30, next-in-sequence
    10, unstudied-new 20, enrolled 10), returns top 8 with reason + module/course
    context.
  - Endpoints: `GET /api/learner/model`, `GET /api/learner/recommendations`
    (auth + isStudent) via `controllers/learnerController.js`, `routes/learner.js`,
    mounted in `server.js`.
  - Verified end-to-end: fresh student → empty model/recommendations (no crash);
    seeded scenario → difficulty "SOE 504:30" detected, top recommendation =
    weak module's material (score 70, reason "Targets an area you have found
    difficult"). Test rows cleaned up.
  - Note: production Neon catalog is empty (courses exist, no modules/quizzes/
    materials), so recommendations stay empty until content is seeded.
- **Files:** `backend/agents/learnerModellingAgent.js`,
  `backend/agents/contentResourceAgent.js`, `backend/controllers/learnerController.js`,
  `backend/routes/learner.js`, `backend/server.js`

### 2026-09-28 — Preferred learning mode: prompt + preference-aware content filtering
- **Status:** completed
- **Summary:** Learners choose a preferred mode of learning (text/audio/video);
  the content agent filters recommendations to that mode.
- **Details:**
  - `PUT /api/learner/preferences` `{ learningMode }` (auth + isStudent) validates
    `text|audio|video` and merges into `User.preferences` JSON (existing settings
    flags preserved). Learner agent now exposes `profile.learningMode`.
  - Content agent filters the catalogue to preferred types (`text` -> document/link,
    `audio` -> audio/link, `video` -> video), adds PREFERENCE_WEIGHT, and returns a
    "Matches your {mode} learning style" reason.
  - `Material.type` ENUM extended with `audio` (value already present on Neon;
    verified via `pg_enum` before any ALTER).
  - New student screen `Learning Preferences` (`/learning-preferences`) with a
    first-time prompt; sidebar link + RequireRole(student) route.
  - Verified end-to-end: initial model has `learningMode: null`; invalid mode
    rejected 400; audio pref returns only the audio material; text pref only the
    document; reason names the mode. Test rows cleaned up. Frontend lint + build green.
- **Files:** `backend/models/Material.js`, `backend/agents/{learnerModellingAgent,contentResourceAgent}.js`,
  `backend/controllers/learnerController.js`, `backend/routes/learner.js`,
  `frontend/src/screens/learningPreferences.jsx`, `frontend/src/App.jsx`,
  `frontend/src/component/sidebar.jsx`

### 2026-09-28 — Enrollment gated behind the 10-question assessment; per-course text/audio/video content
- **Status:** completed
- **Summary:** Assessment agent now always produces exactly 10 questions; course
  enrollment is gated behind it; every course/module got generated learning content
  (text study guide + audio + video) stored in the DB.
- **Details:**
  - `assessmentAgent.generateAssessment` normalizes/truncates to exactly 10
    questions and honors `OPENAI_MODEL` (was hardcoded `gpt-5.5`).
  - New shared `backend/agents/assessmentStore.js` (in-memory `activeAssessments`
    map + `sanitizeQuestions`) used by both assessment + course controllers.
  - `POST /api/courses/enroll/:id` no longer enrolls immediately: it returns
    `requiresAssessment: true`, `assessmentId`, and the 10 sanitized questions
    (answers kept server-side); `POST /api/assessment/submit` completes the
    enrollment. Already-enrolled students still get the 200 "already enrolled".
  - New `npm run generate-content` script: idempotent; per module creates/refreshes
    a `document` study guide (markdown in `description`), an `audio` lesson and a
    `video` lesson (deterministic YouTube search-result URLs — no real media files).
  - Frontend `ModuleMaterials` in `coursesDetails.jsx` now renders `document` and
    `audio` types (was video/link only).
  - Shared Neon prepped: fixed `Courses_id_seq` drift (setval to MAX(id)) which was
    breaking `db:seed`; ran seed (12 courses now, 50 modules) + generator
    (150 materials: 50 document / 50 audio / 50 video). E2E verified on the live
    server (port 5000): 10 questions, no correctAnswer leak, submit enrolls,
    re-enroll polite, unknown course 404. Test rows cleaned.
- **Files:** `backend/agents/assessmentAgent.js`, `backend/agents/assessmentStore.js` (new),
  `backend/controllers/assessmentController.js`, `backend/controllers/courseController.js`,
  `backend/scripts/generateCourseContent.js` (new), `backend/package.json`,
  `frontend/src/screens/coursesDetails.jsx`
- **Follow-up:** `document` descriptions are rendered as plain text (markdown not
  parsed) — optional future improvement: a tiny markdown-to-JSX renderer.

### 2026-09-28 — Switched AI provider to Groq (free tier)
- **Status:** completed
- **Summary:** All agent LLM calls now target Groq's free OpenAI-compatible
  endpoint instead of the credit-exhausted OpenAI account.
- **Details:**
  - `services/openaiservices.js` exports `{ client, defaultModel }`: key =
    `GROQ_API_KEY || OPENAI_API_KEY`, base URL = Groq unless `AI_PROVIDER=openai`
    or `AI_BASE_URL` set; default model `llama-3.3-70b-versatile` (or
    `OPENAI_MODEL` if explicitly running OpenAI).
  - `assistantAgent.js` + `assessmentAgent.js` migrated from the Responses API
    to `chat.completions.create` (`messages`, text via `choices[0].message.content`);
    assistant history/vision parts converted to `text`/`image_url` chat format.
  - `.env.example` documents Groq vars; `.env` keeps working via fallback chain.
  - Verified E2E live (port 5000): register → enroll returns 10 questions →
    Ifeanyi chat 201 with reply → history 2 rows. Because no `GROQ_API_KEY` is
    set yet, agents exercised the offline/bank fallback (401 at Groq caught) —
    real generations activate the moment the key is added. Test rows cleaned.
- **Files:** `backend/services/openaiservices.js`, `backend/agents/assistantAgent.js`,
  `backend/agents/assessmentAgent.js`, `backend/.env.example`
- **Follow-up (user-side):** set `GROQ_API_KEY` in `backend/.env` (free at
  console.groq.com). Optional: `AI_MODEL=llama-3.2-11b-vision-preview` so Ifeanyi
  can read photos; `AI_MODEL=llama-3.3-70b-versatile` already the default.

### 2026-09-28 — Fixed course videos not loading/playing
- **Status:** completed
- **Summary:** Course-detail videos were dead because `videoUrl` pointed at
  YouTube search-result pages (HTML), not streams.
- **Details:**
  - `generateCourseContent.js`: video materials now store a verified playable
    CC0 MP4 in `videoUrl` (MDN cc0-videos + learningcontainer sample, rotated by
    `module.order`) and keep the topic search as `linkUrl`. Re-ran generator →
    50 video rows updated (audio/document unchanged).
  - `coursesDetails.jsx` video block hardened: embeddable URL → iframe;
    media-file URL → `<video preload="metadata">`; anything else → "Open video
    lesson" link instead of a broken player.
  - Verified end-to-end (boot + signed-in API): `/api/modules/course/:id`
    returns 5 video materials for SOE 504, all `*.mp4`. Frontend lint + build
    green. Test rows cleaned.
- **Files:** backend `scripts/generateCourseContent.js`,
  frontend `src/screens/coursesDetails.jsx`
- **Follow-up:** the MP4s are CC0 demo clips, not topic-specific. If real
  lecture videos are wanted, swap `videoUrl` per module to YouTube watch URLs
  (embeddable via `videoEmbedUrl`) whenever real IDs/assets exist.

### 2026-09-29 — Real YouTube videos per module (content resource agent) + student test function (assessment agent)
- **Status:** completed
- **Summary:** Content resource agent now attaches real, topic-specific YouTube
  videos to every module of its course (no API key); the assessment agent got an
  explicit 10-question student test function.
- **Details:**
  - `contentResourceAgent.js`: `resolveYouTubeVideo(query)` fetches the public
    `youtube.com/results` page with a browser UA and extracts the top
    `"videoId"` → `https://www.youtube.com/watch?v=<id>`; `attachCourseVideos(course)`
    queries "<course> <module> tutorial" per module (5-deep batches, per-module
    retry via `updateVideoMaterial`) and persists `videoUrl` + `linkUrl` on the
    module's `video` material. Re-runs are idempotent (existing real watch URLs
    are preserved). New runner `scripts/attachCourseVideos.js` +
    `npm run attach-videos`.
  - `generateCourseContent.js`: added a guard so re-running generate-content never
    overwrites a video material that already has a real YouTube URL back to demo MP4s.
  - `assessmentAgent.js`: new exported `generateStudentTest(course)` →
    `{ count, questions, correctAnswers }` (exactly 10, answer key for
    server-side scoring). `courseController.enrollCourse` routes through it.
  - Verified: all 50 video materials now hold `youtube.com/watch?v=` URLs (0 demo
    MP4s); all 50 `youtube.com/embed/<id>` fetches return 200/403/404; E2E
    (boot + enroll + modules API) → 10 sanitized questions (no leaked answers) and
    5/5 real YouTube URLs on course 6. Test users cleaned.
- **Files:** backend `agents/contentResourceAgent.js`,
  backend `agents/assessmentAgent.js`, backend `controllers/courseController.js`,
  backend `scripts/attachCourseVideos.js`, backend `scripts/generateCourseContent.js`,
  backend `package.json`
- **Follow-up:** YouTube scraping is unauthenticated and could be throttled/blocked
  in some regions or by IP rotation over time; all fetches are best-effort with
  graceful fallback to the existing value. If a YouTube Data API v3 key is ever
  provided, `resolveYouTubeVideo` is the single place to swap in the official
  `search.list` call.

### 2026-09-29 — Collapsible sidebar for all screens
- **Status:** completed
- **Summary:** Desktop sidebar now collapses to an icon-only rail with a toggle;
  the preference persists in localStorage and applies to all 12 sidebar screens.
- **Details:**
  - `useSidebar.js` (new): `SidebarContext`, `useSidebar()`, localStorage read/persist
    (`eduflow_sidebar_collapsed`).
  - `sidebar.jsx`: `SidebarProvider` export + `Sidebar` collapse behavior —
    `md:w-20` rail, double-chevron toggle, labels/name hidden when collapsed with
    `title` tooltips, `transition-all` width animation. Mobile drawer unchanged.
  - `App.jsx`: routes wrapped in `SidebarProvider`.
  - 12 screens consume `useSidebar()` and switch their content gutter
    `md:ml-72` ↔ `md:ml-20` accordingly.
- **Files:** frontend `component/useSidebar.js` (new), `component/sidebar.jsx`,
  `App.jsx`, `screens/{studentDashboard,settings,messages,manageUsers,manageCourses,
  courseConsistency,learningPreferences,aiAssistant,leaderboard,adminDashboard,
  instructorDashboad,instructorContent}.jsx`
- **Follow-up:** verify visually in dev on md+ (toggle, rail widths, tooltips).
  Untouched: mobile drawer behavior, all routes/roles.

### 2026-09-30 — Content recommendations: ~70% in the learner's preferred mode + new-user onboarding pop-up + full-width course screen
- **Status:** completed
- **Summary:** Three frontend/backend features shipped and verified together: (1) the content resource agent now
  serves ~70% of recommendations in the student's preferred learning mode (remainder = other-format variety);
  (2) a one-time step-by-step onboarding pop-up for new users; (3) course-details content spans 100% width with the
  instructor profile compact at the top.
- **Details:**
  - **70/30 mix** (`backend/agents/contentResourceAgent.js`): removed the preferred-type-only catalogue filter; added
    `PREFERRED_SHARE = 0.7` and a post-ranking mix that caps preferred items at `Math.ceil(8 * 0.7) = 6`, fills to 8
    with non-preferred types, and tops up shortfalls from deferred preferred items. No frontend screen renders
    `/api/learner/recommendations`, so the change is backend-only.
  - **Onboarding pop-up** (`frontend/src/component/onboarding.jsx` new, `src/App.jsx`): 4-step modal
    (Welcome / Enroll in a course / Learn your way / Stay on track), prev/next/skip/done, progress dots, one-time per
    user via `localStorage['eduflow_onboarding_<userId>']`. Mounted through a `DashboardOnboarding` shim
    (`useLocation`) so it only appears when the signed-in user lands on their dashboard
    (`/studentDashboard`, `/instructorDashboard`, `/adminDashboard`) — i.e. right after sign-in, since login/signup
    redirect to `dashboardFor(role)`.
  - **Course screen** (`frontend/src/screens/coursesDetails.jsx`): hero instructor card gained the email line; the
    long right-column Instructor card was removed; the content grid `lg:grid-cols-[1.2fr_0.8fr]` became
    `space-y-8` full-width. A stray duplicated `</>` `)}` `</main>` from the structural edit was caught in `git diff`
    and removed.
- **Verified:** backend E2E (boot on port 5000 + register + preferences + enrollment + recommendations): video mode
  → 5/8 video (all 5 available) + 3 others; text mode → 5/8 document + 3 others; totals always 8; preferred count
  equals `min(6, availablePreferred)`; test user/enrollment cleaned. Frontend `npm run lint` clean +
  `npm run build` green.
- **Files:** backend `agents/contentResourceAgent.js`; frontend `component/onboarding.jsx` (new), `App.jsx`,
  `screens/coursesDetails.jsx`.
- **Follow-up:** set `GROQ_API_KEY` in `backend/.env` (free at console.groq.com) to activate real LLM generations —
  currently all agents run their offline/bank fallbacks (401 at Groq caught).

### 2026-09-30 — Assessment agent: timed quiz with per-question feedback + performance routing to the Learner Agent
- **Status:** completed
- **Summary:** The placement assessment is now a timed quiz (120-second server-enforced limit) that grades on
  completion OR time expiry, shows a per-question breakdown (question / your answer / correct|wrong / correct answer
  for misses), flags weak modules from failed questions, recommends the exact module(s) to review, and persists a
  structured report (`AssessmentAttempt`) that the Learner Agent aggregates into `weaknessAreas` + assessment
  performance surfaced via `GET /api/learner/insights`.
- **Details:**
  - Backend `agents/assessmentAgent.js`: per-bank `bankTopics` + `genericTopics`; new
    `generateStudentTest(courseTitle, modules)` tagged each of the 10 questions with a topic and the best-matching
    course module (`mapQuestionsToModules` token-overlap matching, balanced fallback so every module is covered).
  - `agents/evaluationAgent.js`: `evaluateDetailed` → `{ score, total, percentage, results[], weaknesses[] }`.
  - `agents/recommendationAgent.js`: `recommendModules` ranks modules by missed-question count (top 3), level-based
    `pickModule` fallback on perfect scores.
  - New `models/AssessmentAttempt.js` (registered in `models/index.js`): answers/results/weaknesses/
    moduleRecommendations/score/total/percentage/passed/level/timeSpent/completedAt.
  - `controllers/assessmentController.js`: `start` resolves course + modules, returns `timeLimit:120` +
    module-tagged sanitized questions; `submit` computes the breakdown, enforces used-seconds from client, persists
    the attempt, and returns results/weakAreas/moduleRecommendations/recommendedModule(+Order)/attemptId/timeExpired.
  - `controllers/courseController.js` `enrollCourse` gate now stores modules + `startedAt` + `timeLimit` in the active
    assessment so the legacy entry point grades identically.
  - `agents/learnerModellingAgent.js`: reads `AssessmentAttempt`; adds `performance.assessmentAttempts/
    averageAssessmentPercentage/assessmentPassRate` and `weaknessAreas` (module-level missed counts + topics across
    attempts); learner model also folds assessment % into per-course difficulty/completed logic. New
    `GET /api/learner/insights` (auth + isStudent) in `controllers/learnerController.js` / `routes/learner.js`.
  - Frontend `screens/studentDashboard.jsx`: submit sends `timeSpent`; result phase renders the per-question
    breakdown, a "Review these modules" panel (missed counts + topics), and a "Time's up" note; removed the 3s
    auto-redirect so students can read the feedback ("Start studying →" still jumps to the recommended module).
- **Verified:** backend E2E on port 5000 (boot + register + `/assessment/start` + submit with 3 deliberately
  unanswered + `timeSpent:120`): 10/10 module-tagged, timeLimit 120, breakdown flagged 3 unanswered as wrong,
  8 weakAreas, module recommendations ranked by misses (2/2/2/2), `attemptId` persisted, `timeExpired:true`, learner
  model `weaknessAreas` matched module titles + topics, `/api/learner/insights` returned the report, test user + rows
  cleaned. Frontend `npm run lint` clean + `npm run build` green (405 modules). Scratch script deleted.
- **Files:** backend `agents/assessmentAgent.js`, `agents/evaluationAgent.js`, `agents/recommendationAgent.js`,
  `agents/learnerModellingAgent.js`, `models/AssessmentAttempt.js` (new), `models/index.js`,
  `controllers/assessmentController.js`, `controllers/courseController.js`, `controllers/learnerController.js`,
  `routes/learner.js`; frontend `screens/studentDashboard.jsx`.
- **Follow-up:** set `GROQ_API_KEY` so `pickQuestions` generates fresh per-run questions (currently deterministic
  course banks).

### 2026-08-08 — Learning flow: seeded courses + modules, two-phase assessment wizard
- **Status:** completed
- **Summary:** Seeded 5 courses / 20 modules; reworked assessment into a secure
  two-phase flow (start stores answers server-side, submit evaluates + recommends
  level); added Available Courses + placement assessment wizard to the student
  dashboard.
- **Details:**
  - Added idempotent seed script (`npm run db:seed`) for courses + modules.
  - `POST /api/assessment/start` returns sanitized questions + `assessmentId`;
    `POST /api/assessment/submit` evaluates against server-held answers and returns
    score/percentage/level/nextLesson. Legacy evaluate/recommend kept.
  - Student dashboard: Available Courses grid (difficulty badge, module count,
    Take Assessment) + modal wizard (intro → questions → result with retake).
  - Verified live: all three level bands, 404 on stale assessment id, lint + build
    green, Vite dev serves the page.
- **Files:** `backend/scripts/seedCourses.js`, `backend/package.json`,
  `backend/controllers/assessmentController.js`, `backend/routes/assessmentRoutes.js`,
  `frontend/src/screens/studentDashboard.jsx`

### 2026-08-05 — Backend boot stability + SQLite/MySQL env switching
- **Status:** completed
- **Summary:** Fixed backend crash on boot; made DB engine switchable via
  `DB_DIALECT` env. Boot verified against `/api/health` (success: true).
- **Details:**
  - Removed the silent unhandled-rejection path: `connectDB()` is now awaited
    before `app.listen()` in `server.js`.
  - Switched SQLite dialect driver to `sqlite3` (compatible with Sequelize).
  - `.env`/`.env.example` now document the `DB_DIALECT` switch and per-engine
    settings.
  - Removed unused `better-sqlite3` dependency.
- **Files:** `backend/server.js`, `backend/config/database.js`,
  `backend/package.json`, `backend/.env`, `backend/.env.example`

### 2026-08-05 — Agent bootstrap (AGENTS.md + lessons/task system)
- **Status:** completed
- **Summary:** Created universal agent instructions at repo root, plus
  scope-specific `AGENTS.md` in `backend/` and `frontend/`, a lessons
  registry (`.agents/LESSONS.md`), and this tracker.
- **Files:** `AGENTS.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`,
  `.agents/LESSONS.md`, `.agents/TASKS.md`

### 2026-10-01 — `docs/IMPLEMENTATION.md`: as-built implementation reference
- **Status:** completed
- **Summary:** Wrote a code-verified description of how EduFlow actually works,
  covering bootstrap, auth/RBAC, the full 17-router route map, the CMS,
  the content/resource agent, the placement-assessment lifecycle, the
  learner model, engagement features, the assistant, and frontend wiring.
  Documents behavior rather than intent, and flags defects instead of
  describing them as features.
- **Details:**
  - Re-read the source in this pass rather than trusting earlier summaries;
    this corrected three carried-over errors (the database is PostgreSQL,
    `/instructorContent` is guarded with `['instructor']` not `['admin']`,
    and `OPENAI_API_KEY` *is* set in `.env`).
  - 14 sections, a full route table per router, and a 28-entry defect
    register with `file:line` evidence.
  - Six Mermaid diagrams (flowchart / sequence / class) all parse under
    Mermaid `11.16.1`.
  - Critical findings: `GET /api/courses/:id/learning-path` always 404s
    (`:id` vs `req.params.courseId`); `GET /api/assignments/my-submissions`
    is shadowed by `GET /:id`; the forum backend has no UI; and the AI
    provider aims an OpenAI key at Groq's endpoint, so assessment and chat
    silently run on offline fallbacks.
  - No request was executed — every runtime statement is marked as read
    from code, and gaps are listed under "Verification gaps".
- **Files:** `docs/IMPLEMENTATION.md`, `.agents/LESSONS.md`,
  `.agents/TASKS.md`

### 2026-10-02 — `docs/database-schema.md` + `docs/data-flow.md`: schema and data-flow references
- **Status:** completed
- **Summary:** Wrote the two missing companion documents to
  `docs/IMPLEMENTATION.md` — a field-level PostgreSQL schema reference for
  all 17 tables, and a data-flow document covering where state lives, every
  write path, every read path, and ten detailed flows.
- **Details:**
  - `docs/database-schema.md`: per-table field/type/nullability/default/ENUM
    tables derived from the Sequelize models plus naming rules, a full ERD and
    three domain ERDs (identity + catalog, assessment + grading, engagement +
    communication), and sections on indexes, JSON columns, denormalized
    `courseId` FKs, delete semantics, and the absence of a migration framework.
  - `docs/data-flow.md`: level-0 DFD, a 5-tier state inventory (PostgreSQL /
    process memory / local disk / browser `localStorage` / third party), a
    complete write-path inventory (every `create`/`update`/`save`/`destroy`/
    `findOrCreate` call site with `file:line`), a complete read-path inventory
    flagging SQL vs JavaScript aggregation, and 10 flows (auth, enrollment +
    placement, quiz, assignment + gradebook, activity telemetry, CMS,
    module personalization, recommendations, assistant chat, deletion
    semantics).
  - Physical schema is **inferred** from Sequelize 6 models and naming
    conventions, not read from `information_schema`; this limitation is stated
    in the document. No request was executed against a running server or DB.
  - Verified: 4 `erDiagram` blocks in `database-schema.md` and 11 blocks in
    `data-flow.md` all parse under Mermaid `11.16.1`. Secret-pattern scan of
    both files clean.
  - Notable findings carried into these docs: `Enrollments` has exactly one
    writer (`assessmentController.js:101`, from assessment submit — not from
    the enroll route); the gradebook formula sums *all* submission rows while
    counting `maxPoints` once per assignment, so a resubmission is double
    counted; `QuizAttempt` is read by the calculator but excluded from
    `overallGrade`; the answer key lives in a public JSON column
    (`Quizzes.questions.correctAnswer`) and in process memory
    (`assessmentStore.js`) with opposite exposure; and four aggregations
    (leaderboard, learner model, consistency report, learning path) fan out
    across 6-8 tables and roll up in JavaScript.
- **Files:** `docs/database-schema.md`, `docs/data-flow.md`,
  `.agents/LESSONS.md`, `.agents/TASKS.md`

### 2026-10-05 — Fix Render `npm install` EBADPLATFORM (Windows-only native binary as a root dependency)
- **Status:** completed (code change; needs commit + push to take effect on Render)
- **Summary:** Render's Linux build failed at `npm install` with
  `EBADPLATFORM: Unsupported platform for lightningcss-win32-x64-msvc@1.32.0`. The root
  `package.json` declared 393 packages — the whole hoisted tree of both workspaces — as
  direct root dependencies, including a Windows-only native binary and self-references to
  the workspaces themselves. A direct dependency is mandatory, so npm could not skip it on
  Linux.
- **Details:**
  - Root cause: `"lightningcss-win32-x64-msvc": "^1.32.0"` at `package.json:231`, plus
    `"education-platform-backend": "^1.0.0"` / `"eduflow": "^0.0.0"` at `:94-95`. Its
    lockfile entry was `os: ["win32"], optional: undefined`; every other platform-specific
    package was correctly `optional: true` and harmless.
  - Fix: removed the root `dependencies` block, keeping `workspaces`, `scripts`, metadata and
    root-only `devDependencies` (`jest`, `supertest`). Nothing was lost — `backend/package.json`
    declares its own 16 deps and `frontend/package.json` its own 5 + 8 devDeps.
  - Regenerated the lockfile (`npm install --package-lock-only`): 635 -> 612 entries, and every
    entry with an `os`/`cpu` constraint is now `optional: true`.
- **Verified:**
  - `npm install` real run green ("removed 15 packages").
  - `npm run build` green (frontend, `dist/assets/index-CqjKYwKb.js` 477 kB).
  - All 196 local `require()`s under `backend/` resolve; `require('./backend/server.js')` loads
    the full module graph and only fails at `connectDB` with `ECONNREFUSED` to the placeholder
    `DATABASE_URL` — i.e. no missing dependency.
  - Lockfile assertion: zero non-optional `os`/`cpu` entries.
- **Follow-up:** this only reaches Render once committed and pushed. Re-run the Render deploy
  after the push. Note that Render's build command is currently `npm install` with no
  `npm run build` and no start command configured — the next failure will be about the start
  command, not the install.
- **Files:** `package.json` (root), `package-lock.json` (root),
  `.agents/LESSONS.md`, `.agents/TASKS.md`

### 2026-10-05 — Fix AI assistant stuck in "offline mode" (provider inferred from the wrong env var)
- **Status:** completed
- **Summary:** The in-app assistant answered every question with the canned "I'm currently in offline
  mode" message. `services/openaiservices.js` defaulted the provider to `groq` *independently of which
  key existed*, so the `OPENAI_API_KEY` in `.env` was posted to `api.groq.com` and 401'd — and both AI
  callers swallowed the error in a bare `catch`, so a config bug looked exactly like an outage.
- **Details:**
  - `backend/services/openaiservices.js`: provider is now inferred from the key actually present
    (`process.env.GROQ_API_KEY ? 'groq' : 'openai'`), with an explicit `AI_PROVIDER` still taking
    precedence. Key precedence (`GROQ_API_KEY || OPENAI_API_KEY`) unchanged; `baseURL` stays undefined
    for OpenAI so the SDK uses `https://api.openai.com/v1`.
  - `backend/agents/assistantAgent.js` and `backend/agents/assessmentAgent.js`: the bare `catch` now
    logs `error.status` + `error.message` so provider misconfiguration is visible in the server log
    instead of silently degrading to the offline reply / course bank.
  - `backend/.env` (gitignored, not committed): added `GROQ_API_KEY` and `AI_MODEL`. The account has
    **no** `llama-3.3-70b-versatile` — Groq returns `404 model does not exist or you do not have
    access` — so `AI_MODEL=openai/gpt-oss-120b` is pinned. `/v1/models` for this key returns only 11
    models; `gpt-oss-120b` is the strongest general chat model among them.
- **Verified:**
  - Resolved config: `baseURL=https://api.groq.com/openai/v1`, `defaultModel()=openai/gpt-oss-120b`,
    `client` non-null.
  - Provider/credential matrix over 8 env combinations (OpenAI key only, Groq key only, both, both
    overrides, `AI_BASE_URL`, `AI_MODEL`, no keys) — every combination resolves to the intended
    endpoint and model.
  - **Live assistant call returns a real answer** ("A foreign key is a column (or set of columns) in
    one table that references the primary key of another table...— Ifeanyi"), no offline fallback.
  - The earlier OpenAI attempt surfaced the real account blocker:
    `429 You have no credits remaining` — the reason Groq was adopted on 2026-09-28.
  - `node --check` clean on all three edited files; both agent modules load and export unchanged.
- **Known limits on this key (documented in `.env` comments):**
  - **Photo answers cannot work.** None of the 11 available models accept images — Groq rejects the
    OpenAI content-array format with `400 messages[1].content must be a string`. Ifeanyi's photo
    feature stays on the offline reply for this key.
- **Files:** `backend/services/openaiservices.js`, `backend/agents/assistantAgent.js`,
  `backend/agents/assessmentAgent.js`, `backend/.env` (gitignored),
  `.agents/LESSONS.md`, `.agents/TASKS.md`

---

## Backlog

- **Future:** Replace Mongoose-era error branches in `backend/middleware/errorHandler.js`
  (currently checks `ValidationError`, `11000`, `CastError` which do not apply to
  Sequelize).
- **Fix (trivial, high impact):** rename `routes/courses.js:21` to
  `/:courseId/learning-path` so `getLearningPath` receives the param it reads;
  move `GET /my-submissions` (`routes/assignments.js:24`) above `GET /:id`
  (`:20`).
- ~~**Fix (config):** set `AI_PROVIDER=openai` in `backend/.env` so the existing
  `OPENAI_API_KEY`/`OPENAI_MODEL=gpt-5.5` pair is actually used instead of
  being sent to Groq and silently falling back.~~ **Done 2026-10-05:**
  `services/openaiservices.js` now infers the provider from whichever key is
  present, so no `AI_PROVIDER` is needed. Groq is now live via `GROQ_API_KEY` +
  `AI_MODEL=openai/gpt-oss-120b`. OpenAI remains unusable until the account is
  funded (`429 no credits remaining`).
- **Fix (assessment LLM is dead on arrival):** `pickQuestions` in
  `backend/agents/assessmentAgent.js` sends the model *"Generate 10 beginner
  multiple choice questions … in JSON format"*, but `normalizeQuestions` only
  accepts objects with a **`correctAnswer`** field and the model returns
  **`answer`**. Every generated question is therefore filtered out, `normalizeQuestions`
  returns `[]`, and the handler pads from `courseBanks` — so the "LLM-generated"
  assessment has always been the static bank. Also accepts only a bare JSON array,
  so a `{"questions": [...]}` envelope is dropped. Fix: accept `answer` as an alias,
  unwrap a `questions` envelope, and log when the LLM yield is 0 instead of
  silently padding. Verified by calling `generateStudentTest` with a course title
  that has no bank entry ("Zebrafish Husbandry and Aquaponic Hydrodynamics") — it
  still returned the generic bank questions, proving the fallback.
- **Limitation (Groq free tier, this key):** none of the 11 models the account can
  reach accept image input, and Groq rejects the OpenAI content-array format with
  `400 messages[1].content must be a string`. Ifeanyi's photo/screenshot feature
  cannot work on this key; text chat is fine. Needs a vision-capable model
  (`llama-3.2-11b-vision-preview` was in `.env.example` but is not available to this
  account) or a second provider for image turns.
- **Fix (RBAC):** `routes/courses.js:20` should use `isInstructorOrAdmin`, not
  `isInstructor`, or lecturers permanently see an empty course list on the
  consistency screen.
- **Fix (docs):** `backend/AGENTS.md` still documents MySQL/SQLite +
  `DB_DIALECT`; the code is PostgreSQL via `DATABASE_URL`.
- **Future:** add a backend test suite — a single route smoke test would have
  caught both registration-order bugs. Note: an **untracked** `tests/test.js`
  plus root `jest`/`supertest` deps now exist in the working tree (2026-10-02),
  but the file is stale Mongoose-era code (`User.deleteMany({})`, references a
  non-existent `RoomRequest` model) and cannot run as-is. Rewrite it against
  Sequelize (`User.destroy({ where: {} })`) or delete it, so the repo does not
  advertise coverage it does not have.
- ~~**Feature (recommendation agent):** after gathering the failed questions,
  identify the student's weakness, point it out to them, and optionally have
  them immediately learn those areas.~~ **Done 2026-10-05:** added
  `identifyWeaknesses()` + `weaknessSummary()` to
  `backend/agents/recommendationAgent.js`. Missed questions are grouped by
  `topic` (falling back to `moduleTitle`, then `'Untagged topic'`, because
  `pickQuestions` hard-codes `topic: null` for LLM questions), severity is
  `critical / moderate / minor` derived from the **per-topic miss rate** rather
  than a raw count, and the top 3 are returned with a `remedy` of
  `study-module` or `review-questions`. `submitAssessment` now returns
  `weaknessAnalysis`, `weaknessSummary`, and `studyNow`. The result screen
  renders a "Where you need work" panel with a severity badge, a collapsible
  list of the missed questions, and a "Study this now →" button that deep-links
  to `/courses/:id?module=`. No schema change — the analysis is response-only,
  which keeps `docs/database-schema.md` accurate.
  - **Follow-up (optional):** the analysis is not persisted. `AssessmentAttempt`
    has 4 JSON columns (`answers`, `results`, `weaknesses`, `moduleRecommendations`)
    and `weaknesses` currently holds the raw missed questions, so storing the
    analysis would need a **new** column via the existing `ensureColumn` pattern
    in `backend/config/database.js` — not an overwrite of `weaknesses`.
    Worth doing only if weakness trends across attempts are ever needed.
- **Fix (related, still open):** with LLM questions actually reaching the
  student, `pickQuestions` assigns every generated question `topic: null`
  (`backend/agents/assessmentAgent.js:258`), so weakness grouping will fall back
  to `moduleTitle` for the whole set. Ask the model for a `topic` per question
  (and let `normalizeQuestions` accept it) at the same time as the
  `answer` → `correctAnswer` alias fix below.
