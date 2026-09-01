# TASKS.md — Task Tracker (EduFlow)

Summary of longer-running work. Keep exactly one item `in_progress` at a time.
Mark `completed` only after verification. If blocked, leave `in_progress` and
add a follow-up note describing the blocker.

When you start, finish, or reprioritize work, update this file.

---

## Completed

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

---

## Backlog

- **Future:** Replace Mongoose-era error branches in `backend/middleware/errorHandler.js`
  (currently checks `ValidationError`, `11000`, `CastError` which do not apply to
  Sequelize).
