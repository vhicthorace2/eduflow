# AGENTS.md — Backend Agent Instructions (EduFlow Backend)

Read the repo root `AGENTS.md` first — its guardrails and learning loop apply
here unchanged. This file adds backend-specific standards.

## Stack (as built)

- Node.js (CommonJS, no ESM `import`/`export`)
- Express 4 REST API
- Sequelize 6 ORM
- Databases: **MySQL** (mysql2) or **SQLite** (sqlite3), switched purely via
  environment variable `DB_DIALECT=mysql|sqlite` in `.env`
- JWT auth (jsonwebtoken), bcryptjs password hashing, express-validator,
  multer uploads, helmet/cors/compression/express-rate-limit

## Environment & DB switching

- `.env` drives everything. `DB_DIALECT` selects the engine entirely:
  - `sqlite` → uses `DB_STORAGE` + `DB_FILE` (no server needed)
  - `mysql` → uses `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`
- Never hardcode a dialect or credentials in source; always read from env with
  sane fallbacks in `config/database.js`.
- `sequelize` instance and `connectDB()` are exported from
  `config/database.js`. Models get `sequelize` via `models/index.js`.
- The app only starts listening AFTER `connectDB()` resolves (see `server.js`).

## Architecture (request flow)

`routes/*` → middleware (`auth`, `rbac`, `upload`) → `controllers/*` → models/services

- **routes/**: thin. Map method+path to a controller, attach middleware inline.
  `module.exports = router;` only.
- **controllers/**: one `exports.handler = async (req, res, next) => {...}`
  per action. Wrap in try/catch, forward errors via `next(error)`. Return
  `res.status(...).json({ success: true, ... })` or error JSON.
- **models/**: Sequelize definitions, one file per model, PascalCase filename.
  `index.js` imports all and defines associations; keep it there, not in
  individual model files.
- **middleware/**: `auth` (JWT verification), `rbac` (role checks), `upload`
  (multer), `errorHandler` (global, last in chain).
- **services/**: only for external integrations (e.g. `openaiservices.js`).
  Do not create service layers for pure DB logic.

## Coding standards

- CommonJS: `require`/`module.exports`/`exports.foo`. No ES modules.
- Semicolons, single quotes, 2-space indent — match existing files.
- Async handlers: `async/await`, not `.then()` chains. No callback hell.
- Errors: build them as `const err = new Error('msg'); err.statusCode = 4xx; next(err);`
  so the global `errorHandler` formats them consistently.
- Validation: `express-validator` in routes for input, Sequelize constraints in
  models. Never trust raw `req.body`/`req.params` — pick fields explicitly.
- Do not reference Mongoose in new code — this is Sequelize (the existing
  `errorHandler.js` still has Mongoose branches; fix those if you touch that file).
- Secrets: JWT secret, DB passwords, email credentials live in `.env` only.

## Guardrails (backend-specific)

- NEVER commit `.env`; it is gitignored.
- Do not switch the DB backend without updating `.env` — changing code to
  "make it work" while env points elsewhere is a defect, not a fix.
- Running `sequelize.sync({ alter: true })` is enabled in development; be aware
  it rewrites tables on boot. Do not rely on it for data migrations.
- No inline SQL strings unless unavoidable; use the query builder/sequelize API.

## Verification

- Boot: `npm run dev` (nodemon) or `node server.js` in `backend/`
- Health: `GET /api/health` → `{ success: true }`
- Tests: `npm test` (jest) — run before finishing any change that touches logic
- If a route/controller is added, hit it with a real request after boot
  (or a jest test) to prove it works — never claim it works unverified.

## Learning loop hooks

- Before starting, grep `.agents/LESSONS.md` for keywords (sequelize, dialect,
  sqlite, mysql, connect, sync, model associations, errorHandler).
- After finishing, record any non-obvious gotcha there.
