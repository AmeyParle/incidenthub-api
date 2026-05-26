# IncidentHub API

Production-grade incident management API with AI-powered ticket analysis. Built with Node.js, Express, PostgreSQL, and Prisma. Features LLM-driven ticket summarization and resolution playbook generation, database-backed prompt versioning with A/B testing, automated quality evaluation on every LLM response, Zod schema validation, per-user rate limiting, and 21 fully documented REST endpoints.

---

## Live Demo

- **API Base URL**: [https://incidenthub-api.onrender.com/api](https://incidenthub-api.onrender.com/api)
- **Swagger Docs**: [https://incidenthub-api.onrender.com/docs](https://incidenthub-api.onrender.com/docs)

> The service may take a few seconds to wake up due to free-tier hosting.

---

## Features

### Core API
- JWT authentication with three-tier RBAC (Admin / Agent / Viewer)
- Project and ticket management with assignment, status transitions, and priority levels
- Threaded comments on tickets
- Filtering by status, priority, project, and assignee
- Full-text search on ticket title and description
- Configurable sorting and cursor-based pagination
- Health and readiness endpoints

### AI Layer
- **Ticket Summarization** — Generates structured JSON summaries (headline, impact, key facts, suggested next step) from ticket data and comment history
- **Resolution Playbook** — Produces actionable incident response plans (root cause suspect, immediate actions, investigation steps, escalation path, prevention notes)
- **Prompt Versioning** — Prompts stored in PostgreSQL with version numbers; A/B test any version via `?version=N` query parameter without changing active state; atomic promotion and rollback via API
- **Quality Evaluation** — Every LLM response is automatically scored on relevance (term overlap), coherence (truncation, repetition, casing), and length; composite score determines pass/flagged/failed status
- **LLM Call Logging** — Every call persisted with rendered prompt, raw output, token counts, latency, and eval scores
- **Metrics Endpoint** — Aggregate call volume, pass rate, avg/max latency, token usage, and status breakdown

### Production Hardening
- Zod schema validation on all route inputs (body and query params)
- Per-user sliding-window rate limiting (20 req/min on AI endpoints, 10 req/min on auth)
- Integration test suite (Jest + Supertest) covering auth flows, CRUD, and input rejection
- Centralized error handling with structured JSON responses
- OpenAPI/Swagger documentation (843 lines covering all 21 endpoints)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js, Express.js |
| Database | PostgreSQL (NeonDB), Prisma ORM |
| Auth | JWT (jsonwebtoken), bcrypt |
| AI | Groq API (OpenAI-compatible), Llama 3.3 70B |
| Validation | Zod |
| Testing | Jest, Supertest |
| Docs | Swagger UI, OpenAPI 3.0 |
| Deployment | Render |

---

## Project Structure

```
src/
├── ai/
│   ├── llmClient.js          # Groq API wrapper — retry, timeout, DB logging
│   ├── promptRegistry.js     # DB-backed prompt store with caching + template rendering
│   ├── evalPipeline.js       # Heuristic quality scoring (relevance, coherence, length)
│   └── seed.js               # Seeds prompt versions into DB
├── config/
│   ├── prisma.js              # Shared Prisma client
│   └── swagger.js             # Swagger UI setup
├── controllers/
│   ├── ai.controller.js       # Summarize, suggest, prompt mgmt, metrics
│   ├── auth.controller.js     # Register, login, me
│   ├── comment.controller.js  # Add/list comments
│   ├── project.controller.js  # Project CRUD
│   └── ticket.controller.js   # Ticket CRUD, assign, status, priority
├── middleware/
│   ├── auth.middleware.js     # JWT token verification
│   ├── error.middleware.js    # Centralized error handler
│   ├── rateLimiter.middleware.js  # Sliding window rate limiter (zero deps)
│   ├── role.middleware.js     # RBAC authorization
│   └── validate.middleware.js # Zod validation middleware
├── routes/
│   ├── ai.routes.js
│   ├── auth.routes.js
│   ├── comment.routes.js
│   ├── index.js               # Root router — mounts all route groups
│   ├── project.routes.js
│   └── ticket.routes.js
├── utils/
│   ├── asyncHandler.js
│   └── jwt.js
├── validators/
│   └── schemas.js             # All Zod schemas (auth, tickets, projects, comments)
├── app.js
└── server.js

prisma/
└── schema.prisma              # User, Project, Ticket, Comment, PromptVersion, LLMLog

tests/
├── auth.test.js               # Auth flow + Zod rejection tests
└── tickets.test.js            # Ticket CRUD + comment + validation tests

docs/
└── openapi.yaml               # 843-line OpenAPI 3.0 spec
```

---

## API Endpoints

### Auth
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/auth/me` | Any | Get current user |

### Projects
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/projects` | Admin | Create a project |
| GET | `/api/projects` | Any | List all projects |
| GET | `/api/projects/:id` | Any | Get project by ID |

### Tickets
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/tickets` | Any | Create a ticket |
| GET | `/api/tickets` | Any | List tickets (filter, search, sort, paginate) |
| GET | `/api/tickets/:id` | Any | Get ticket by ID |
| PATCH | `/api/tickets/:id` | Admin, Agent | Update ticket fields |
| PATCH | `/api/tickets/:id/assign` | Admin, Agent | Assign ticket to user |
| PATCH | `/api/tickets/:id/status` | Admin, Agent | Update ticket status |
| PATCH | `/api/tickets/:id/priority` | Admin, Agent | Update ticket priority |

### Comments
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/tickets/:id/comments` | Any | Add comment to ticket |
| GET | `/api/tickets/:id/comments` | Any | List comments for ticket |

### AI
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/tickets/:id/summarize` | Any | AI-generated ticket summary |
| POST | `/api/ai/tickets/:id/suggest-resolution` | Any | AI-generated resolution playbook |
| GET | `/api/ai/prompts/:name/versions` | Admin | List all prompt versions |
| PATCH | `/api/ai/prompts/:name/versions/:version/activate` | Admin | Promote a prompt version |
| GET | `/api/ai/prompts/:name/eval-stats` | Admin | Aggregate quality stats |
| GET | `/api/ai/metrics` | Admin | LLM usage metrics |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/AmeyParle/incidenthub-api.git
cd incidenthub-api
npm install
```

### 2. Configure environment

Create a `.env` file:

```env
PORT=5001
DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE?sslmode=require"
JWT_SECRET="your-secret-key"
GROQ_API_KEY="gsk_your-groq-api-key"
```

Get a free Groq API key at [console.groq.com](https://console.groq.com/keys) (no credit card required).

### 3. Run migrations and seed

```bash
npx prisma migrate dev --name init
npx prisma generate
npm run seed:ai
```

### 4. Start the server

```bash
npm run dev
```

### 5. Run tests

```bash
npm test
```

---

## How Prompt Versioning Works

Prompts are stored in the `PromptVersion` database table, not in source code. Each prompt has a name (e.g. `ticket_summarize`) and a version number. Only one version per name is active at any time.

**A/B testing:** Call any AI endpoint with `?version=N` to test a specific prompt version without changing the active version for other users.

**Promotion:** `PATCH /api/ai/prompts/ticket_summarize/versions/2/activate` atomically deactivates all other versions and promotes v2.

**Rollback:** Same endpoint, different version number. Instant, no code deploy needed.

---

## How Quality Evaluation Works

Every LLM call is automatically scored by three heuristic evaluators:

| Scorer | Weight | What it checks |
|--------|--------|---------------|
| Relevance | 40% | Term overlap between input prompt and LLM output |
| Coherence | 40% | Penalizes truncated sentences, repetition, excessive uppercase |
| Length | 20% | Output is within 20–400 words |

Composite score determines status:
- **Passed** (≥ 0.65) — Response is usable
- **Flagged** (≥ 0.40) — Review manually
- **Failed** (< 0.40) — Response is unusable

Monitor quality over time via `GET /api/ai/prompts/:name/eval-stats`.

---

## Future Improvements

- NotifyHub microservice integration — trigger notifications on failed AI evaluations and critical-priority tickets
- LLM-as-judge eval layer running async on a sample of calls for deeper quality signals
- Redis-backed prompt registry cache for multi-instance deployments
- Per-tenant LLM spend tracking with configurable monthly caps
- CI/CD pipeline with GitHub Actions (lint + test on every push)

---

## Author

**Amey Parle** — [GitHub](https://github.com/AmeyParle) · [LinkedIn](https://linkedin.com/in/amey-parle)
