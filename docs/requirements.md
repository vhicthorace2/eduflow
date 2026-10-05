# Software Requirements Specification (SRS) — EduFlow

| Field | Value |
| --- | --- |
| Product | EduFlow — AI-assisted education platform |
| Document | Software Requirements Specification (SRS) |
| Version | 1.0.0 |
| Status | As-built specification (derived from the implemented codebase) |
| Repository | Monorepo: `backend/` (Express + Sequelize REST API), `frontend/` (React 19 + Vite SPA) |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
- [Appendix A — API Mount Map](#appendix-a--api-mount-map)
- [Appendix B — RBAC Matrix](#appendix-b--rbac-matrix)
- [Appendix C — Data Model Summary](#appendix-c--data-model-summary)
- [Appendix D — Dependencies](#appendix-d--dependencies)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the functional and non-functional requirements of **EduFlow**, an education platform consisting of a React 19 single-page application and a Node.js/Express REST API. It records the behaviour that is actually implemented in the repository: routes, controllers, agents, models, middleware, and deployment configuration. Every statement below is traceable to a source file in `backend/` or `frontend/`, or to a root-level configuration file (`vercel.json`, `package.json`).

The SRS is intended for:

- product owners validating delivered scope;
- developers changing routing, authorization, personalization or the agent layer;
- reviewers and QA deriving test cases from numbered requirements;
- new maintainers onboarding to the system's structure.

It is **not** a roadmap document; future enhancements are out of scope and are only mentioned where the current implementation deliberately leaves a stub.

### 1.2 Scope

**In scope**

- A REST API under `/api/*` served by a single Express application (`backend/server.js`).
- JWT-based authentication, four-role RBAC, and ownership checks.
- Course catalog, modules, materials (with file upload).
- Timed placement assessment that gates enrollment, with detailed per-question feedback.
- Course-authored quizzes and assignments, submissions, grading, gradebook and CGPA.
- Forums (threads/replies), direct messages, activity logging, leaderboard, reports.
- Learner modelling, content/resource recommendation, and preference-driven personalization.
- An AI study assistant ("Ifeanyi") backed by a Groq OpenAI-compatible chat-completions endpoint, with deterministic offline fallbacks.
- A React 19 SPA consuming the API, including a first-login onboarding guide and learning-preference selection.
- Vercel serverless deployment against a hosted PostgreSQL (Neon) database.

**Out of scope**

- Native mobile applications (the only client is the SPA).
- Payments, subscriptions, certification issuance, live/video-conferencing classes.
- Horizontal multi-region deployment, message queues, caches beyond in-process maps.
- Offline-first or service-worker behaviour.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
| --- | --- |
| **Actor** | A user interacting with the system, identified by a `role` on the `User` record. |
| **Admin / Instructor / Lecturer / Student** | The four values of `User.role` (`ENUM('student','instructor','lecturer','admin')`). |
| **RBAC** | Role-Based Access Control; enforced by `backend/middleware/rbac.js`. |
| **JWT** | JSON Web Token; payload is `{ id }`, signed with `JWT_SECRET`, expiry `JWT_EXPIRE` (default `7d`). |
| **Placement assessment** | The 10-question, 120-second diagnostic quiz used to gate new course enrollment. |
| **Assessment attempt** | A persisted, graded placement assessment (`AssessmentAttempt`), including per-question results and weak areas. |
| **Learner model** | The aggregated snapshot of a student's enrollments, performance, activity, preferences, difficulty areas and weakness areas. |
| **Learning mode / preferred mode** | A student's preferred material format, one of `text`, `audio`, `video`, stored inside `User.preferences.learningMode`. |
| **Content feed** | The up-to-8 recommended materials returned by the content/resource agent. |
| **Augmentation** | Virtual, per-request extra materials appended to a module so the learner sees ≥3 items of their preferred format. Never persisted. |
| **Agent** | A self-contained backend decision module under `backend/agents/` (assessment, evaluation, recommendation, learner-modelling, content/resource, assistant) plus the shared `assessmentStore`. |
| **`assessmentStore`** | In-memory `Map` of in-flight placement assessments keyed by a UUID. Shared by the enrollment gate and the assessment controller. |
| **Ifeanyi** | The in-product AI study assistant persona implemented by `assistantAgent.js`. |
| **Groq / OpenAI-compatible** | The LLM endpoint at `https://api.groq.com/openai/v1`, called via the `openai` SDK's `chat.completions.create`. |
| **SPA** | Single-page application (the React frontend). |
| **Serverless** | The Vercel execution mode in which the platform serves the exported `app` directly and the process never calls `app.listen`. |
| **CGPA** | Cumulative Grade Point Average on a 5.0 scale, credit-weighted by `Course.credits`. |

### 1.4 References

| Reference | Description |
| --- | --- |
| `backend/server.js` | Express application, middleware chain, router mounts, health/root endpoints. |
| `backend/routes/*.js` (17 files) | Endpoint surface and the middleware attached to each endpoint. |
| `backend/controllers/*.js` (18 files) | Request handlers. |
| `backend/agents/*.js` (7 files) | Assessment, evaluation, recommendation, learner-modelling, content/resource, assistant agents and the shared assessment store. |
| `backend/models/*.js` (17 models + `index.js`) | Sequelize definitions and associations. |
| `backend/middleware/{auth,rbac,upload,errorHandler}.js` | Authentication, authorization, uploads, global error formatting. |
| `backend/config/database.js` | Sequelize instance, PostgreSQL dialect, SSL, pool sizing, `connectDB()`. |
| `backend/services/openaiservices.js` | AI client/model resolution (`{ client, defaultModel }`). |
| `vercel.json`, `api/index.js` | Deployment routing and the serverless entry point. |
| `frontend/src/**` | SPA screens, components and API client. |
| IEEE 830 / ISO/IEC/IEEE 29148 style | Structure of this document (purpose, overall description, FR/NFR numbering, appendices). |

---

## 2. Overall Description

### 2.1 Product Perspective

EduFlow is a browser-based, client–server system with three cooperating tiers:

```
┌──────────────────────────────┐
│  frontend/  React 19 SPA     │  Vite build, Tailwind CSS 4, React Router 7
│  (browser client, token auth)│  Bearer token in request headers
└──────────────┬───────────────┘
               │ HTTPS / JSON
┌──────────────▼───────────────┐
│  backend/  Express 4 API     │  helmet · cors · compression · rate limit
│  routes → middleware →       │  auth (JWT) → rbac (roles) → upload (multer)
│  controllers → agents/models │
└──────────────┬───────────────┘
               │ Sequelize 6 (dialect: postgres)
┌──────────────▼───────────────┐      ┌───────────────────────────────┐
│  Hosted PostgreSQL (Neon)    │      │  Groq (LLM, OpenAI-compatible)│
│  17 tables, SSL required     │      │  YouTube public search page   │
└──────────────────────────────┘      │  SMTP (nodemailer)            │
                                      └───────────────────────────────┘
```

- The API is the only system of record. All business rules live in controllers and agents; the SPA is a presentation layer.
- Persistence is PostgreSQL only: `backend/config/database.js` instantiates Sequelize with `dialect: 'postgres'` and `DATABASE_URL`. (`backend/AGENTS.md` and `README.md` still describe a MySQL/SQLite `DB_DIALECT` switch; the implemented code no longer honours it — see NFR-012.)
- Deployment is a Vercel multi-service configuration: `/api/*` and `/uploads/*` rewrite to the `backend` service, everything else to the `frontend` service.
- Statelessness is partial. The API is stateless between requests except for two in-process structures (see FR-060 and NFR-005).

### 2.2 Product Functions

| # | Function group | Summary | Principal actors |
| --- | --- | --- | --- |
| F1 | Authentication & account | Register, login, current-user lookup, password reset by email token, password change, profile settings, avatar upload. | All |
| F2 | Course catalog | Public listing with category/difficulty/text filters, course detail, "my courses", instructor course list, create/update/delete. | Student, Instructor, Lecturer, Admin |
| F3 | Modules & materials | Ordered modules per course; ordered materials per module; single-file upload with MIME allow-list. | Student, Instructor, Lecturer, Admin |
| F4 | Placement assessment | Start/submit a 10-question, 120-second assessment; per-question breakdown; weak areas; module recommendations; enrollment completion. | Student |
| F5 | Learner modelling | Aggregated student model, assessment insights, preferred learning mode. | Student |
| F6 | Content recommendation & personalization | Scored, preference-weighted feed (≈70% preferred) and per-module augmentation (≥3 preferred items), virtual only. | Student |
| F7 | AI assistant "Ifeanyi" | Text and image Q&A with 8-turn context, persisted transcript, deterministic offline fallback. | Student |
| F8 | Quizzes | Author MCQ quizzes/test/exams, attempt with auto-grading and attempt caps, review own/all attempts. | Student, Instructor, Lecturer, Admin |
| F9 | Assignments & submissions | Create assignments with attachments, submit up to 5 files, grade with feedback, review submissions. | Student, Instructor, Lecturer, Admin |
| F10 | Gradebook & CGPA | Per-course gradebook calculation/update, own grades, credit-weighted CGPA on a 5.0 scale. | Student, Instructor, Lecturer, Admin |
| F11 | Forums | Per-course forums, threads, threaded replies, pinning and locking. | Student, Instructor, Lecturer, Admin |
| F12 | Messaging | Direct messages with reply, read state, unread count, per-recipient soft delete. | All |
| F13 | Activity & leaderboard | Log module views/quiz attempts/submissions; consistency streaks; top-5 leaderboard. | All |
| F14 | Reporting | Enrollment/progress/participation/consistency reports, instructor dashboard, admin dashboard. | Instructor, Lecturer, Admin |
| F15 | Administration | User CRUD and activation, course listing, instructor assignment, course activation. | Admin |
| F16 | Onboarding & preferences | Four-step first-login guide (client), learning-preference selection (client + API). | All |

### 2.3 User Classes and Characteristics

| Actor | Characteristics | Goals | Notable capabilities |
| --- | --- | --- | --- |
| **Student** (`role='student'`) | The only actor for whom personalization and AI assistance exist. | Learn efficiently; know what to study next; pass assessments. | Browse catalog; enroll through the assessment gate; read personalized modules/materials; submit assignments; take quizzes; view gradebook/CGPA; post in forums; message; log activity; see leaderboard; use learner model, recommendations, insights and Ifeanyi. |
| **Instructor** (`role='instructor'`) | Content owner; ownership checks gate every mutation of their own content. | Author and grade content; monitor learners. | Create/update/delete courses, modules, materials, assignments, quizzes, forums; grade submissions; calculate gradebooks; read course reports; view their own course list (`GET /api/courses/instructor-courses` is guarded by `isInstructor`, which excludes `lecturer` and `admin`). |
| **Lecturer** (`role='lecturer'`) | Same content authority as instructor through `isInstructorOrAdmin`, but **not** through `isInstructor` alone. | As instructor. | All authoring/grading/reporting capabilities of `isInstructorOrAdmin`; excluded from the `isInstructor`-only endpoints. |
| **Admin** (`role='admin'`) | Platform owner; may act on any resource and may reassign course ownership. | Operate the platform. | All instructor capabilities, plus user CRUD/toggle, global course list, instructor assignment, course activation toggle, admin dashboard. May pass `instructorId` when creating a course to attribute it to an `instructor`/`lecturer`. |
| **Anonymous visitor** | Not a `User`; may call unauthenticated GETs and auth endpoints. | Browse. | Public catalog, course/module/material/quiz/assignment/forum reads, register, login, password reset. Optional-auth endpoints still personalize when a valid token is supplied. |

Role enumeration and defaults: `User.role` defaults to `student`; registration accepts only the four enumerated values, and any other value is rejected with 400.

### 2.4 Constraints

| ID | Constraint |
| --- | --- |
| C-01 | **Single API process model.** One Express app; no internal service bus. Agents are in-process modules. |
| C-02 | **CommonJS only.** The backend uses `require`/`module.exports`; ES module syntax is prohibited (no `"type": "module"` in `backend/package.json`). |
| C-03 | **Node.js ≥ 18.** Global `fetch` and `AbortSignal.timeout()` are used for YouTube resolution. |
| C-04 | **PostgreSQL only** with SSL enforced (`ssl.require = true`, `rejectUnauthorized: false`). |
| C-05 | **JSON + multipart only.** No GraphQL, no WebSocket, no server-sent events. |
| C-06 | **Uploads are on local disk** (`UPLOAD_PATH`, default `./uploads`) served statically at `/uploads`; there is no object storage. |
| C-07 | **Rate limiting** applies to `/api/` only: 100 requests per 15-minute window per IP by default. |
| C-08 | **Request bodies** limited to 10 MB (`express.json`, `express.urlencoded`). |
| C-09 | **LLM access is optional.** With no API key configured, every agent degrades to a deterministic implementation. |
| C-10 | **No YouTube API key.** Video discovery uses the public search-results page. |
| C-11 | **Single database per deployment**, shared by all API instances. |
| C-12 | **Sequelize `sync()` without `alter`** runs at boot; schema evolution is not a migration process. |

### 2.5 Assumptions

| ID | Assumption |
| --- | --- |
| A-01 | The deployment environment supplies `DATABASE_URL`, `JWT_SECRET`, and upload/CORS/rate-limit variables (see `backend/.env.example`). |
| A-02 | TLS is terminated by the platform in front of the API; `helmet()` supplies standard HTTP security headers. |
| A-03 | A single SMTP account is available for password-reset mail; when it is absent, only the reset email fails. |
| A-04 | Clients send `Authorization: Bearer <jwt>`; the SPA API client stores the token after login/register. |
| A-05 | Public catalogue/course/module/material endpoints are intentionally readable without authentication. |
| A-06 | Enrollment is only finalised through `POST /api/assessment/submit`; the enroll endpoint itself starts the gate. |
| A-07 | The catalogue contains materials of all three preferred formats; when preferred items are scarce the 70% share is a cap, not a guarantee. |
| A-08 | For each course, module ordering (`Module.order`) is the canonical sequence used by recommendations, learning paths and assessment tagging. |
| A-09 | Time is measured server-side where possible; the client-supplied `timeSpent` is clamped to the assessment's limit. |
| A-10 | One active, always-on process locally; in serverless mode the platform guarantees request-scoped processes may be cold or shared, which is why assessment state is per-process. |

---

## 3. Functional Requirements

**Conventions.** Each requirement has a unique ID, an actor, a trigger, and an observable result. "System" refers to the API process. Status values (`200`, `201`, `400`, `401`, `403`, `404`, `500`) are HTTP responses.

### 3.1 Authentication and Account Management

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-001** | Anonymous | The system shall register a user from `name`, `email`, `password` and optional `role` (`POST /api/auth/register`). It shall reject a duplicate email with 400 and any role outside `student|instructor|lecturer|admin` with 400; absent a role the default is `student`. On success it returns 201 with a signed JWT and the public user fields (`id`, `name`, `email`, `role`). |
| **FR-002** | All | The system shall hash passwords with bcrypt (per-save salt of 10 rounds) before persistence and shall verify logins with the model's `comparePassword` instance method. |
| **FR-003** | User | The system shall authenticate with email and password (`POST /api/auth/login`): 400 when either field is missing, 401 for unknown email, wrong password, or a deactivated account (`isActive = false`), and 200 with a token plus `lastLogin` on success; it shall update `lastLogin` on every successful login. |
| **FR-004** | Authenticated user | The system shall return the current user (`GET /api/auth/me`) including `id`, `name`, `email`, `role`, `avatar`, `lastLogin` and `forumPostCount`. Requests without a valid token return 401. |
| **FR-005** | User | The system shall start password recovery (`POST /api/auth/forgot-password`): 404 when no user matches the email; otherwise generate a 32-byte random token, persist only its SHA-256 hash together with a 10-minute expiry, and email a reset link to `${CLIENT_URL}/reset-password/<token>` via nodemailer. If delivery fails it clears the stored token/expiry and returns 500. |
| **FR-006** | User holding a reset token | The system shall reset the password (`POST /api/reset-password/:token` equivalent, mounted at `/api/auth/reset-password/:token`) by locating the user whose stored token hash matches SHA-256 of the supplied token and whose expiry is in the future; invalid/expired tokens yield 400. On success it stores the new password, clears the token and expiry, and returns a fresh JWT. |
| **FR-007** | Authenticated user | The system shall let a user change their password (`PUT /api/auth/update-password`) after verifying the current password (401 on mismatch) and return a re-issued JWT. |
| **FR-008** | Authenticated user | The system shall expose profile settings: `GET /api/settings/me` returns the user with `preferences` (default `{ email: true, push: false, digest: true }`); `PUT /api/settings/me` updates `name` (non-empty), `email` (format-checked, unique across users, lower-cased) and `preferences` (merged over the defaults), and supports a password change that requires `currentPassword` (401) and a minimum length of 6 (400). |
| **FR-009** | Authenticated user | The system shall accept a profile photo upload (`PUT /api/settings/me/avatar`, multipart field `avatar`) restricted to JPEG/PNG/GIF/WebP up to 5 MB, store the file under the upload directory, persist `/uploads/<file>` as `User.avatar`, and best-effort delete the previously uploaded avatar (never the non-upload fallback). |

### 3.2 Courses, Modules, and Materials

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-010** | All | The system shall list courses (`GET /api/courses`) restricted to `isActive = true`, newest first, including the instructor's `id`, `name`, `email`, and filtered by `category`, `difficulty` and a case-insensitive `search` over title and description. Search input shall have SQL `LIKE` wildcards (`%`, `_`, `\`) escaped so user input is matched literally. |
| **FR-011** | All | The system shall return a single course with its instructor (`GET /api/courses/:id`), 404 when absent. |
| **FR-012** | Student | The system shall return the caller's enrollments (`GET /api/courses/my-courses`) including the course and its instructor, dropping any course that has since been deactivated. |
| **FR-013** | Instructor | The system shall return the courses owned by the caller (`GET /api/courses/instructor-courses`), guarded by `isInstructor`. |
| **FR-014** | Instructor, Lecturer, Admin | The system shall create a course (`POST /api/courses`) with title, description, thumbnail, category (default `General`), difficulty (default `beginner`) and optional enrollment limit; `credits` defaults to 3 and is constrained to 1–8. An admin may pass `instructorId`, which must reference an existing `instructor` or `lecturer` (400 otherwise); other roles attribute the course to themselves. |
| **FR-015** | Owner instructor, Lecturer via RBAC, Admin | The system shall update (`PUT /api/courses/:id`) or delete (`DELETE /api/courses/:id`) a course only when `course.instructorId === req.user.id` or the caller is an admin (403 otherwise); 404 when the course does not exist. |
| **FR-016** | All | The system shall return a course's ordered active modules (`GET /api/modules/course/:courseId`) with their materials embedded, ordered by `Module.order` ascending. |
| **FR-017** | Instructor, Lecturer, Admin | The system shall create, update and delete modules (`POST /api/modules/course/:courseId`, `PUT/DELETE /api/modules/:id`) only for a course the caller owns or is an admin of (403 otherwise). Deleting a module shall first delete its materials, then the module. New modules default `order` to 0 and `content` to an empty string. |
| **FR-018** | All | The system shall list a module's active materials ordered by `Material.order` (`GET /api/materials/module/:moduleId`) and return a single material (`GET /api/materials/:id`, 404 when absent). |
| **FR-019** | Instructor, Lecturer, Admin | The system shall create/update/delete materials only for modules of a course the caller owns or is an admin of (403 otherwise). Create and update accept one uploaded file (`multer`, field `file`) and persist `fileUrl` and `fileSize`; delete removes the record. |
| **FR-020** | Instructor, Lecturer, Admin (uploads) | The system shall accept uploads only for the MIME allow-list `image/jpeg`, `image/png`, `image/gif`, `application/pdf`, `application/msword`, `.docx`, `video/mp4`, `video/mpeg`, `audio/mpeg`, reject others with 400, cap size at `MAX_FILE_SIZE` (default 10 MB), and store files under `UPLOAD_PATH` (default `./uploads`) with a timestamp+random filename. |

### 3.3 Enrollment and the Gated Placement Assessment

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-021** | Student | The system shall gate enrollment behind a placement assessment. `POST /api/courses/enroll/:id` shall: 404 when the course is unknown; return 200 with the existing `Enrollment` when the student is already enrolled; otherwise return 200 with `{ requiresAssessment: true, assessmentId, course, timeLimit: 120, questions }` and **no enrollment record created**. |
| **FR-022** | Student | The assessment shall contain exactly **10** multiple-choice questions (each with 2–4 options), drawn from a deterministic per-course bank when no LLM client is available and from the LLM (topped up from the bank) when one is. |
| **FR-023** | System | The assessment shall never expose correct answers to the client before submission: `correctAnswer` shall be stripped from every returned question (`sanitizeQuestions`), and the answer key shall be retained server-side in `assessmentStore`. |
| **FR-024** | Student | The assessment shall be time-limited to **120 seconds**. The stored record shall carry `startedAt` and `timeLimit`, and the client-reported `timeSpent` shall be clamped to the limit; the server-derived elapsed time shall be used when the client value is not an integer. |
| **FR-025** | Student | The system shall start a standalone assessment on demand (`POST /api/assessment/start`, authenticated) from a course title and/or `courseId`, returning `assessmentId`, `course`, `timeLimit: 120`, `moduleCount` and sanitized questions. A missing or non-string `course` yields 400. |
| **FR-026** | Student | The system shall grade a submission (`POST /api/assessment/submit`) by looking up the assessment, returning 404 when it is unknown or already consumed (stale ids), and 400 when `answers` is not an array. Evaluation shall produce per-question results containing the question text, options, topic, `moduleOrder`, `moduleTitle`, the selected answer, the correct answer and `isCorrect`, plus `score`, `total`, `percentage` and a `weaknesses` list of the incorrect results. |
| **FR-027** | System | Grading shall compute `passed` as `percentage >= 50` and a learning level: `Advanced` ≥ 80, `Intermediate` ≥ 50, otherwise `Beginner`. |
| **FR-028** | System | The system shall recommend modules to review by counting missed questions per module (descending, ties broken by module order) and returning at most **3** modules with their missed counts and topics; on a perfect score it falls back to the level-based pick (Beginner → first, Intermediate → middle, Advanced → last). The response shall expose `recommendedModule`, `recommendedModuleOrder` and `recommendedModules[]`. |
| **FR-029** | System | Grading shall complete the gated enrollment: when the assessment resolves to a real course, an `Enrollment` shall be created or reused with `status: 'active'` and `enrolledAt`, and the response shall set `enrolled: true`. |
| **FR-030** | System | The system shall persist the structured report as an `AssessmentAttempt` (answers, results, weaknesses, module recommendations, score, total, percentage, passed, level, `timeSpent`, `completedAt`) and return its `id` as `attemptId` (`null` when persistence is not possible, e.g. no matching course). |
| **FR-031** | System | The system shall delete the assessment from `assessmentStore` after grading so an id cannot be replayed, and shall report `timeExpired: true` when the clamped `timeSpent` reaches the limit. |
| **FR-032** | Student | The system shall retain stateless grading (`POST /api/assessment/evaluate`, authenticated) that compares client-supplied `studentAnswers` against `correctAnswers` and returns `score`, `total`, `percentage` (400 when either array is absent), and level recommendation (`POST /api/assessment/recommend`, authenticated) from a numeric `score` (400 otherwise). These endpoints are kept for backward compatibility with earlier clients. |
| **FR-033** | Student | The system shall compute a personalized learning path (`GET /api/courses/:courseId/learning-path`, authenticated) from best quiz percentages, graded submissions (clamped to 0–100 against `maxPoints`) and gradebook overall grades, deriving `pace` (`review` < 55, `accelerated` ≥ 80, else `steady`), per-module status (`completed`, `review`, `upcoming`), `progressPercent`, `completedCount`, the recommended next module and a `feedback` sentence. |

### 3.4 Learner Modelling, Insights, and Preferences

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-034** | Student | The system shall build the learner model (`GET /api/learner/model`, authenticated, student-only) by aggregating in parallel: active enrollments with course titles; quiz attempts; assessment attempts; submissions; activity logs. |
| **FR-035** | System | The learner model shall report `profile` (name, preferences with defaults `{ email: true, push: false, digest: true }`, `learningMode`, `engagement`), `priorKnowledge` (enrolled courses, courses averaging ≥ 80% as completed, `totalEnrolled`), `performance` (quiz counts/average/pass rate, assessment counts/average/pass rate, graded submissions and average assignment grade), and `activities` (by type, totals, total time spent, modules touched, active days, last active timestamp). |
| **FR-036** | System | Engagement shall be classified as `active` when total activities ≥ 10 or total time ≥ 3600 s, `steady` when ≥ 3 activities or ≥ 900 s, otherwise `low`. |
| **FR-037** | System | The learner model shall list `difficultyAreas` for courses averaging below 50% (ascending, each with a recommendation to revisit fundamentals) and up to 6 `weaknessAreas` aggregated across assessment attempts by course+module, each with `missedQuestions` and the topics missed. |
| **FR-038** | Student | The system shall expose the assessment report (`GET /api/learner/insights`, authenticated, student-only) as `weaknessAreas` plus assessment attempt count, average percentage and pass rate. |
| **FR-039** | Student | The system shall store the preferred learning mode (`PUT /api/learner/preferences`) restricted to `text`, `audio` or `video` (400 otherwise), merging it into the existing `User.preferences` JSON and returning the refreshed learner model. |

### 3.5 Recommendations and Personalization

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-040** | Student | The system shall build the content feed (`GET /api/learner/recommendations`, authenticated, student-only) by first computing the learner model and passing it to the content/resource agent. |
| **FR-041** | System | The content agent shall determine the learner's engaged courses as the union of active enrollments and difficulty-area course ids; if that set is empty it falls back to course ids found in activity logs, and if still empty returns `{ recommendations: [], total: 0 }`. |
| **FR-042** | System | The content agent shall score candidate active materials in engaged courses (at most 300, ordered by module order then id) as: **difficulty +30**, **next in course sequence +10**, **not yet studied +20**, **in an enrolled course +10**, **matches preferred mode +25**, with `totalTimeSpent`-independent ordering ties broken by module order. |
| **FR-043** | System | Preferred formats shall map as `text → [document, link]`, `audio → [audio, link]`, `video → [video]`. A material that matches the learner's mode shall receive the reason `Matches your <mode> learning style` when its otherwise-derived reason is generic or a review reason. |
| **FR-044** | System | The feed shall contain at most **8** items and shall be mixed so that **≈70 %** of it (`Math.ceil(8 × 0.7) = 6`) is of the learner's preferred format, the remainder preserving other formats for variety; if preferred items are short of the cap, deferred preferred items top up the list. Ordering remains score-driven. The response shall include `learningMode` and `preferredCount`, and each item a `preferred` boolean. |
| **FR-045** | System | Every `video` item in the feed shall be enriched on demand: when the underlying material lacks a real `youtube.com/watch?v=`/`youtu.be/` URL, the agent shall resolve one for `"<course title> <module title> tutorial"` and persist it to the material's `videoUrl` and `linkUrl`, retrying transient database errors up to 3 times with linear backoff (1 s, 2 s, 3 s). Enrichment shall be best-effort: failures return the item unchanged. |
| **FR-046** | System | Every `audio` item shall be enriched with a curated `linkUrl` (a topic-specific search URL) when it has none, persisted best-effort. |
| **FR-047** | System | YouTube resolution shall fetch the public search-results page with a browser `User-Agent`, extract the first 11-character `videoId` from the HTML, and return a canonical watch URL; it shall abort after **7 seconds** (`AbortSignal.timeout(7000)`) and return `null` on any non-OK response, missing match, or error. |
| **FR-048** | System | Module-level augmentation shall apply to `GET /api/modules/course/:courseId` and `GET /api/modules/:id` when — and only when — the request carries a valid token **and** `req.user.role === 'student'` **and** `preferences.learningMode` is set. |
| **FR-049** | System | Augmentation shall append virtual materials so the module shows **at least 3** (`AUGMENT_TARGET`) items of the preferred formats: video learners receive `video` items built from `"<course> <module> <full lecture|tutorial explained|examples walkthrough>"`; audio learners receive `audio` items from `"<course> <module> <audio lesson|podcast episode|explained out loud>"`; text learners receive `document` items whose description is a labelled reading split of the module's real `Module.content` (paragraphs ≥ 80 chars), padded with `link` items (a Google *study guide* search) when the content cannot be split. |
| **FR-050** | System | Augmented items shall be **virtual only**: they are plain objects appended to the response payload (marked `_augmented: true`, with ids of the form `<moduleId>-aug-<type>-<n>` and orders after the persisted materials) and shall **never** be written to the `Materials` table, so the shared catalogue is unchanged for other learners. Existing non-preferred materials shall be preserved (only the preferred count rises). |
| **FR-051** | System | Augmented video URLs shall be resolved sequentially per module and cached in an in-process map keyed `<moduleId>:<query>` so repeated module views do not re-fetch; a resolution failure degrades to the search-results link rather than failing the request. |
| **FR-052** | All | The module GETs shall use **optional** authentication: an absent or invalid token shall not produce 401 and shall leave `req.user` unset, so anonymous and instructor/lecturer/admin callers receive the un-augmented catalogue. |

### 3.6 Agents

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-053** | System | The **assessment agent** (`agents/assessmentAgent.js`) shall resolve a course's question bank by normalized (lower-cased, trimmed) title with substring matching, covering the seeded catalogue, and fall back to a generic 10-question bank. When an AI client exists it may generate questions instead, topping up from the bank to reach exactly 10. |
| **FR-054** | System | The assessment agent shall tag every question with a topical label (index-aligned per bank, with generic labels otherwise) and map each question to the best-matching course module by token-overlap score; questions that match nothing shall be distributed to the least-loaded modules so every module is covered. |
| **FR-055** | System | The **evaluation agent** (`agents/evaluationAgent.js`) shall provide both a stateless `evaluateAnswers` and a detailed `evaluateDetailed` producing the per-question breakdown and the weakness list consumed by the learner and recommendation agents. |
| **FR-056** | System | The **recommendation agent** (`agents/recommendationAgent.js`) shall map a percentage to a level and to a module pick (first / middle / last), and shall rank modules to review by missed-question count. |
| **FR-057** | System | The **learner-modelling agent** (`agents/learnerModellingAgent.js`) shall be deterministic, perform no external model calls, and produce the aggregate model described in FR-035 to FR-037. |
| **FR-058** | System | The **content/resource agent** (`agents/contentResourceAgent.js`) shall own the material catalogue recommendation, the on-demand video/audio enrichment, the module augmentation, and batch video attachment (`attachCourseVideos` in batches of 5, idempotent: modules already holding a real watch URL are skipped). |
| **FR-059** | System | The **assistant agent** (`agents/assistantAgent.js`) shall answer as "Ifeanyi" using a fixed system prompt (friendly, structured, never invents facts), sending prior history as plain `{ role, content }` chat messages plus the current turn's text and, when present, an inline base64 `image_url` part. |
| **FR-060** | System | The **assessment store** (`agents/assessmentStore.js`) shall be a single in-process `Map` keyed by a random UUID (`crypto.randomUUID`), shared by the enrollment gate and the assessment controller so an assessment started while enrolling can be completed via `POST /api/assessment/submit`. Its state is per-process and lost on restart (documented limitation). |
| **FR-061** | System | All agents shall degrade deterministically when no AI client is configured or when a provider call fails: the assessment agent uses the question bank, the assistant returns a scripted offline reply. No agent shall surface a raw provider error to the client. |

### 3.7 AI Assistant ("Ifeanyi")

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-062** | Student | The system shall accept an assistant turn (`POST /api/assistant/chat`, authenticated, student-only) as text, an image, or both; 400 when neither is present. An optional image is uploaded through the avatar uploader (field `image`, image MIME types only, 5 MB cap). |
| **FR-063** | System | The assistant shall be given context from the student's transcript: the most recent `8 × 2` `AssistantMessage` rows (oldest-first) reduced to `{ role, content }`. |
| **FR-064** | Student | The system shall persist both turns as `AssistantMessage` rows with `role` `user` (content, or `Shared an image` when only an image was sent, plus `/uploads/<file>` in `imageUrl`) and `role` `assistant`, and return 201 with both records. |
| **FR-065** | Student | The system shall return the conversation (`GET /api/assistant/history`, authenticated, student-only) as up to 100 messages in ascending creation order. |
| **FR-066** | Student | When offline, the assistant shall return a helpful scripted reply that acknowledges the situation, handles greetings, help requests and course questions, and explicitly states it cannot read a shared image. |

### 3.8 Quizzes

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-067** | All | The system shall list a course's active quizzes (`GET /api/quizzes/course/:courseId`) and a single quiz (`GET /api/quizzes/:id`, 404 when absent), **removing `correctAnswer` from every question** in both responses. |
| **FR-068** | Instructor, Lecturer, Admin | The system shall create, update and delete quizzes for a course the caller owns or is an admin of (403 otherwise): `type` ∈ `quiz|test|exam` (default `quiz`), `timeLimit` optional, `maxAttempts` default 1, `passingScore` default 70, `isActive` default true. Deleting a quiz shall first delete its attempts. |
| **FR-069** | Student | The system shall record an attempt (`POST /api/quizzes/:quizId/submit`): 404 unknown quiz, 400 when `maxAttempts` is already reached, otherwise auto-grade by summing `question.points`, store `{ questionIndex, selectedAnswer, isCorrect }` per answer, `score`, `totalPoints`, `percentage`, `passed` (`percentage >= passingScore`), and `timeSpent`, and additionally log a `quiz_attempt` `ActivityLog` row. |
| **FR-070** | Student | The system shall return the caller's attempts (`GET /api/quizzes/my-attempts`) with the parent quiz's `id`, `title`, `passingScore`, newest first. |
| **FR-071** | Instructor, Lecturer, Admin (owner) | The system shall list all attempts for a quiz (`GET /api/quizzes/:quizId/attempts`) for the owning instructor or an admin (403 otherwise), newest first. |

### 3.9 Assignments and Submissions

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-072** | All | The system shall list a course's active assignments ordered by due date (`GET /api/assignments/course/:courseId`) with the instructor, and return a single assignment with its instructor and submissions (`GET /api/assignments/:id`, 404 when absent). |
| **FR-073** | Instructor, Lecturer, Admin (owner) | The system shall create and update assignments (`POST /api/assignments/course/:courseId`, `PUT /api/assignments/:id`) with title, description, instructions, due date, `maxPoints` (default 100) and up to 5 attachment files (multipart field `attachments`); delete (`DELETE /api/assignments/:id`) for the owner or an admin (403 otherwise). |
| **FR-074** | Student | The system shall record a submission (`POST /api/assignments/:assignmentId/submit`, authenticated) with up to 5 files (multipart field `files`), optional comments, and `isLate` derived from the due date; `submittedAt` defaults to now. |
| **FR-075** | Instructor, Lecturer, Admin (owner) | The system shall list an assignment's submissions (`GET /api/assignments/:assignmentId/submissions`) and grade one (`PUT /api/assignments/submissions/:submissionId/grade`) for the owning instructor or an admin (403 otherwise), storing `grade`, `feedback`, `gradedById` and `gradedAt`. |
| **FR-076** | Student | The system shall return the caller's own submissions, newest first, with the assignment's `id`, `title`, `dueDate` and `maxPoints` — exposed by the handler `getMySubmissions`. **Known defect (route-order):** the endpoint is registered at `GET /api/assignments/my-submissions` *after* `GET /api/assignments/:id`, so Express matches `:id` first and the literal path is shadowed: the request is handled by `getAssignmentById` with `id = 'my-submissions'`, which returns 404 instead of the submission list. Registering all literal routes before `/:id` in the same router is the required fix (the same defect was already fixed for `quizzes.js` `/my-attempts` and `courses.js` `/my-courses`, `/instructor-courses`). |

### 3.10 Gradebook and CGPA

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-077** | Student, Instructor, Lecturer, Admin | The system shall return a course gradebook (`GET /api/gradebook/course/:courseId`, authenticated): instructors, lecturers and admins receive all students' entries ordered by `overallGrade` descending; a student receives only their own entry. |
| **FR-078** | Instructor, Lecturer, Admin (owner) | The system shall update a gradebook entry (`PUT /api/gradebook/:id`) or recalculate it (`POST /api/gradebook/course/:courseId/calculate`, body `studentId`) for the owning instructor or an admin (403 otherwise). Recalculation shall build `assignmentGrades` and `quizGrades` arrays, compute `overallGrade = earnedPoints / totalAssignmentPoints × 100`, set `lastUpdated`, and create the row when absent (the `(courseId, studentId)` pair is unique). |
| **FR-079** | Student | The system shall return the caller's grades across courses (`GET /api/gradebook/my-grades`) with course `id`, `title`, `description`, ordered by `overallGrade` descending. |
| **FR-080** | Student | The system shall return a credit-weighted CGPA (`GET /api/gradebook/cgpa`) on a 5.0 scale: ≥ 70 → 5, ≥ 60 → 4, ≥ 50 → 3, ≥ 45 → 2, ≥ 40 → 1, else 0; the response shall include `cgpa` (rounded to 2 decimals, `null` with no credits), `scale: '5.0'`, `totalCredits` and the per-course breakdown including `credits`. |

### 3.11 Forums, Threads, and Replies

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-081** | All | The system shall list a course's forums (`GET /api/forums/course/:courseId`), a forum's threads (`GET /api/forums/:forumId/threads`, pinned first then newest), and a thread with its replies (`GET /api/forums/threads/:id`, 404 when absent). |
| **FR-082** | Instructor, Lecturer, Admin | The system shall create a forum for a course (`POST /api/forums/course/:courseId`) and toggle a thread's pinned (`PUT /api/forums/threads/:id/pin`) and locked (`PUT /api/forums/threads/:id/lock`) state. |
| **FR-083** | Authenticated user | The system shall create a thread (`POST /api/forums/:forumId/threads`, 403 for a locked forum if enforced by the controller) recording title, content and `courseId`, and shall increment the author's `forumPostCount`. |
| **FR-084** | Authenticated user | The system shall create a reply (`POST /api/forums/threads/:threadId/replies`) with optional `parentReplyId` for nesting; a locked thread yields 400 and no reply; the author's `forumPostCount` is incremented. |
| **FR-085** | All | The system shall increment `Thread.viewCount` when a thread is read. |

### 3.12 Messaging

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-086** | Authenticated user | The system shall list addressable users (`GET /api/messages/users`) and the caller's conversation (`GET /api/messages`) — messages where the caller is sender or recipient, with per-side deletion flags applied. |
| **FR-087** | Authenticated user | The system shall send a message (`POST /api/messages`) to a recipient resolved by email, with required subject and content. |
| **FR-088** | Authenticated user | The system shall read a message (`GET /api/messages/:id`, restricted to sender/recipient), reply to it (`POST /api/messages/:id/reply`, creating a new message referencing the thread), mark it read (`PUT /api/messages/:id/read`, setting `isRead` and `readAt`), and delete it (`DELETE /api/messages/:id`, setting the caller's own deletion flag). |
| **FR-089** | Authenticated user | The system shall return the unread message count (`GET /api/messages/unread-count`). |

### 3.13 Activity, Consistency, and Leaderboard

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-090** | Student | The system shall log an activity (`POST /api/activity`, authenticated) requiring a valid `courseId` (404 unknown) and `activityType` ∈ `module_view|quiz_attempt|assignment_submit` (400 otherwise); `moduleId`, when supplied, must exist (404); `timeSpent` is clamped to 0…86400 seconds and `performedAt` set to now. |
| **FR-091** | Student | The system shall summarize the caller's own activity (`GET /api/activity/my`): total activities, distinct active days (overall, last 7, last 30), `currentStreak`, `longestStreak`, last active date, a 14-day activity series with per-day counts and an `active` flag, counts by type, and a consistency score = `daysActive7/7 × 50 + daysActive30/30 × 30 + min(currentStreak/21, 1) × 20`, capped at 100. |
| **FR-092** | Instructor, Lecturer, Admin (owner) | The system shall produce a per-course consistency report (`GET /api/reports/courses/:courseId/consistency`) for the owning instructor or an admin (403 otherwise): per-student summaries plus modules viewed/total/percent, and course aggregates `totalStudents`, `activeStudents`, `engagedStudents`, `averageScore` and `averageModules`. |
| **FR-093** | All roles | The system shall return a leaderboard (`GET /api/leaderboard`) available to `student`, `instructor`, `lecturer` and `admin`, listing the **top 5** active students ranked by a composite of 50 % normalized engagement (total logged time, normalized against the highest total) and 50 % academics (mean of best quiz percentage, graded assignment percentages clamped to 0–100, and gradebook overall grades), with `rank`, `totalTimeSpent`, `quizzesTaken`, `assignmentsGraded` and `academicScore`. |

### 3.14 Reports

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-094** | Instructor, Lecturer, Admin (owner) | The system shall return a course progress report (`GET /api/reports/courses/:courseId/progress`) for the owner or an admin: per-student assignment and quiz completion counts/percentages plus `overallGrade`, with course `averageGrade` and `totalStudents`. |
| **FR-095** | Instructor, Lecturer, Admin (owner) | The enrollment (`/api/reports/courses/:courseId/enrollment`) and participation (`/api/reports/courses/:courseId/participation`) reports are **stubs**: they enforce authorization and return the course identity with zeroed counters and empty student lists, flagged by the message `… requires junction table setup`. |
| **FR-096** | Instructor, Lecturer, Admin | The system shall return an instructor dashboard (`GET /api/reports/instructor/dashboard`, `isInstructorOrAdmin` at the router plus an in-handler role check accepting instructor/lecturer/admin) with `totalCourses`, distinct `totalStudents`, `totalAssignments`, `totalQuizzes`, per-course enrolled-student counts, and the 10 most recent submissions and quiz attempts. |
| **FR-097** | Admin | The system shall return an admin dashboard (`GET /api/reports/admin/dashboard`) with `totalUsers`, `totalCourses`, `totalStudents`, `totalInstructors` and a user distribution by role. |

### 3.15 Administration

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-098** | Admin | The system shall manage users: list (`GET /api/admin/users`), read one (`/users/:id`), create (`POST /api/admin/users`), update (`PUT /api/admin/users/:id`), delete (`DELETE /api/admin/users/:id`) and toggle activation (`PUT /api/admin/users/:id/toggle-status`). |
| **FR-099** | Admin | The system shall manage courses administratively: list all (`GET /api/admin/courses`), assign an instructor (`PUT /api/admin/courses/:id/assign`) and toggle a course's active status (`PUT /api/admin/courses/:id/status`). |
| **FR-100** | Admin | All administration endpoints shall be guarded by `auth` plus `isAdmin`; a valid non-admin token receives 403. |

### 3.16 Platform Behaviour, Onboarding, and Cross-Cutting Functionality

| ID | Actor | Requirement |
| --- | --- | --- |
| **FR-101** | All | The system shall expose `GET /api/health` returning `{ success: true, message: 'Server is running', timestamp }` and `GET /` returning service identity (`version: '1.0.0'`) with an endpoint map. **Observation:** the root map lists 15 of the 17 mounted routers — `/api/activity` and `/api/leaderboard` are missing. |
| **FR-102** | All | The system shall return 404 JSON `{ success: false, message: 'Route not found' }` for unmatched routes and route all thrown errors through a single global error handler that maps validation, JWT, upload and `statusCode` failures to 4xx responses and otherwise returns 500 (with a stack only in development). |
| **FR-103** | New user | After sign-in the SPA shall present a four-step onboarding guide (Welcome → Enroll in a course → Learn your way → Stay on track) with progress dots, previous/next/skip/done actions, shown only on the student/instructor/admin dashboards and dismissed permanently per account via a user-scoped local storage key. |
| **FR-104** | Student | The SPA shall expose a learning-preferences screen where the student picks `text`, `audio` or `video` at any time, persisting the choice through `PUT /api/learner/preferences`; this preference is the single input that drives both the content feed mix and module augmentation. |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement |
| --- | --- |
| **NFR-001** | Health and root endpoints shall answer without touching the database (`GET /api/health`, `GET /`) so availability probes are cheap and independent of database state. |
| **NFR-002** | Read-heavy aggregates shall issue their independent queries concurrently (`Promise.all`), as done in the learning path, instructor dashboard, leaderboard and learner model. |
| **NFR-003** | Catalogue recommendations shall bound their working set: at most 300 materials per recommendation run, `MAX_RECOMMENDATIONS = 8` items returned, at most 3 module recommendations, at most 6 weakness areas, leaderboard top 5. |
| **NFR-004** | Outbound third-party calls shall be bounded: YouTube resolution aborts after 7 s; module augmentation resolves sequentially per module and caches results per `<moduleId>:<query>`, so a course's first augmented view is the only one that pays network cost. |
| **NFR-005** | Video URL persistence shall tolerate transient database pool failures with up to 3 attempts and linear backoff, so a cold pooled connection cannot abort a whole course run; one module's failure shall never fail the rest. |
| **NFR-006** | Request bodies shall be accepted up to 10 MB and responses compressed via `compression()`, with static upload files served directly by Express static rather than through controllers. |

### 4.2 Security and Privacy

| ID | Requirement |
| --- | --- |
| **NFR-007** | Passwords shall never be stored or logged in clear text: bcrypt hashing with a 10-round salt at save time; reset tokens shall be persisted only as SHA-256 hashes with a 10-minute expiry; JWTs and secrets come exclusively from environment variables. |
| **NFR-008** | All protected endpoints shall require a valid `Authorization: Bearer <jwt>` and re-load the user from the database on every request, so a deleted or deactivated account cannot continue to use an issued token. |
| **NFR-009** | Authorization shall be enforced in two layers: route-level RBAC (`authorize(...roles)`) plus in-controller ownership checks (`course.instructorId === req.user.id || role === 'admin'`) on every content mutation and course-scoped report. |
| **NFR-010** | Assessment answer keys shall never reach the client before submission; quiz `correctAnswer` fields shall be stripped from list and detail responses; the assistant shall read images from the server-side upload path rather than an arbitrary client URL. |
| **NFR-011** | Transport hardening shall be applied by default: `helmet()` security headers, an explicit CORS allow-list built from `CLIENT_URL(S)`, `FRONTEND_URL(S)` and `CORS_ORIGIN(S)` with normalization (bare domains → HTTPS, `localhost` → HTTP, trailing slashes stripped, comma-separated values supported) and `credentials: true`, plus IP rate limiting on `/api/` (100 requests / 15 minutes by default, configurable). |
| **NFR-012** | Uploads shall be constrained by MIME allow-list and size, with a separate stricter image-only, 5 MB uploader for avatars and assistant images; filenames are generated server-side (timestamp + random) rather than trusted from the client. |
| **NFR-013** | User-supplied search text shall be parameterized and its `LIKE` wildcards escaped to prevent wildcard injection and pattern-based denial of service. |
| **NFR-014** | **Known exposure to remediate:** several read endpoints are intentionally unauthenticated (course list/detail, module/material list/detail, quiz list/detail, assignment list/detail, forum/thread reads), and `GET /api/assignments/:id` returns the assignment's `submissions` collection to anonymous callers. `backend/AGENTS.md` also documents that `middleware/errorHandler.js` still carries Mongoose-specific branches although the ORM is Sequelize. These are recorded as accepted current behaviour with remediation candidates, not as implemented protections. |

### 4.3 Reliability and Availability

| ID | Requirement |
| --- | --- |
| **NFR-015** | The service shall degrade rather than fail: no AI key or a provider error yields deterministic agent behaviour (question banks, scripted assistant replies); YouTube failure yields search links; assessment persistence failure yields `attemptId: null` while grading still succeeds; course/module lookup failure during assessment shall not prevent grading. |
| **NFR-016** | The API shall start listening only after `connectDB()` resolves; on failure the error is rethrown rather than serving traffic against a broken connection. Unhandled promise rejections shall be logged and shall close the server before exiting with code 1. |
| **NFR-017** | Requests shall never terminate the process: all controller work is wrapped in try/catch and forwarded to `next(error)` for uniform formatting. |
| **NFR-018** | Schema creation shall be idempotent via `sequelize.sync()` on boot. **Limitation:** sync has no migration story, and the deployed Postgres sequences have drifted in the past (rows imported with explicit ids), which required `setval` repairs; sequence health is an operational responsibility. |
| **NFR-019** | Availability monitoring shall use `GET /api/health` and key on `success`, not on a `status` field, which the endpoint does not return. |
| **NFR-020** | **Known single-process limitation:** active placement assessments live in an in-memory `Map` (`assessmentStore`). A restart, or a request routed to a different serverless instance, invalidates an in-flight `assessmentId` and the client receives 404 "Assessment not found or expired. Please start again." Horizontal scale-out of the assessment flow requires shared state. |

### 4.4 Scalability

| ID | Requirement |
| --- | --- |
| **NFR-021** | The API shall be horizontally scalable behind Vercel; connection pressure shall be bounded by sizing the Sequelize pool to **1** connection when `VERCEL=1` (5 otherwise) with `acquire`/`idle` of 10 s, preventing many short-lived instances from exhausting the hosted database's connection limit. |
| **NFR-022** | Frequently filtered columns shall be indexed: composite indexes on `Enrollment(courseId, studentId)` (unique) and `(studentId)`, `Gradebook(courseId, studentId)` (unique) and `(studentId)`, `Submission(assignmentId, studentId)` and `(studentId)`, `QuizAttempt(quizId, studentId)` and `(studentId)`, `AssessmentAttempt(studentId, courseId)` and `(studentId)`, `Message(senderId, createdAt)` and `(recipientId, isRead, createdAt)`, `ActivityLog(studentId, courseId)`, `(courseId, performedAt)`, `(studentId, performedAt)`, `Module(courseId, order)`, `Material(moduleId, order)`, `Thread(forumId, createdAt)`, `(authorId)`, `Reply(threadId, createdAt)`, `Assignment(courseId, dueDate)`, `Quiz(courseId, isActive)`, `Course(instructorId, isActive)`, `AssistantMessage(studentId, createdAt)`. |
| **NFR-023** | Per-user endpoints shall be naturally partitioned by the authenticated user id, so concurrency grows with users rather than with shared mutable server state (the single exception being the assessment store, NFR-020). |

### 4.5 Maintainability

| ID | Requirement |
| --- | --- |
| **NFR-024** | The backend shall keep a strict layering: thin `routes/*` (method + path + inline middleware only), one `exports.handler = async (req, res, next)` per controller action with try/catch and `next(error)`, one PascalCase model file per entity with associations centralised in `models/index.js`, and `services/` reserved for external integrations. |
| **NFR-025** | All backend code shall be CommonJS with `require`/`module.exports`, semicolons, single quotes and 2-space indentation, matching the existing files; ESM syntax is prohibited. |
| **NFR-026** | Middleware shall compose in a fixed order: security → CORS → compression → rate limit → body parsers → static uploads → routers → 404 → global error handler (last). |
| **NFR-027** | Configuration shall come from environment variables with sane fallbacks, never hardcoded; `.env` shall never be committed, and secrets shall never be logged. |
| **NFR-028** | Errors shall be constructed as `const err = new Error(msg); err.statusCode = 4xx; next(err)` so the global handler formats them uniformly; handlers shall pick request fields explicitly rather than spreading `req.body` into a model. |
| **NFR-029** | Backend scripts (`db:seed`, `generate-content`, `attach-videos`) shall be idempotent so a partial run can be repeated safely; they shall load `dotenv` before touching `config/database.js`. |
| **NFR-030** | The frontend shall keep its design system in CSS variable tokens consumed by semantic utility classes, so theme changes do not require per-file edits, and shall pass `npm run lint` and `npm run build` (Vite production build) as release gates. |

### 4.6 Usability

| ID | Requirement |
| --- | --- |
| **NFR-031** | Responses shall be consistent and machine-checkable: successes carry `success: true` plus the payload; failures carry a human-readable `message`; list responses carry a `count`. |
| **NFR-032** | Feedback shall be actionable: assessment results must show the per-question breakdown, which questions were missed, the missed module counts and topics, whether the timer expired, and the recommended module to study next. |
| **NFR-033** | Recommendations shall always explain themselves: each feed item carries a `reason` string and a `preferred` flag so the learner can see why a resource was offered and whether it matches their style. |
| **NFR-034** | The SPA shall adapt to viewport size (collapsible sidebar, icon rail on `md+`, drawer on mobile) and shall support light and dark themes driven by tokens, with system-preference detection. |
| **NFR-035** | Destructive and long-running flows shall be explicit and resumable: assessment sessions are resumable until submitted or restarted, submissions and quiz attempts are recoverable from "my" endpoints, and clients are told when a resource is unavailable rather than shown an empty control. |

### 4.7 Compatibility and Portability

| ID | Requirement |
| --- | --- |
| **NFR-036** | The client contract shall be HTTP/1.1+ JSON over HTTPS with `Authorization: Bearer` headers and `multipart/form-data` only for uploads; no client-side cookies are required for authentication. |
| **NFR-037** | The frontend shall run on any modern evergreen browser supporting ES modules, React 19, and CSS features used by Tailwind CSS 4; the API shall run on Node.js ≥ 18 (it uses global `fetch`, `AbortSignal.timeout`, `crypto.randomUUID`). |
| **NFR-038** | The database contract shall be PostgreSQL over a TLS connection (`ssl.require = true`), which is what the deployed Neon instance provides; schema creation is handled by Sequelize `sync()`. |
| **NFR-039** | The AI provider contract shall be OpenAI-compatible chat completions, so the provider can be switched with `AI_PROVIDER`/`AI_BASE_URL`/`AI_MODEL` (default Groq, `llama-3.3-70b-versatile`) without code changes; a vision-capable model (e.g. a `-vision-preview` variant) is required for Ifeanyi to answer photo questions, since a text-only model errors on `image_url` parts and silently falls back to the offline reply. |

### 4.8 Data Integrity

| ID | Requirement |
| --- | --- |
| **NFR-040** | Referential integrity shall be declared at the model level: every foreign key carries a `references` clause, and cascading behaviour is implemented explicitly in controllers (deleting a module deletes its materials; deleting a quiz deletes its attempts). |
| **NFR-041** | Uniqueness shall be enforced in the schema: `User.email`, `Enrollment(courseId, studentId)`, `Gradebook(courseId, studentId)`. Enrollment is created idempotently with `findOrCreate` so the assessment path cannot duplicate a row. |
| **NFR-042** | Domain validity shall be enforced by Sequelize validators and enums: non-empty titles/descriptions, email format, password length ≥ 6, `difficulty` ∈ beginner/intermediate/advanced, `Material.type` ∈ document/image/video/audio/link, `Quiz.type` ∈ quiz/test/exam, `Enrollment.status` ∈ active/completed/dropped, `ActivityLog.activityType` ∈ module_view/quiz_attempt/assignment_submit, `Course.credits` ∈ 1…8, `AssistantMessage.role` ∈ user/assistant. |
| **NFR-043** | Percentage values shall be persisted as `DECIMAL(5,2)` and computed defensively: divisions guard against zero denominators, percentages derived from grades are clamped to 0–100, and a `100` default is used when an assignment's `maxPoints` is missing. |
| **NFR-044** | Password hashing shall be applied by a model hook (`beforeSave` when `password` changed) so no code path can persist a clear-text password. |
| **NFR-045** | Personalization shall not mutate shared data: augmentation is response-only (FR-050), so one learner's preferences cannot contaminate the catalogue for another. |

### 4.9 Deployment and Operations

| ID | Requirement |
| --- | --- |
| **NFR-046** | The system shall deploy as a Vercel multi-service project: a `frontend` service rooted at `frontend/` (SPA fallback rewriting `/:path*` → `/index.html`) and a `backend` service rooted at `backend/` with entrypoint `server.js`, with `/api/:path*` and `/uploads/:path*` rewritten to the backend and everything else to the frontend. |
| **NFR-047** | Serverless execution shall be supported: when `VERCEL=1` the process shall not call `app.listen` (the platform serves the exported `app`), the pool shall shrink to one connection, and `api/index.js` shall re-export the backend app as the serverless entry. |
| **NFR-048** | Uploads shall be served from the backend service at `/uploads`; **limitation:** multer writes to the local filesystem (`UPLOAD_PATH`), so on serverless hosts files are ephemeral and only as durable as the instance — object storage is a deployment requirement for production durability. |
| **NFR-049** | Environment configuration shall be supplied per environment (see `backend/.env.example`): `PORT`, `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRE`, `CLIENT_URL(S)`, `EMAIL_*`, `MAX_FILE_SIZE`, `UPLOAD_PATH`, `RATE_LIMIT_*`, `AI_PROVIDER`/`AI_BASE_URL`/`GROQ_API_KEY`/`AI_MODEL`. `.env` and `.env.*` (except the example) are excluded by `.vercelignore` and must never be committed. |
| **NFR-050** | Deployment verification shall use `GET /api/health` keyed on `success`, allowing a long wait window because Sequelize `sync()` can take on the order of a minute against a hosted database on first boot. |
| **NFR-051** | Verification commands shall be standardized: backend boot `npm run dev`/`node server.js` plus the health probe; backend tests `npm test` (Jest — note the suite is currently empty); frontend `npm run lint` and `npm run build`. |

### 4.10 Design and Implementation Constraints (restated as NFRs)

| ID | Requirement |
| --- | --- |
| **NFR-052** | The backend shall be CommonJS-only, Node.js ≥ 18, and shall rely on global `fetch` rather than adding an HTTP client dependency for third-party calls. |
| **NFR-053** | Third-party integrations shall be optional and non-blocking at startup: no AI key means `client === null`, and no YouTube API key is required because discovery uses the public search page. |
| **NFR-054** | Documented but currently unused dependencies (`express-validator`, `pg-hstore`) shall not be treated as enforced guarantees; input validation today is explicit controller checks plus Sequelize validators. |

---

## Appendix A — API Mount Map

All routers are mounted in `backend/server.js`. **17 routers** are mounted plus two non-router endpoints.

| # | Mount path | Router file | Endpoints |
| --- | --- | --- | --- |
| 1 | `/api/auth` | `routes/auth.js` | `POST /register`, `POST /login`, `POST /forgot-password`, `POST /reset-password/:token`, `GET /me`\*, `PUT /update-password`\* |
| 2 | `/api/courses` | `routes/courses.js` | `GET /`\*, `GET /my-courses`\*, `GET /instructor-courses`\*†, `GET /:id/learning-path`\*, `GET /:id`, `POST /enroll/:id`\*, `POST /`\*‡, `PUT /:id`\*‡, `DELETE /:id`\*‡ |
| 3 | `/api/modules` | `routes/modules.js` | `GET /course/:courseId`§, `GET /:id`§, `POST /course/:courseId`\*‡, `PUT /:id`\*‡, `DELETE /:id`\*‡ |
| 4 | `/api/materials` | `routes/materials.js` | `GET /module/:moduleId`, `GET /:id`, `POST /module/:moduleId`\*‡¶, `PUT /:id`\*‡¶, `DELETE /:id`\*‡ |
| 5 | `/api/forums` | `routes/forums.js` | `GET /course/:courseId`, `GET /:forumId/threads`, `GET /threads/:id`, `POST /:forumId/threads`\*, `POST /threads/:threadId/replies`\*, `POST /course/:courseId`\*‡, `PUT /threads/:id/pin`\*‡, `PUT /threads/:id/lock`\*‡ |
| 6 | `/api/assignments` | `routes/assignments.js` | `GET /course/:courseId`, `GET /:id`, `POST /:assignmentId/submit`\*¶, `GET /my-submissions`\* **(shadowed — see FR-076)**, `POST /course/:courseId`\*‡¶, `PUT /:id`\*‡¶, `DELETE /:id`\*‡, `GET /:assignmentId/submissions`\*‡, `PUT /submissions/:submissionId/grade`\*‡ |
| 7 | `/api/quizzes` | `routes/quizzes.js` | `GET /course/:courseId`, `GET /my-attempts`\*, `POST /:quizId/submit`\*, `GET /:id`, `POST /course/:courseId`\*‡, `PUT /:id`\*‡, `DELETE /:id`\*‡, `GET /:quizId/attempts`\*‡ |
| 8 | `/api/gradebook` | `routes/gradebook.js` | `GET /my-grades`\*, `GET /cgpa`\*, `GET /course/:courseId`\*, `PUT /:id`\*‡, `POST /course/:courseId/calculate`\*‡ |
| 9 | `/api/messages` | `routes/messages.js` | `GET /`\*, `GET /users`\*, `GET /unread-count`\*, `GET /:id`\*, `POST /`\*, `POST /:id/reply`\*, `PUT /:id/read`\*, `DELETE /:id`\* |
| 10 | `/api/reports` | `routes/reports.js` | `GET /courses/:courseId/enrollment`\*‡, `GET /courses/:courseId/progress`\*‡, `GET /courses/:courseId/participation`\*‡, `GET /courses/:courseId/consistency`\*‡, `GET /instructor/dashboard`\*‡, `GET /admin/dashboard`\*§Admin |
| 11 | `/api/admin` | `routes/admin.js` | `GET /users`\*§Admin, `GET /users/:id`\*§Admin, `POST /users`\*§Admin, `PUT /users/:id`\*§Admin, `DELETE /users/:id`\*§Admin, `PUT /users/:id/toggle-status`\*§Admin, `GET /courses`\*§Admin, `PUT /courses/:id/assign`\*§Admin, `PUT /courses/:id/status`\*§Admin |
| 12 | `/api/assessment` | `routes/assessmentRoutes.js` | `POST /start`\*, `POST /submit`\*, `POST /evaluate`\*, `POST /recommend`\* |
| 13 | `/api/settings` | `routes/settings.js` | `GET /me`\*, `PUT /me`\*, `PUT /me/avatar`\*¶ |
| 14 | `/api/activity` | `routes/activity.js` | `POST /`\*, `GET /my`\* |
| 15 | `/api/leaderboard` | `routes/leaderboard.js` | `GET /`\* (authorize: student, instructor, lecturer, admin) |
| 16 | `/api/assistant` | `routes/assistant.js` | `POST /chat`\*§Student¶, `GET /history`\*§Student |
| 17 | `/api/learner` | `routes/learner.js` | `GET /model`\*§Student, `GET /recommendations`\*§Student, `GET /insights`\*§Student, `PUT /preferences`\*§Student |

Non-router endpoints, registered after the routers:

| Path | Purpose | Response |
| --- | --- | --- |
| `GET /api/health` | Liveness probe (FR-101) | 200 `{ success, message: 'Server is running', timestamp }` |
| `GET /` | Service identity + endpoint map | 200 `{ success, message: 'Education Platform API', version: '1.0.0', endpoints: {…15 entries…} }` |
| `*` (all others) | 404 handler | 404 `{ success: false, message: 'Route not found' }` |
| error path | Global error handler (last) | Formatted 4xx/5xx JSON |

**Legend:** `*` = requires `auth`; `†` = `isInstructor`; `‡` = `isInstructorOrAdmin`; `§` = `authOptional`; `§Admin` = `isAdmin`; `§Student` = `isStudent`; `¶` = multer upload handler.

**Mount-order observations**

1. `GET /api/assignments/my-submissions` is declared **after** `GET /api/assignments/:id`, so the literal path is shadowed and never reaches `getMySubmissions` (FR-076). Correct fix: move the literal route above `/:id`.
2. The literal routes that were already corrected and must stay first: `courses.js` (`/my-courses`, `/instructor-courses` before `/:id`, and `/:id/learning-path` before `/:id`), `quizzes.js` (`/my-attempts` before `/:id`), `modules.js` (`/course/:courseId` before `/:id`).
3. `GET /` advertises 15 routers; `/api/activity` and `/api/leaderboard` are mounted but not advertised.

---

## Appendix B — RBAC Matrix

### B.1 Role definitions

| Middleware | Definition | Allowed roles |
| --- | --- | --- |
| `auth` | Verify `Authorization: Bearer <jwt>`, load `User` by `decoded.id`, attach `req.user`; 401 when the token is missing/invalid or the user no longer exists. | any authenticated role |
| `auth.authOptional` | Same verification, but never rejects: no token → `req.user` unset; invalid token → ignored; continues. | any (including anonymous) |
| `authorize(...roles)` | 401 when `req.user` is unset; 403 when `req.user.role` is not in the list. | per call |
| `isInstructorOrAdmin` | `authorize('instructor','lecturer','admin')` | instructor, lecturer, admin |
| `isInstructor` | `authorize('instructor')` | instructor |
| `isLecturer` | `authorize('lecturer')` | lecturer |
| `isInstructorOrLecturer` | `authorize('instructor','lecturer')` | instructor, lecturer |
| `isLecturerOrAdmin` | `authorize('lecturer','admin')` | lecturer, admin |
| `isAdmin` | `authorize('admin')` | admin |
| `isStudent` | `authorize('student')` | student |

### B.2 Endpoint × role matrix

Legend: ✔ allowed · ✖ forbidden (403) · — not applicable/unused by this role · **A** owner-or-admin check inside the controller.

| Endpoint | Anonymous | Student | Instructor | Lecturer | Admin | Middleware |
| --- | --- | --- | --- | --- | --- | --- |
| `POST /api/auth/register` | ✔ | ✔ | ✔ | ✔ | ✔ | public |
| `POST /api/auth/login` | ✔ | ✔ | ✔ | ✔ | ✔ | public |
| `POST /api/auth/forgot-password` | ✔ | ✔ | ✔ | ✔ | ✔ | public |
| `POST /api/auth/reset-password/:token` | ✔ | ✔ | ✔ | ✔ | ✔ | public |
| `GET /api/auth/me` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` |
| `PUT /api/auth/update-password` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` |
| `GET /api/settings/me`, `PUT /api/settings/me` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` |
| `PUT /api/settings/me/avatar` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` + upload |
| `GET /api/courses` | ✔ | ✔ | ✔ | ✔ | ✔ | public |
| `GET /api/courses/:id` | ✔ | ✔ | ✔ | ✔ | ✔ | public |
| `GET /api/courses/my-courses` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` |
| `GET /api/courses/instructor-courses` | ✖ | ✖ | ✔ | ✖ | ✖ | `auth` + `isInstructor` |
| `GET /api/courses/:id/learning-path` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` (own data) |
| `POST /api/courses/enroll/:id` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` |
| `POST /api/courses` | ✖ | ✖ | ✔ | ✔ | ✔ | `auth` + `isInstructorOrAdmin` |
| `PUT /api/courses/:id` | ✖ | ✖ | **A** | **A** | ✔ | `auth` + `isInstructorOrAdmin` + owner |
| `DELETE /api/courses/:id` | ✖ | ✖ | **A** | **A** | ✔ | `auth` + `isInstructorOrAdmin` + owner |
| `GET /api/modules/course/:courseId` | ✔ | ✔ | ✔ | ✔ | ✔ | `authOptional` (augmented for students) |
| `GET /api/modules/:id` | ✔ | ✔ | ✔ | ✔ | ✔ | `authOptional` |
| `POST/PUT/DELETE /api/modules...` | ✖ | ✖ | **A** | **A** | ✔ | `auth` + `isInstructorOrAdmin` + owner |
| `GET /api/materials/module/:moduleId`, `GET /api/materials/:id` | ✔ | ✔ | ✔ | ✔ | ✔ | public |
| `POST/PUT/DELETE /api/materials...` | ✖ | ✖ | **A** | **A** | ✔ | `auth` + `isInstructorOrAdmin` + owner |
| `GET /api/forums/course/:courseId`, `/:forumId/threads`, `/threads/:id` | ✔ | ✔ | ✔ | ✔ | ✔ | public |
| `POST /api/forums/:forumId/threads` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` |
| `POST /api/forums/threads/:threadId/replies` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` |
| `POST /api/forums/course/:courseId`, pin, lock | ✖ | ✖ | ✔ | ✔ | ✔ | `auth` + `isInstructorOrAdmin` |
| `GET /api/assignments/course/:courseId`, `/:id` | ✔ | ✔ | ✔ | ✔ | ✔ | public |
| `POST /api/assignments/:assignmentId/submit` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` + upload(5) |
| `GET /api/assignments/my-submissions` | ✖ | ✔ (shadowed) | ✔ (shadowed) | ✔ (shadowed) | ✔ (shadowed) | `auth` — **unreachable, FR-076** |
| `POST/PUT/DELETE /api/assignments...` | ✖ | ✖ | **A** | **A** | ✔ | `auth` + `isInstructorOrAdmin` + owner |
| `GET /api/assignments/:assignmentId/submissions` | ✖ | ✖ | **A** | **A** | ✔ | `auth` + `isInstructorOrAdmin` |
| `PUT /api/assignments/submissions/:submissionId/grade` | ✖ | ✖ | **A** | **A** | ✔ | `auth` + `isInstructorOrAdmin` + owner |
| `GET /api/quizzes/course/:courseId`, `/:id` | ✔ | ✔ | ✔ | ✔ | ✔ | public (answers stripped) |
| `GET /api/quizzes/my-attempts` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` |
| `POST /api/quizzes/:quizId/submit` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` |
| `POST/PUT/DELETE /api/quizzes...` | ✖ | ✖ | **A** | **A** | ✔ | `auth` + `isInstructorOrAdmin` + owner |
| `GET /api/quizzes/:quizId/attempts` | ✖ | ✖ | **A** | **A** | ✔ | `auth` + `isInstructorOrAdmin` + owner |
| `GET /api/gradebook/my-grades`, `/cgpa` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` |
| `GET /api/gradebook/course/:courseId` | ✖ | own row only | all rows | all rows | all rows | `auth` + role branch |
| `PUT /api/gradebook/:id` | ✖ | ✖ | **A** | **A** | ✔ | `auth` + `isInstructorOrAdmin` + owner |
| `POST /api/gradebook/course/:courseId/calculate` | ✖ | ✖ | **A** | **A** | ✔ | `auth` + `isInstructorOrAdmin` + owner |
| `GET/POST/PUT/DELETE /api/messages...` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` |
| `POST /api/activity`, `GET /api/activity/my` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` |
| `GET /api/leaderboard` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` + `authorize('student','instructor','lecturer','admin')` |
| `POST /api/assessment/{start,submit,evaluate,recommend}` | ✖ | ✔ | ✔ | ✔ | ✔ | `auth` |
| `GET /api/learner/{model,recommendations,insights}`, `PUT /api/learner/preferences` | ✖ | ✔ | ✖ | ✖ | ✖ | `auth` + `isStudent` |
| `POST /api/assistant/chat`, `GET /api/assistant/history` | ✖ | ✔ | ✖ | ✖ | ✖ | `auth` + `isStudent` |
| `GET /api/reports/courses/:courseId/{enrollment,progress,participation,consistency}` | ✖ | ✖ | **A** | **A** | ✔ | `auth` + `isInstructorOrAdmin` + owner |
| `GET /api/reports/instructor/dashboard` | ✖ | ✖ | ✔ | ✔ | ✔ | `auth` + `isInstructorOrAdmin` |
| `GET /api/reports/admin/dashboard` | ✖ | ✖ | ✖ | ✖ | ✔ | `auth` + `isAdmin` |
| `GET/POST/PUT/DELETE /api/admin/users...`, `/api/admin/courses...` | ✖ | ✖ | ✖ | ✖ | ✔ | `auth` + `isAdmin` |

**Key asymmetries to remember**

- `isInstructorOrAdmin` **includes `lecturer`**; `isInstructor` does **not**. Hence a lecturer can author content but cannot call `GET /api/courses/instructor-courses`.
- `isStudent`-guarded features (learner model, recommendations, insights, preferences, Ifeanyi) are unavailable to every staff role.
- Personalization applies **only** when `req.user.role === 'student'` and `preferences.learningMode` is set — an instructor reading the same module URL with a valid token receives the un-augmented catalogue (FR-052).
- Course-scoped reports and content mutations add an ownership test on top of RBAC, so a lecturer who does not own a course gets 403 even though the RBAC middleware would admit them.
- `GET /api/gradebook/course/:courseId` has no RBAC middleware: it branches on role inside the handler (staff see all, students see only their own row).

---

## Appendix C — Data Model Summary

**17 Sequelize models** (`backend/models/*.js`), all with `id INTEGER PRIMARY KEY AUTO_INCREMENT` and `timestamps`; all associations declared centrally in `backend/models/index.js`.

| # | Model | Table | Key columns | Foreign keys | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `User` | `Users` | `name`, `email` (unique, validated), `password` (bcrypt), `role` ENUM(`student`,`instructor`,`lecturer`,`admin`, default `student`), `avatar`, `lastLogin`, `forumPostCount` (default 0), `isActive`, `passwordResetToken`, `passwordResetExpires`, `preferences` JSON (default `{email:true,push:false,digest:true}`, holds `learningMode`) | — | `beforeSave` hook rehashes on password change; instance methods `comparePassword`, `createPasswordResetToken` (32-byte random, SHA-256 stored, 10-min expiry), `updateLastLogin`, `incrementForumPosts`. |
| 2 | `Course` | `Courses` | `title`, `description`, `thumbnail`, `category` (default `General`), `difficulty` ENUM(`beginner`,`intermediate`,`advanced`), `isActive`, `enrollmentLimit`, `credits` (default 3, validated 1–8) | `instructorId` → `Users.id` | Index `(instructorId, isActive)`. Owner for modules/materials/assignments/quizzes/reports. |
| 3 | `Module` | `Modules` | `title`, `description`, `content` (long-form text used for text-mode augmentation), `order` (default 0), `isActive` | `courseId` → `Courses.id` | Index `(courseId, order)`; ordering is canonical for paths, recommendations and assessment tagging. |
| 4 | `Material` | `Materials` | `title`, `type` ENUM(`document`,`image`,`video`,`audio`,`link`), `fileUrl`, `videoUrl`, `linkUrl`, `description`, `order`, `fileSize`, `isActive` | `moduleId` → `Modules.id`, `courseId` → `Courses.id` | Index `(moduleId, order)`. **Asymmetry:** it has a `courseId` column and is filtered/grouped by course, but no `belongsTo(Course)` association is declared — course context must be reached by nesting `Module → Course`. Video/audio enrichment writes `videoUrl`/`linkUrl` here. |
| 5 | `Enrollment` | `Enrollments` | `status` ENUM(`active`,`completed`,`dropped`, default `active`), `enrolledAt`, `completedAt` | `courseId` → `Courses.id`, `studentId` → `Users.id` | Unique `(courseId, studentId)`; the gate's completion target (`findOrCreate` on assessment submit). |
| 6 | `AssessmentAttempt` | `AssessmentAttempts` | `answers` JSON, `results` JSON, `weaknesses` JSON, `moduleRecommendations` JSON, `score`, `total`, `percentage` DECIMAL(5,2), `passed`, `level`, `timeSpent` (default 0), `completedAt` | `studentId` → `Users.id`, `courseId` → `Courses.id` | The structured report routed to the learner agent; distinct from `QuizAttempt` (which requires a non-null `quizId`). Indexes `(studentId, courseId)`, `(studentId)`. |
| 7 | `Quiz` | `Quizzes` | `title`, `description`, `type` ENUM(`quiz`,`test`,`exam`, default `quiz`), `questions` JSON, `timeLimit`, `maxAttempts` (default 1), `passingScore` (default 70), `isActive` | `courseId` → `Courses.id`, `instructorId` → `Users.id` | Index `(courseId, isActive)`. `correctAnswer` stripped from all read responses. |
| 8 | `QuizAttempt` | `QuizAttempts` | `answers` JSON (per-question `{questionIndex, selectedAnswer, isCorrect}`), `score`, `totalPoints`, `percentage` DECIMAL(5,2), `passed`, `timeSpent`, `completedAt` | `quizId` → `Quizzes.id`, `studentId` → `Users.id`, `courseId` → `Courses.id` | Auto-graded on submit; also emits a `quiz_attempt` `ActivityLog`. Indexes `(quizId, studentId)`, `(studentId)`. |
| 9 | `Assignment` | `Assignments` | `title`, `description`, `instructions`, `dueDate`, `maxPoints` (default 100), `attachments` JSON (≤ 5 files), `isActive` | `courseId` → `Courses.id`, `instructorId` → `Users.id` | Index `(courseId, dueDate)`. |
| 10 | `Submission` | `Submissions` | `files` JSON (≤ 5 files), `comments`, `grade`, `feedback`, `gradedById`, `gradedAt`, `submittedAt`, `isLate` | `assignmentId` → `Assignments.id`, `studentId` → `Users.id`, `courseId` → `Courses.id`, `gradedById` → `Users.id` | Indexes `(assignmentId, studentId)`, `(studentId)`. Grader is tracked through `gradedById`. |
| 11 | `Gradebook` | `Gradebooks` | `assignmentGrades` JSON, `quizGrades` JSON, `overallGrade` DECIMAL(5,2, default 0), `participationScore` DECIMAL(5,2), `lastUpdated` | `courseId` → `Courses.id`, `studentId` → `Users.id` | Unique `(courseId, studentId)`; powers CGPA, learning path and leaderboard academics. |
| 12 | `ActivityLog` | `ActivityLogs` | `activityType` ENUM(`module_view`,`quiz_attempt`,`assignment_submit`), `timeSpent` (default 0), `performedAt` | `studentId` → `Users.id`, `courseId` → `Courses.id`, `moduleId` → `Modules.id` (nullable) | Three indexes; source of streaks, consistency score, engagement level and the leaderboard's engagement component. |
| 13 | `Message` | `Messages` | `subject`, `content`, `isRead` (default false), `readAt`, `isDeletedBySender`, `isDeletedByRecipient` | `senderId` → `Users.id`, `recipientId` → `Users.id` | **Asymmetric soft delete:** deletion is recorded per side rather than by removing the row, so a sender can delete while the recipient keeps their copy. Indexes `(senderId, createdAt)`, `(recipientId, isRead, createdAt)`. |
| 14 | `AssistantMessage` | `AssistantMessages` | `role` ENUM(`user`,`assistant`), `content`, `imageUrl` | `studentId` → `Users.id` | Index `(studentId, createdAt)`; 8 most recent turns (16 rows) feed the model, 100 rows returned by the history endpoint. |
| 15 | `Forum` | `Forums` | `title`, `description`, `isActive` | `courseId` → `Courses.id` | One or more forums per course. |
| 16 | `Thread` | `Threads` | `title`, `content`, `isPinned`, `isLocked`, `viewCount` | `authorId` → `Users.id`, `forumId` → `Forums.id`, `courseId` → `Courses.id` | **Asymmetric:** carries its own `courseId` (denormalized for course-scoped queries) while also belonging to a `Forum` that already has one. Locking blocks replies; pinning changes listing order. |
| 17 | `Reply` | `Replies` | `content`, `parentReplyId` (self-reference, nullable) | `authorId` → `Users.id`, `threadId` → `Threads.id`, `parentReplyId` → `Replies.id` | Self-referential adjacency list enables nested replies; index `(threadId, createdAt)`. |

**Association summary (as declared in `models/index.js`)**

- `User` 1—* `Course` (`instructorId`, alias `instructedCourses` / `instructor`).
- `Course` 1—* `Module`, 1—* `Forum`, 1—* `Assignment`, 1—* `Quiz`, 1—* `Enrollment`, 1—* `ActivityLog`, 1—* `AssessmentAttempt`.
- `Module` 1—* `Material`.
- `Forum` 1—* `Thread`; `Thread` 1—* `Reply`; `Reply` 0..* — 0..* `Reply` (`parentReplyId`).
- `Assignment` 1—* `Submission`; `User` 1—* `Submission` (`studentId`); `Submission` — `User` (`gradedById`, single direction only).
- `Quiz` 1—* `QuizAttempt`; `User` 1—* `QuizAttempt`.
- `User` 1—* `Enrollment`, 1—* `ActivityLog`, 1—* `AssistantMessage`, 1—* `AssessmentAttempt`, 1—* `Thread`, 1—* `Reply`.
- `Message`: `User` 1—* `Message` twice (as `sentMessages` and `receivedMessages`).
- `Gradebook` — `Course`, — `User`.
- **Declared single-direction FKs without an inverse `hasMany`:** `Submission.gradedById`, `Assignment.instructorId`, `Quiz.instructorId`.

**Columns present without an association** (asymmetric — join through the parent in application code): `Material.courseId`, `Thread.courseId`, `Submission.courseId`, `QuizAttempt.courseId`, `ActivityLog.moduleId` (no `Module.hasMany(ActivityLog)`), `Gradebook` (no `Course.hasMany(Gradebook)`).

---

## Appendix D — Dependencies

### D.1 Backend runtime (`backend/package.json`)

| Package | Version | Role in the system |
| --- | --- | --- |
| `express` | ^4.18.2 | HTTP server and routing; JSON/urlencoded body parsing (10 MB), static `/uploads`, 404 and error chain. |
| `sequelize` | ^6.37.8 | ORM for all 17 models and their associations; `sync()` schema creation; query builder and `Op` usage. |
| `pg` | ^8.23.0 | PostgreSQL driver used by the Sequelize `postgres` dialect. |
| `pg-hstore` | ^2.3.4 | Declared for hstore support; **not** wired into `config/database.js` (hstore is not configured). |
| `jsonwebtoken` | ^9.0.2 | Signs `{ id }` tokens (`JWT_SECRET`, `JWT_EXPIRE` default `7d`) and verifies them in `auth`/`authOptional`. |
| `bcryptjs` | ^2.4.3 | Password hashing (10-round salt) and comparison. |
| `multer` | ^1.4.5-lts.1 | Disk-storage uploads with MIME allow-list and size limits; two instances (`upload`, `uploadAvatar`). |
| `nodemailer` | ^9.0.5 | SMTP transport for password-reset (and welcome) email. |
| `openai` | ^7.4.0 | Official SDK pointed at Groq's OpenAI-compatible base URL; used via `chat.completions.create`. |
| `helmet` | ^7.1.0 | Standard HTTP security headers. |
| `cors` | ^2.8.5 | Origin allow-list with normalization, `credentials: true`, 204 preflight. |
| `compression` | ^1.7.4 | Response gzip compression. |
| `express-rate-limit` | ^7.1.5 | IP rate limiting on `/api/` (default 100 requests / 15 min). |
| `express-validator` | ^7.0.1 | Declared but **not imported** anywhere in `routes/`, `controllers/` or `middleware/`; validation today is explicit controller checks plus Sequelize validators. |
| `dotenv` | ^16.3.1 | Loads `.env` at the top of `server.js` (and in scripts) so `config/database.js` and `openaiservices.js` see configuration. |

Dev dependencies: `jest` ^29.7.0 (`npm test`; the suite is currently empty) and `nodemon` ^3.0.2 (`npm run dev`).

Backend scripts: `start` (`node server.js`), `dev` (`nodemon server.js`), `test` (`jest`), `db:seed`, `generate-content`, `attach-videos`.

### D.2 Frontend (`frontend/package.json`)

| Package | Version | Role |
| --- | --- | --- |
| `react`, `react-dom` | ^19.2.7 | SPA runtime. |
| `react-router-dom` | ^7.11.0 | Client-side routing (`BrowserRouter`) across ~20 screens. |
| `tailwindcss`, `@tailwindcss/vite` | ^4.3.3 | Utility styling plus the CSS-variable token layer for light/dark themes. |
| `@heroicons/react` | ^2.2.0 | Iconography. |
| `vite`, `@vitejs/plugin-react`, ESLint stack | dev | Build, dev server and lint gates (`npm run build`, `npm run lint`). |

### D.3 External services

| Service | Used for | Failure behaviour |
| --- | --- | --- |
| **Groq** (`https://api.groq.com/openai/v1`, default model `llama-3.3-70b-versatile`) | Assistant replies (text + vision), LLM-assisted assessment question generation | Deterministic fallbacks: scripted assistant reply, per-course question bank. |
| **YouTube public search page** | Resolving real watch URLs for video materials and video-mode augmentation | 7 s timeout, then `null`; item keeps its search-results link; augmentation degrades gracefully. |
| **SMTP** (`EMAIL_HOST/PORT/USER/PASSWORD`) | Password-reset email | 500 and token cleared; the account is unaffected otherwise. |
| **PostgreSQL over TLS (Neon)** | All persistence | Boot fails loudly; request failures surface as 500/404 per handler. |

### D.4 Internal modules (no external dependency)

`config/database.js`, `middleware/{auth,rbac,upload,errorHandler}.js`, `utils/email.js` (nodemailer), `utils/search.js` (LIKE wildcard escaping), `services/openaiservices.js`, `agents/*` (7 files), `controllers/*` (18 files), `routes/*` (17 files), `models/*` (17 models + `index.js`), `scripts/{seedCourses,generateCourseContent,attachCourseVideos}.js`.

---

## Appendix E — Requirement Traceability Index

| Requirement group | IDs | Primary implementation |
| --- | --- | --- |
| Authentication & account | FR-001…FR-009 | `controllers/authController.js`, `controllers/settingsController.js`, `models/User.js`, `utils/email.js` |
| Courses | FR-010…FR-015 | `controllers/courseController.js`, `routes/courses.js` |
| Modules & materials | FR-016…FR-020 | `controllers/moduleController.js`, `controllers/materialController.js`, `middleware/upload.js` |
| Enrollment & gated assessment | FR-021…FR-033 | `controllers/courseController.js` (`enrollCourse`), `controllers/assessmentController.js`, `agents/assessmentAgent.js`, `agents/assessmentStore.js`, `agents/evaluationAgent.js`, `agents/recommendationAgent.js`, `models/AssessmentAttempt.js` |
| Learner modelling & preferences | FR-034…FR-039 | `agents/learnerModellingAgent.js`, `controllers/learnerController.js` |
| Recommendations & personalization | FR-040…FR-052 | `agents/contentResourceAgent.js`, `controllers/learnerController.js`, `controllers/moduleController.js`, `middleware/auth.js` |
| Agents | FR-053…FR-061 | `agents/*.js`, `services/openaiservices.js` |
| AI assistant | FR-062…FR-066 | `controllers/assistantController.js`, `agents/assistantAgent.js`, `models/AssistantMessage.js` |
| Quizzes | FR-067…FR-071 | `controllers/quizController.js`, `models/Quiz.js`, `models/QuizAttempt.js` |
| Assignments & submissions | FR-072…FR-076 | `controllers/assignmentController.js`, `routes/assignments.js`, `models/Assignment.js`, `models/Submission.js` |
| Gradebook & CGPA | FR-077…FR-080 | `controllers/gradebookController.js`, `models/Gradebook.js` |
| Forums | FR-081…FR-085 | `controllers/forumController.js`, `models/{Forum,Thread,Reply}.js` |
| Messaging | FR-086…FR-089 | `controllers/messageController.js`, `models/Message.js` |
| Activity & leaderboard | FR-090…FR-093 | `controllers/activityController.js`, `controllers/leaderboardController.js`, `models/ActivityLog.js` |
| Reports | FR-094…FR-097 | `controllers/reportController.js`, `controllers/activityController.js` (`getCourseConsistency`) |
| Administration | FR-098…FR-100 | `controllers/adminController.js`, `routes/admin.js` |
| Platform behaviour & onboarding | FR-101…FR-104 | `server.js`, `middleware/errorHandler.js`, `frontend/src/component/onboarding.jsx`, `frontend/src/screens/learningPreferences.jsx` |
| Non-functional | NFR-001…NFR-054 | `server.js`, `config/database.js`, `models/*.js`, `vercel.json`, `middleware/*`, `.env.example` |
