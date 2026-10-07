# SevaManipur AI

**Government Services, Made Simple with AI.**

> One AI-powered platform for citizens, services and smarter governance in Manipur.
> **Prototype developed for AI4SEVA Hackathon 2026.** Not an official Government of Manipur website.

SevaManipur AI is a full-stack, AI-powered citizen gateway that helps the people of Manipur
**discover, understand and access** government services — with a real Gemini-powered assistant,
a structured scheme finder, civic grievance reporting with live tracking, an admin dashboard,
and English / Hindi / Meiteilon (Manipuri) support.

---

## ⚡ Quick start

```bash
npm install          # once
npm run build        # build the frontend (once, or after editing src/)
npm start            # → http://localhost:8787
```

Development mode (hot reload):

```bash
npm run dev:server   # backend on :8787
npm run dev          # frontend on :5173 (proxies /api to :8787)
```

Re-seed the demo database from scratch: `npm run seed`

**Demo logins**

| Role    | Email                 | Password   |
| ------- | --------------------- | ---------- |
| Citizen | `demo@citizen.in`     | `Demo@2026` |
| Admin   | `admin@sevamanipur.in`| `Admin@2026`|

Demo complaint IDs to try on **Track Complaint**: `SM-2026-10482`, `SM-2026-10893`, `SM-2026-10975`.

---

## 🧭 What's inside

| Feature | Route | Highlights |
| --- | --- | --- |
| **Home** | `/` | Hero AI search, 6 quick actions, Ask → Understand → Apply → Track |
| **Seva AI assistant** | `/assistant` | Real Google Gemini, grounded in the platform's own service/scheme DB (RAG-lite), EN/HI/Meiteilon replies, conversation history (logged-in), suggested questions, copy, retry, clear, voice input (Web Speech API), friendly busy/error states |
| **Services directory** | `/services` | 22+ services in 10 categories, search + filters, eligibility/documents/steps/links, Ask-AI deep links, save |
| **AI Scheme Finder** | `/schemes` | Structured eligibility matching (age, occupation, area, income) with a transparent "why you may qualify" reason for every result |
| **Document Assistant** | `/documents` | Per-service checklist with plain-language notes, office step timeline, "Ask Seva AI if I am missing anything" |
| **Report a Problem** | `/report` | Category → department auto-routing, district selector (all 16 districts), photo upload, validation |
| **Track Complaint** | `/track` | `SM-2026-XXXXX` IDs, Submitted → Received → Assigned → Under Review → Resolved timeline |
| **Citizen dashboard** | `/dashboard` | My complaints (+ full timelines), saved services/schemes, AI chat history |
| **Admin dashboard** | `/admin` | Live stats + charts (category/district/status/14-day), complaint management (status, priority, department, internal notes, photo), **AI API Health** console |
| **Contacts** | `/contacts` | Searchable directory, Call / Email / Visit Website (real national helplines: 112, 108, 181, 1098) |

---

## 🤖 Real Gemini integration & API-key rotation

Architecture (keys never leave the server):

```
User Browser → SevaManipur Backend → API Key Manager → Gemini API
```

* Keys are read **only** from server env vars (`GEMINI_API_KEY_1..N` — add as many as you like, no code changes).
* Responses, logs and the admin UI only ever show masked keys (`••••A72F`).
* **Rotation strategies** (admin-switchable, `AI_ROTATION_STRATEGY` sets the default):
  * `failover` — stay on the first healthy key; on HTTP 429 put it in cooldown (exponential backoff 1→10 min) and fail over to the next key; 5xx/timeout → brief cooldown + next key; invalid key (401/403/API_KEY_INVALID) → disabled until an admin re-enables it; a failed key is never retried within the same request.
  * `round_robin` — spread every request across available keys.
* **AI API Health page** (`/admin` → AI API Health): per-key status (active / cooldown / invalid / disabled), request & error counts, last used, last error, cooldown countdown, one-click Test / Enable / Disable / Reset-cooldown, strategy switch, and a **live end-to-end AI test**.
* If **every** key is unavailable the user sees: *"Seva AI is temporarily busy. Please try again in a moment."* — never raw errors or key material.
* Model is configurable via `GEMINI_MODEL` (default here: `gemini-flash-lite-latest`, the current flash-lite tier — the pinned `gemini-2.5-flash-lite` was retired for new API projects).

### Abuse protection
Per-IP API limiter, stricter per-user/per-IP AI limiter (10/min), 2,000-char prompt cap, 30 s upstream timeout, response size cap, 5 MB image-only uploads with random filenames, bcrypt password hashing, httpOnly JWT sessions, admin-guarded routes and photo access.

---

## 🗂 Project structure

```
sevamanipur-ai/
├── server/               # Express + node:sqlite backend
│   ├── ai/keyManager.js  # key health + rotation strategies
│   ├── ai/gemini.js      # Gemini client with failover logic
│   ├── ai/context.js     # RAG-lite grounding from the DB
│   ├── routes/           # auth, ai, services, schemes, complaints, contacts, saves, admin
│   └── seed.js           # demo data (labelled Demo Data)
├── src/                  # React 18 + Vite frontend
│   ├── i18n.jsx          # EN / HI / Meiteilon dictionaries
│   └── pages/            # Home, Services, Assistant, Schemes, Documents, Report, Track, Contacts, Auth, Dashboard, Admin
├── data/                 # SQLite database (auto-created, gitignored)
└── uploads/              # complaint photos (gitignored, admin-only access)
```

## 🚀 Deployment

The project is a **Vite + React SPA** (React Router, `BrowserRouter`, all paths absolute) with a
separate **Express + SQLite backend**. `vercel.json` is already configured:

* `buildCommand: npm run build`, `outputDirectory: dist`
* SPA rewrite `/(*)→ /index.html` (excluding `/api/*`) so **every route works on direct load and
  refresh** — `/`, `/services`, `/schemes`, `/documents`, `/report`, `/track`, `/assistant` (also `/ai`),
  `/contacts`, `/login`, `/register`, `/admin/login`, `/dashboard`, `/admin`, `/about`, `/privacy`,
  `/terms`, `/accessibility`, and `/services/:slug`.

### Architecture note (important)

The full backend uses a file-based SQLite database and long-running Express — accounts, complaint
submission/tracking and saves **cannot run as Vercel serverless functions** (ephemeral filesystem).
Three supported setups:

**A. Demo runs fully local (nothing to configure)**

```bash
npm run build && npm start   # one server on :8787 serves API + built frontend
```

**B. Vercel hybrid — static SPA + serverless functions (deployed production)**

The `api/` directory deploys as Vercel serverless functions and serves everything that does not
need a database: **Seva AI chat** (`/api/ai/chat`, keys stay server-side, rotation + cooldowns
ported from `server/ai/`), the read-only **services / schemes / scheme-matcher / contacts /
complaint-meta** demo-data endpoints, `/api/health`, and honest 501 stubs for auth.

1. Import/deploy the repo on Vercel → `vercel.json` picks up `dist` + `api/` automatically.
   Leave `VITE_API_BASE` unset so the frontend calls its own origin.
2. Set on **Vercel** (Project → Settings → Environment Variables → *Production*), then redeploy:
   * `GEMINI_API_KEY_1..5` — same keys as `.env` (server-side only; never shipped to the browser)
   * `GEMINI_KEY_1..5_LABEL` (optional, shows masked labels in replies/health)
   * `GEMINI_MODEL=gemini-flash-lite-latest`, `AI_ROTATION_STRATEGY=round_robin`
3. Not available in this mode: login/registration (501), complaint submit/track, saves, admin —
   they need the full backend (option C). Seva AI serves guests, so the assistant works fully.

**C. Frontend on Vercel + full backend hosted elsewhere (Railway / Render / Fly / a VPS / your machine)**

1. Host `server/` on any persistent Node host and set on the **backend**:
   * `GEMINI_API_KEY_1..5`, `GEMINI_MODEL`, `JWT_SECRET` (as in `.env`)
   * `CORS_ORIGIN=https://your-project.vercel.app` (comma-separated list allowed)
   * `COOKIE_SAMESITE=none` (login cookies are cross-site then; requires https on both sides)
2. Set on **Vercel** (Project → Settings → Environment Variables, it's a build-time var):
   * `VITE_API_BASE=https://your-backend-host` — the frontend will call that API base.

Refresh any deep link (e.g. open `/track` and hit F5) — with the rewrite in place it loads the SPA
and the route renders directly.

## 🔐 Environment

Copy `.env.example` → `.env`. Real keys live only in `.env` (gitignored). `.env.example` ships empty.
Optional integration points are stubbed in config only: `MAPS_API_KEY` (complaint-location map),
`TRANSLATION_API_KEY` (dynamic translation), `EMAIL_API_KEY` / `SMS_API_KEY` (notifications) —
the app is fully functional without them and asks for them only if you want those extras.

## ⚠️ Honesty rules baked into the UI

* Every page footer + hero badge: *"Prototype developed for AI4SEVA Hackathon 2026 … NOT an official website of the Government of Manipur."*
* Rows whose data isn't officially verified carry a **Demo Data** badge (services, schemes, contacts, admin note about maps).
* Seva AI is instructed never to invent scheme names, links or numbers, and every application answer ends with a "verify with the concerned department" reminder.

## 🎤 5-minute judge demo script

1. **Home** — point at the tagline + prototype badge; type *"I am a student. What government schemes might be available to me?"* in the hero search → it opens Seva AI and answers live (Gemini + platform data).
2. **Seva AI** — open a suggested question; show the structured reply (What it is / Eligibility / Documents / Steps / Where to apply), copy button, and the verify disclaimer.
3. **Scheme Finder** — enter age 19 / Student / Rural → results with "Why you may qualify".
4. **Document Assistant** — pick *Income Certificate*, tick off documents, click **Ask Seva AI if I am missing anything**.
5. **Report a Problem** — submit a road-damage complaint → success screen with a fresh `SM-2026-XXXXX`.
6. **Track Complaint** — paste the ID → live timeline.
7. **Admin** — log in (`admin@sevamanipur.in`), Overview shows the new complaint in the charts; open it in Complaints, change status → note lands in the timeline; citizen can see it on Track.
8. **AI API Health** — show the 5 masked keys, request counts, run the **live AI test**, flip strategy to *round_robin* and back.
9. **Language** — switch the navbar to हिन्दी (and মৈতৈলোন্) live.
