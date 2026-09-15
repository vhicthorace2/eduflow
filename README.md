# EduFlow

EduFlow is an education platform monorepo with a **React 19 + Vite** single-page app (SPA) and a **Node.js + Express + Sequelize** REST API. It supports role-based access (admin, instructor, student), course delivery, assessments, messaging, gamification, and AI-assisted assessment generation.

## Repository layout

| Path | Purpose |
| --- | --- |
| `backend/` | Express REST API (Sequelize ORM, JWT auth, MySQL or SQLite) |
| `frontend/` | React 19 SPA (Vite build, Tailwind CSS 4, React Router 7) |
| `vercel.json` | Vercel "services" config: routes `/api/*` and `/uploads/*` to the backend service, everything else to the frontend service |
| `package.json` | Root npm workspaces (`backend`, `frontend`) with shared scripts |

## Tech stack

**Backend**
- Node.js (CommonJS), Express 4
- Sequelize 6 + `mysql2` (MySQL / TiDB) or `sqlite3` + Turso (`@libsql/client`) — switched via the `DB_DIALECT` env var
- JWT auth (`jsonwebtoken`), bcrypt password hashing
- `helmet`, `cors`, `compression`, `express-rate-limit`, `express-validator`
- `multer` for file uploads, `nodemailer` for password-recovery email
- OpenAI integration for AI-generated assessment questions

**Frontend**
- React 19 (ES modules, `.jsx`), Vite 8
- Tailwind CSS 4 via the `@tailwindcss/vite` plugin
- `react-router-dom` 7 (`BrowserRouter`)

## Features

- **Auth & roles** — signup/login with JWT; `admin`, `instructor`, and `student` roles enforced by RBAC middleware
- **Course catalog** — browse/join courses; course modules and learning materials
- **Assessments** — quizzes with question banks and AI-assisted question generation; quiz attempts tracked
- **Assignments & grading** — submissions and a gradebook
- **Collaboration** — forums with threads and replies, direct messaging
- **Gamification** — activity logging and a leaderboard
- **Admin console** — user management, course management
- **Reports** — platform usage/analytics reports

## Getting started (local development)

Prerequisites: Node.js 18+ and npm.

```bash
npm install              # installs all workspaces
cp backend/.env.example backend/.env   # then edit values
npm run dev:backend      # starts the API (http://localhost:5000)
npm run dev:frontend     # starts the SPA (http://localhost:5173)
```

Health check: `GET /api/health`.

### Database switch

`backend/.env` drives everything via `DB_DIALECT`:

- `DB_DIALECT=sqlite` (default for dev) — no server needed; uses `DB_STORAGE` + `DB_FILE`
- `DB_DIALECT=mysql` — uses `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`

Only the `.env` changes — no code changes are required to swap engines.

### Seeding sample data

```bash
npm run seed
```

## Environment variables

See `backend/.env.example` for the full annotated list. Key ones:

| Variable | Purpose |
| --- | --- |
| `DB_DIALECT` | `sqlite` or `mysql` — selects the database engine |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | MySQL connection (when `DB_DIALECT=mysql`) |
| `DB_STORAGE` / `DB_FILE` | SQLite file location (when `DB_DIALECT=sqlite`) |
| `JWT_SECRET` | Token signing secret (production: use a strong random value) |
| `JWT_EXPIRE` | Token lifetime, e.g. `7d` |
| `CLIENT_URL` | Allowed CORS origin (open in production) |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASSWORD` | SMTP for password-recovery email |
| `OPENAI_API_KEY` | Optional — enables AI assessment generation; sample questions used when unset |
| `MAX_FILE_SIZE`, `UPLOAD_PATH` | Upload limits and storage directory |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` | API rate limiting |

## Testing & verification

- Backend tests: `npm test` in `backend/` (Jest)
- Frontend lint: `npm run lint` in `frontend/`
- Frontend build: `npm run build` in `frontend/` (or `npm run build` at the repo root)

## Deployment (Vercel, single domain)

The monorepo deploys as a single Vercel project using the **services** model in `vercel.json`:

- `services.frontend` → root `frontend/`, with an SPA fallback rewrite (`/(.*)` → `/index.html`)
- `services.backend` → root `backend/`, Express framework, entrypoint `server.js`
- Top-level `rewrites` send `/api/*` and `/uploads/*` to the backend service and everything else to the frontend

Key points:

- **Root Directory must be the repo root (`./`)** so Vercel finds `vercel.json`; do not set it to `frontend/`.
- The backend receives the **original path** (`/api/...`), matching the existing route mounts — no prefix stripping.
- On Vercel, `server.js` exports an async handler that connects the database before serving, so the first request doesn't race the DB connection.
- Set environment variables (DB connection, `JWT_SECRET`, `CLIENT_URL`, email/OpenAI config) in **Vercel → Project → Settings → Environment Variables**.
- Deploy fresh code with a **Create Deployment** action or `npx vercel --prod` — a Redeploy re-builds the pinned (old) commit.

## Architecture notes

- **Backend request flow** — `routes/*` → middleware (`auth`, `rbac`, `upload`) → `controllers/*` → models/services
- **Frontend structure** — all routes live in `frontend/src/App.jsx`; screens in `src/screens/`, reusable chrome in `src/component/`, API calls via `src/api/client.js`
- **Model associations** are defined once in `backend/models/index.js`
- Sequelize `sync()` is create-only in production; schema changes use idempotent `ensureColumn` helpers (see `.agents/LESSONS.md`)
- Cross-cutting lessons and agent notes live in `.agents/` and `.opencode/`