# Agentic Underwriting Copilot — Web App

A production-grade **Next.js 14 (App Router, TypeScript)** dashboard that wraps the
existing **Agentic Underwriting Copilot** FastAPI AI service (9-agent LangGraph
workflow + calibrated LightGBM scoring + SHAP explainability + Chroma policy RAG).

This project provides the **frontend UI + application backend + PostgreSQL database**.
It does **not** contain the AI model code — it talks to your FastAPI service over HTTP.

```
┌───────────────┐      ┌─────────────────┐      ┌──────────────┐
│  Next.js UI    │────►│ Next.js API routes│────►│ FastAPI AI    │
│ (underwriter,  │      │  + Prisma / PG    │      │ :8000 /assess │
│ compliance,ops)│◄────│  (queues, audit)  │◄────│ /admin/index  │
└───────────────┘      └─────────────────┘      └──────────────┘
```

---

## Features

- **Authentication & sessions** (`/login`) — email + password login, bcrypt-hashed
  credentials, signed JWT session cookie (`uc_session`), and route protection via
  `middleware.ts`. Unauthenticated users are redirected to `/login`; unauthorized users
  hit `/forbidden`.
- **Role-based access control (6 roles)** — `SUPER_ADMIN` (full access), `ADMIN`,
  `OPERATIONS_LEAD`, `COMPLIANCE_OFFICER`, `SENIOR_UNDERWRITER`, `FRONTLINE_UNDERWRITER`.
  Every page and API route is gated by a capability matrix (`lib/rbac.ts`).
- **User management** (`/admin`) — Super Admin / Admin can create users (name, email,
  role, initial password), change roles inline, activate/deactivate, reset passwords, and
  delete accounts (with self- and last-super-admin guards).
- **New Application intake** (`/underwriter/new`) — pick a **dummy applicant preset** that
  auto-fills every field the AI/backend needs, tweak anything, then submit to run the full
  pipeline end-to-end and land on the case detail view.
- **Built-in mock AI engine** (`lib/mock-ai.ts`) — deterministic risk scoring, SHAP,
  policy compliance, and a final decision/referral so the **entire system is testable
  without the FastAPI service running** (`AI_SERVICE_MOCK=true`). When the real service is
  configured it is used for the final verdict, with automatic fallback to the mock.
- **Underwriter Console** (`/underwriter`) — Queue / Referral / Completed tabs, search by
  ID, filter by risk tier, “Assign to Me”.
- **Case Detail & Adjudication** (`/underwriter/[id]`) — three-column workspace:
  - Applicant dossier + pensioner/unemployed (`DAYS_EMPLOYED == 365243`) warning banner.
  - SHAP waterfall chart (red = increases risk, green = decreases risk).
  - Compliance checklist with a right-hand citation drawer showing exact policy snippets.
  - Adjudication panel: recommended verdict, editable narrative, mandatory adverse-action
    reason on decline, and override capture (writes to `Underwriter_Overrides`).
- **Compliance & Fairness** (`/compliance`) — demographic parity charts across gender +
  age buckets with a >5% approval-gap alert, plus a policy editor that hot-indexes docs
  via `/admin/index-document`.
- **Operations & Analytics** (`/operations`) — throughput, p95 latency (≤ 30s target),
  avg cost/application (≤ $0.05 target) and cumulative LLM cost.

---

## Tech stack

- Next.js 14 App Router, TypeScript, React 18
- Tailwind CSS + Radix UI (shadcn-style primitives) + lucide-react icons
- Recharts for all charts
- Prisma ORM + PostgreSQL
- Zod (available for request validation)

---

## Quick start (local, without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   - set DATABASE_URL (a local Postgres)
#   - set AI_SERVICE_BASE_URL to your FastAPI service (default http://localhost:8000)

# 3. Create the schema + generate the client
npx prisma migrate dev --name init   # or: npx prisma db push
npx prisma generate

# 4. Seed demo users + sample applications
npm run db:seed

# 5. Run the dev server
npm run dev
# open http://localhost:3000  (redirects to /underwriter)
```

> The seed script creates a Super Admin + 5 role users and 7 sample applications so every
> screen has data immediately, even before the FastAPI service is connected.

### Demo credentials (from the seed)

| Email | Role | Password |
| --- | --- | --- |
| `superadmin@halcyoncredit.com` | Super Admin | `SuperAdmin123!` |
| `admin@halcyoncredit.com` | Admin | `Password123!` |
| `maria@halcyoncredit.com` | Operations Lead | `Password123!` |
| `elena@halcyoncredit.com` | Compliance Officer | `Password123!` |
| `daniel@halcyoncredit.com` | Senior Underwriter | `Password123!` |
| `priya@halcyoncredit.com` | Frontline Underwriter | `Password123!` |

### Testing the pipeline end-to-end

1. Keep `AI_SERVICE_MOCK="true"` in `.env` (default) so no FastAPI service is needed.
2. Log in, go to **New application**, and pick a preset:
   - **Prime borrower** / **Standard employed** → auto-approve.
   - **High DTI** → hard-stop decline (POL-DTI-001).
   - **Past delinquency** → decline (POL-DPD-004).
   - **Thin file** → referral `[THN]`.
   - **Pensioner / unemployed** (`DAYS_EMPLOYED = 365243`) → referral + pensioner banner.
   - **Fairness-flag cohort** → referral `[BIAS]`.
3. Submit → the app is created, scored, and you are routed to its case detail view with a
   full SHAP breakdown, compliance checklist, and adjudication panel.
4. Set `AI_SERVICE_MOCK="false"` to route final verdicts through your real FastAPI service.

---

## Quick start (Docker Compose)

```bash
cp .env.example .env   # optional overrides

# Brings up PostgreSQL + the web app, runs migrations + seed automatically.
docker compose up --build

# Web app:   http://localhost:3000
# Postgres:  localhost:5432  (copilot / copilot / underwriting)
```

Point the web container at your FastAPI service by setting `AI_SERVICE_BASE_URL`:

```bash
AI_SERVICE_BASE_URL=http://host.docker.internal:8000 docker compose up --build
```

If you run the AI service as a compose service too, uncomment the `ai-service` block in
`docker-compose.yml` and set `AI_SERVICE_BASE_URL=http://ai-service:8000`.

---

## Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://copilot:copilot@localhost:5432/underwriting?schema=public` |
| `AI_SERVICE_BASE_URL` | Base URL of the FastAPI AI service | `http://localhost:8000` |
| `AI_SERVICE_API_KEY` | Optional bearer token for the AI service | _(empty)_ |
| `AI_SERVICE_TIMEOUT_MS` | Timeout for AI calls (9-agent pipeline is slow) | `45000` |
| `AI_SERVICE_MOCK` | `true` = use the built-in deterministic mock AI engine and skip FastAPI | `true` |
| `AUTH_SECRET` | Secret used to sign session JWTs (set a strong value in production) | _(dev fallback)_ |
| `SESSION_TTL_HOURS` | Session lifetime in hours | `12` |
| `SEED_DEFAULT_PASSWORD` | Password set on all seeded non-super-admin users | `Password123!` |
| `SEED_SUPERADMIN_EMAIL` | Email of the bootstrap Super Admin | `superadmin@halcyoncredit.com` |
| `SEED_SUPERADMIN_PASSWORD` | Password of the bootstrap Super Admin | `SuperAdmin123!` |

> **Auth:** Real email/password auth lives in `lib/auth.ts`, `lib/password.ts`,
> `lib/jwt.ts`, `lib/session.ts` and `middleware.ts`. Passwords are bcrypt-hashed; sessions
> are signed JWTs in an httpOnly cookie. Every screen and API route reads the current user
> through `getCurrentUser()` and is gated by the capability matrix in `lib/rbac.ts`.
> **Change `AUTH_SECRET` and all seeded passwords before any real deployment.**

---

## API routes (Next.js → backend proxy)

| Method | Route | Purpose |
| --- | --- | --- |
| `GET`  | `/api/applications?status=` | Queue lists (PENDING / ESCALATED / COMPLETED) |
| `GET`  | `/api/applications/:id` | Full case profile |
| `POST` | `/api/applications` | Intake: create an application (preset or full applicant file) + assess it |
| `POST` | `/api/applications/:id/assess` | Re-run the pipeline (mock or FastAPI `/assess`), persist full breakdown |
| `GET`  | `/api/admin/users` / `POST` | List / create users (role-gated) |
| `PATCH`/`DELETE` | `/api/admin/users/:id` | Update role/status / delete user |
| `POST` | `/api/admin/users/:id/reset-password` | Reset a user password |
| `POST` | `/api/auth/login` / `/api/auth/logout` | Session login / logout |
| `POST` | `/api/applications/:id/action` | Commit final decision (+ transactional override log) |
| `POST` | `/api/applications/:id/override` | Standalone override logging |
| `GET`  | `/api/applications/:id/override` | Override history |
| `POST` | `/api/applications/:id/assign` | “Assign to Me” |
| `POST` | `/api/admin/index-document` | Proxy to FastAPI `/admin/index-document` (compliance/admin) |
| `GET`  | `/api/analytics` | Operations metrics |
| `GET`  | `/api/compliance/fairness` | Demographic parity metrics |

The only two calls that reach the AI service live in `lib/ai-service.ts`
(`assess()` and `indexDocument()`), matching your exact payload contracts in `lib/types.ts`.

---

## Data model

Defined in `prisma/schema.prisma`, matching the requested schema:
`users`, `underwriting_applications`, `assessments`, `shap_factors`,
`decision_records`, `policy_citations`, `referral_packages`, `underwriter_overrides`.

---

## Project structure

See `PROJECT_STRUCTURE.md` for a full file tree.

---

## Notes

- Charts and some operations metrics (throughput / latency series) are demo-derived so the
  dashboards render out-of-the-box; cost aggregates come from real `decision_records`.
- Replace the demo auth shim before any real deployment and add rate limiting / RBAC
  middleware as needed.
