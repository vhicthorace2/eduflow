---
name: enterprise-error-fix
description: Diagnose and fix frontend/backend integration errors using enterprise-grade techniques. Use when debugging CORS, DTO/request-response mismatches, validation, auth wiring, status-code/semantics errors, or any bug spanning the frontend/backend boundary. Includes structured reproduction, contract tracing, web research, and pattern-based fixes.
license: MIT
compatibility: opencode
metadata:
  audience: integration-and-backend-agents
  scope: frontend-backend-boundary
---

## What this skill does

Gives you a strict, repeatable process for resolving errors at the
frontend/backend boundary with enterprise rigor: reproduce, trace the contract,
research, fix root cause, and verify.

## When to use it

- CORS errors in the browser console (`Access-Control-Allow-Origin`, preflight).
- DTO/request-response shape mismatches (field missing, wrong type, wrong nesting).
- Validation errors that pass on one side but fail on the other.
- Auth wiring: 401/403, token expiry, role mismatches between frontend and backend.
- Wrong HTTP semantics (404 vs 204, 4xx vs 5xx, wrong method).
- Any bug whose stack trace or symptom touches both `frontend/` and `backend/`.

## Process (follow in order)

### 1. Reproduce exactly

- Capture the exact failing request: method, full URL, headers, request body,
  response status, response body, and the browser console error if any.
- Record whether the failure is preflight (OPTIONS), request, or response handling.
- Get evidence before touching anything.

### 2. Trace the contract end-to-end

- Backend side: route file → controller → response shape. Note every field the
  endpoint returns and its type/format (e.g. `id` number vs string, dates as ISO).
- Frontend side: the consumer — the fetch/axios call and the code reading the
  response. Note every field it expects.
- Diff the two. The mismatch you find is usually the root cause.
- Check DTO hygiene: does the backend leak raw model attributes (passwords,
  internals)? Are fields picked explicitly?

### 3. Check the cross-cutting layer

- CORS: compare `server.js` CORS origin to the frontend origin/proxy
  (`vite.config.js`). Note that `credentials: true` requires a specific origin,
  never `*`, and that `express-rate-limit` responses are not CORS-protected by
  default.
- Error handler: does the backend `errorHandler` shape match what the frontend
  parses (`message`, `errors`, `success`)? Update the one that is wrong.
- Validation: `express-validator` rules vs frontend form constraints.
- Auth: token storage, header name, expiry, and role checks on both sides.

### 4. Research before fixing

- Use `websearch` for the specific error signature and for the current
  enterprise pattern (e.g. `"cors credentials true express vite"` or
  `"sequelize include alias frontend"`).
- Prefer authoritative sources (MDN, Express/Sequelize/Vite official docs,
  well-maintained references). Apply only patterns that fit this codebase.

### 5. Fix the root cause surgically

- Smallest correct change. If the contract is wrong, fix whichever side violates
  it — or both, when the contract was never defined.
- Do not work around the error (no blind `try/catch`, no `// eslint-disable`
  silence, no hardcoded origins to mask misconfiguration).
- If you add or standardize a DTO shape, follow existing naming/format in the
  codebase.

### 6. Verify with evidence

- Boot backend and hit the actual endpoint (curl or a test) — confirm status,
  headers, body shape.
- Confirm the frontend consumes it: `npm run build` in `frontend/`, and where
  possible a real browser/dev run exercising the flow.
- For CORS, test the exact cross-origin request, not just `localhost`.

### 7. Record

- Append the root cause + fix to `.agents/LESSONS.md` (deduplicate first).
- Update `.agents/TASKS.md` if the work spanned multiple steps.

## Common patterns (quick reference)

- **CORS preflight fails with credentials:** set explicit `origin` (no `*`),
  ensure `credentials: true` matches frontend `credentials: 'include'`.
- **404 on a POST endpoint:** check the route path/verb ordering — `/:id` routes
  before a `/:id/subresource` can swallow requests.
- **Sequelize relation missing in response:** missing `include`/`as` on
  `findAll`/`findByPk` — check `models/index.js` associations match the `as`.
- **Frontend gets `undefined` field:** backend serialized the field differently —
  align the DTO (camelCase vs snake_case, date formats, `id` type).
- **Rate limiter blocks cross-origin:** limiter runs before CORS headers for
  rejected requests — allow the preflight or handle the `Retry-After` shape.
