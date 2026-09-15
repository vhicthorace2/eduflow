# EduFlow — Functional & Non-Functional Requirements

Derived from the current codebase (backend routes/controllers/models, frontend screens, config, and env handling).

---

## 1. Functional Requirements

### 1.1 Authentication & Account Management
- Users can **register** with name, email, password (min 6 chars) and optional role; roles restricted to `student`, `instructor`, `lecturer`, `admin` (default `student`). Duplicate email is rejected (400).
- Users can **log in** with email/password; a JWT is returned on success.
- Passwords are hashed with **bcrypt** before storage; a `comparePassword` method verifies logins.
- Authenticated users can **update their own password** (`PUT /api/auth/update-password`).
- Authenticated users can fetch their own profile (`GET /api/auth/me`).
- Users can **request a password reset** (public); a reset token valid for 10 minutes is emailed; password can be reset via `POST /api/auth/reset-password/:token`.
- Users can **upload/update an avatar** (images only, max 5 MB, `PUT /api/auth/me/avatar`).
- `lastLogin` is tracked on each successful login.

### 1.2 Role-Based Access Control (RBAC)
- Four roles: `student`, `instructor`, `lecturer`, `admin`.
- Admin-only: user management (CRUD, toggle status), course assignment/status, admin dashboard, platform reports.
- Instructor/Lecturer/Admin: course/module/material/quiz/assignment/forum creation and management.
- Student: enrollment, learning path, submissions, quiz attempts, gradebook/CGPA views.
- Unauthenticated access to protected endpoints returns 401; authorized-but-wrong-role returns 403.

### 1.3 Courses & Catalog
- Public course catalog and detail views (no auth).
- Students can **enroll** in courses and view **my courses** and a **learning path**.
- Instructors/Lecturers can **create, update, and delete** courses.
- Admins can **toggle course status**, **assign instructors**, and view all courses.

### 1.4 Modules & Materials
- Courses contain **modules** (CRUD by instructor/admin).
- Modules contain **materials** (files), uploaded via `multer` with an allow-list of MIME types (JPEG, PNG, GIF, PDF, Word, MP4/MPEG video, MP3 audio).
- Material create/update accepts a single file; default max file size **10 MB** (env-overridable).
- Materials are listed per module.

### 1.5 Quizzes & Assessment Engine
- Instructors create quizzes **per course** (create/update/delete).
- Quiz type enum: `quiz`, `test`, `exam` (default `quiz`).
- Students can **start**, **submit**, and view their **own attempts**.
- Instructors/Admins can view **all attempts** for a quiz.
- AI-enhanced flow: **start assessment**, **submit assessment**, **evaluate assessment**, and **recommend assessment** (OpenAI-backed, with automatic fallback to sample questions when `OPENAI_API_KEY` is unset).

### 1.6 Assignments & Submissions
- Instructors create assignments per course (attachments, up to 5 files).
- Students **submit** assignments (up to 5 files) per assignment.
- Instructors/Admins can **grade submissions** and list submissions per assignment.
- Students can view **my submissions**.

### 1.7 Gradebook & Reporting
- Per-course **gradebook**: calculate, view, and update grades (instructor/admin).
- Students can view **my grades** and **my CGPA**.
- Instructor/Admin reports per course: **enrollment**, **participation**, **progress**, and a **course consistency** assessment.

### 1.8 Forums & Discussion
- Forums are created **per course** (instructor/admin).
- Authenticated users can create **threads** and **replies**.
- Instructors/Admins can **lock** or **pin** threads.
- Threads/replies are publicly readable.

### 1.9 Messaging
- Authenticated users can **send**, **list**, **view by id**, and **reply** to messages.
- Messages support **unread count** and **mark-as-read**.

### 1.10 Gamification & Activity
- Student activity is **logged** (including time spent per activity).
- Users can view **my activity** and a public **leaderboard** (all roles).
- Users have a tracked `forumPostCount`.

### 1.11 Admin Console
- Admin dashboard with platform stats.
- Admin user management: create, update, delete, view, toggle status.

### 1.12 Platform / Ops
- Public **health check** endpoint (`GET /api/health`) returning server status + timestamp.
- Global error handling with consistent JSON error shape (stack in dev only).
- Email sending via SMTP (nodemailer) for password recovery; welcome email optional.
- Static file serving for uploaded content under `/uploads`.

---

## 2. Non-Functional Requirements

### 2.1 Performance
- **Compression** (gzip) on all responses.
- Rate limiting on the API: **100 requests / 15 min** per IP by default (env-overridable).
- Sequelize **connection pooling** (max 5 on always-on hosts).
- Frontend production build is bundle-split and minified by Vite.

### 2.2 Scalability & Serverless Readiness
- Must deploy as **serverless services** on Vercel (`services` model: frontend SPA + Express backend on one domain).
- DB pool shrinks to **max 1 (env-overridable)** in serverless mode to avoid exhausting MySQL/TiDB connection limits across many instances.
- `server.js` exports an async handler that **connects the DB before serving** on Vercel, avoiding cold-start races.
- Design allows **horizontal scaling** of short-lived API instances.

### 2.3 Security
- **Helmet** security headers on all API responses.
- **CORS** restricted to configured `CLIENT_URL` (open only when unset).
- **Rate limiting** mitigates brute-force and abuse.
- **JWT**-based stateless auth with configurable expiry (`JWT_EXPIRE`, default 7d).
- **bcrypt** password hashing; min password length 6.
- Input validation: model-level validators (email format, not-empty) + `express-validator` in routes.
- File uploads restricted by **MIME allow-list** + size limits (10 MB default, 5 MB avatars) with randomized filenames.
- Secrets (JWT, DB password, SMTP password) live in environment variables **only**; `.env` is gitignored.
- `NODE_ENV=production` suppresses SQL logging and error stack traces.

### 2.4 Reliability & Availability
- **Health check** endpoint for uptime monitoring.
- Graceful **SIGINT** shutdown (closes DB pool then exits).
- **Unhandled promise rejection** handler closes the server cleanly.
- Idempotent, **create-only DB sync** (`CREATE TABLE IF NOT EXISTS`) that never alters/drops existing tables; safe to run on every boot, including fresh hosted DBs.
- Idempotent column migration helper (`ensureColumn`) for schema evolution without risky table rebuilds.
- SQLite dev auto-cleans stale `*_backup` tables after interrupted `alter` rebuilds.

### 2.5 Portability & Configurability
- Database engine switched **purely via env** (`DB_DIALECT=sqlite|mysql`) with sane defaults — no code changes required.
- All tunables (rate limits, file sizes, JWT expiry, pool size, upload path, CORS origin) are env-driven.
- Automatic serverless detection via `VERCEL=1` / `SERVERLESS=1`.

### 2.6 Usability & Accessibility
- Single-page app with **responsive** layout (Tailwind CSS 4).
- **Client-side routing** via React Router (BrowserRouter) with SPA fallback on deep links.
- Theme support (light/dark) via `themeContext`.
- Consistent UI chrome (navigation, sidebar, footer) across role dashboards.
- Clear success/error messaging from the API reflected in the UI.

### 2.7 Maintainability & Testability
- Monorepo with **npm workspaces** (`backend`, `frontend`) and shared root scripts.
- Clear layering: `routes → middleware → controllers → models/services`.
- Backend covered by **Jest** tests (`npm test` in `backend/`).
- Frontend lint via ESLint (react-hooks + react-refresh) and a production build check.
- Centralized error format; single place for association definitions (`models/index.js`).
- Agent-friendly documentation (`.agents/` lessons, README).