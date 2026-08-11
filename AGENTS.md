# AGENTS.md — Universal Agent Instructions (EduFlow)

This file defines how any coding agent should operate inside this repository.
It applies to the repo root and is inherited by `backend/AGENTS.md` and
`frontend/AGENTS.md`, which add scope-specific rules. Read those too.

## What this is

EduFlow — an education platform monorepo:

- `backend/` — Node.js + Express + Sequelize REST API (MySQL or SQLite, switchable via env)
- `frontend/` — React 19 + Vite + Tailwind CSS 4 SPA

## Core operating principles

1. **Plan before code.** For anything non-trivial: understand the request,
   read the relevant files, state the plan, then implement. Do not start
   editing before you know what already exists.
2. **Surgical changes.** Make the smallest change that solves the problem.
   Robust but not lengthy. Do not refactor unrelated code, reformat files,
   or "improve" things you were not asked to touch.
3. **Follow existing conventions.** Match the style, patterns, libraries, and
   structure already in the codebase. Never introduce a new pattern when an
   established one exists.
4. **Learn from mistakes.** Record every notable mistake or insight in the
   Lessons Registry (`.agents/LESSONS.md`). Read it before starting any task.
5. **Verify before done.** Run the applicable checks (tests, lint, build,
   server boot) and report the result. Never claim completion without evidence.

## Guardrails (hard rules)

- NEVER commit, push, amend, or create PRs unless explicitly asked.
- NEVER log, print, or commit secrets (passwords, tokens, JWT secrets, .env contents).
- NEVER modify `.env` values that are user-specific beyond what is asked.
- NEVER add comments to code unless they explain non-obvious intent. No filler comments.
- NEVER write new files when an existing file can be edited.
- NEVER delete or rewrite working code to "clean it up".
- If something is ambiguous, ask a clarifying question before acting.
- If a command fails or behavior is unexpected, investigate the real cause —
  do not mask it or work around it silently.
- Respect that the working tree may contain in-progress structural fixes;
  read the current state of files before assuming they are stale.

## The learning loop

Every task follows this cycle:

1. **Read lessons** — check `.agents/LESSONS.md` for relevant past mistakes.
2. **Plan** — understand the problem, find the code, state the approach.
3. **Act** — implement surgically, following conventions.
4. **Verify** — run checks; confirm the fix/feature actually works.
5. **Reflect** — did anything go wrong? Was anything non-obvious?
6. **Record** — append the lesson to `.agents/LESSONS.md` (deduplicate first).

## Task tracker protocol

- Use the task/todo tool for any work with 3+ steps. Keep exactly one item
  `in_progress` at a time.
- Keep statuses truthful: mark `completed` only after verification.
- If blocked, keep the item `in_progress` and add a follow-up note describing
  the blocker.
- For longer-running effort, the current state is summarized in
  `.agents/TASKS.md`. Update it when you start, finish, or reprioritize work.

## Lessons registry

- Location: `.agents/LESSONS.md`
- Format: one dated entry per lesson, grouped by category.
- A lesson entry contains: what happened, root cause, the fix/prevention,
  and any file paths involved.
- Before implementing, grep the registry for keywords related to the task.

## Verification commands

- Backend boot: `npm run dev` / `node server.js` in `backend/` (health: `GET /api/health`)
- Backend tests: `npm test` in `backend/` (jest)
- Frontend lint: `npm run lint` in `frontend/`
- Frontend build: `npm run build` in `frontend/`

## Workflow

1. Grep `LESSONS.md` for relevant lessons.
2. Read the request, locate code, state the plan (todo list if multi-step).
3. Implement surgically.
4. Verify with the applicable commands.
5. Reflect, update `LESSONS.md` and `TASKS.md` as needed.
