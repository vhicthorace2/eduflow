# TASKS.md — Task Tracker (EduFlow)

Summary of longer-running work. Keep exactly one item `in_progress` at a time.
Mark `completed` only after verification. If blocked, leave `in_progress` and
add a follow-up note describing the blocker.

When you start, finish, or reprioritize work, update this file.

---

## Completed

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
