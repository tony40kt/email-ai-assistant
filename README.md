# Email AI Assistant

AI-powered email management assistant with cloud deployment.

> Status (as of 2026-04-14): This repository currently contains documentation only.
> Source code, infrastructure definitions, and CI/CD workflows will be added in upcoming milestones.

---

## Table of Contents

- [What this is](#what-this-is)
- [Key capabilities (planned)](#key-capabilities-planned)
- [Mailbox providers](#mailbox-providers)
- [High-level architecture](#high-level-architecture)
- [Security & privacy](#security--privacy)
- [Data model (draft)](#data-model-draft)
- [API (draft)](#api-draft)
- [Tech stack](#tech-stack)
- [Deployment (planned)](#deployment-planned)
- [Local development (planned)](#local-development-planned)
- [Configuration](#configuration)
- [Observability](#observability)
- [Testing strategy (planned)](#testing-strategy-planned)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## What this is

**Email AI Assistant** helps you handle email faster and more safely by providing:

- Email summarization
- Suggested replies (with optional tone/style controls)
- Classification and routing suggestions (labels/folders, priority, action items)
- Optional: drafting responses into your mailbox as **drafts** (not auto-sending)

The project is designed for **cloud deployment** and team-friendly operation (secrets management, auditability, and clear boundaries between "ingest", "LLM", and "mailbox actions").

---

## Key capabilities (planned)

### 1) Summarize incoming emails
- Short summary (1–3 lines)
- Key points / action items
- Extracted entities (people, dates, amounts, deadlines)

### 2) Suggest replies
- Multiple reply variants (short / medium / detailed)
- Tone controls (professional, friendly, concise)
- “Ask clarifying questions” mode when the email is ambiguous

### 3) Classify and triage
- Priority scoring
- Category/label suggestions (e.g., billing, support, recruiting, personal)
- SLA/time sensitivity detection (e.g., “needs response today”)

### 4) Safe mailbox actions (opt-in)
- Create **drafts** in Gmail/Outlook
- Apply labels/folders
- Never auto-send unless explicitly enabled

### 5) Admin & audit (for hosted use)
- Request/response logging with redaction
- Per-user access control
- Audit log for mailbox actions

---

## Mailbox providers

This project is planned to support **both**:

- **Gmail** via the **Gmail API** (Google Workspace / consumer accounts depending on OAuth configuration)
- **Microsoft 365 / Outlook** via **Microsoft Graph**

Provider-specific integration details (OAuth scopes, webhook/subscription strategy, pagination, rate limits) will be documented alongside the implementation.

---

## High-level architecture

A typical deployment is split into the following components:

1. **Mailbox Connector**
   - Integrates with Gmail API and Microsoft Graph
   - Fetches emails (metadata + content) under user consent
   - Writes drafts/labels (optional)

2. **Processing Pipeline**
   - Normalizes email content (HTML -> text)
   - Removes trackers/signatures (optional)
   - Creates an internal `EmailMessage` representation

3. **LLM Orchestrator**
   - Builds prompts with policies/guardrails
   - Calls the model provider
   - Produces structured outputs (JSON) for summaries, actions, and drafts

4. **Storage**
   - Stores minimal necessary data
   - Supports retention policies and deletion requests

5. **API + Web UI (optional)**
   - API for frontends/automation
   - UI for reviewing suggestions and approving actions

---

## Security & privacy

Email is sensitive. This project follows these principles:

- **Least privilege**: request only the mailbox scopes needed
- **Draft-first**: prefer creating drafts rather than sending automatically
- **Redaction**: support masking tokens, PII, and secrets in logs
- **Explicit consent**: user authorizes mailbox access via OAuth
- **Data minimization**: store only what’s needed for the feature
- **Retention controls**: configurable TTL and delete endpoints (planned)

> Note: Exact security implementation depends on the final hosting platform and will be documented alongside the code.

---

## Data model (draft)

Planned core objects (names may change):

- `UserAccount`
  - mailbox provider (`gmail` / `m365`)
  - oauth tokens (encrypted)
- `EmailMessage`
  - message id, thread id, from/to/cc, subject, received_at
  - normalized plain text content
- `EmailInsight`
  - summary, action items, priority score, suggested labels
  - suggested reply drafts (variants)
- `AuditEvent`
  - who did what/when (e.g., “created draft”, “applied label”)

---

## API (draft)

The API will likely expose endpoints similar to:

- `POST /v1/emails/ingest`
- `POST /v1/emails/{id}/summarize`
- `POST /v1/emails/{id}/suggest-reply`
- `POST /v1/emails/{id}/apply-actions` (draft creation, labeling, etc.)
- `GET  /v1/audit/events`

When code is added, this section will be replaced with an OpenAPI/Swagger spec.

---

## Tech stack

Primary implementation language: **Python**.

Planned components:

- API framework: **FastAPI** (planned)
- Background jobs: Celery/RQ/Arq (TBD)
- Storage: Postgres (TBD)
- Auth: OAuth for Google and Microsoft
- Deployment: Docker + cloud runtime (TBD)

---

## Deployment (planned)

Target deployment options:

- Docker-based deployment
- A managed cloud deployment (e.g., AWS/GCP/Azure)
- CI/CD using GitHub Actions
- Secrets handled via the cloud provider secret manager (or GitHub Actions secrets for simple setups)

---

## Local development (planned)

Once the codebase is added, the project will include:

- One-command local setup (e.g., `make dev` or `docker compose up`)
- Local environment variables in `.env.example`
- Local mock mailbox provider (optional)

---

## Configuration

Planned environment variables:

- `APP_ENV` — `local` | `staging` | `prod`
- `BASE_URL` — public URL of the API
- `LOG_LEVEL`

Mailbox providers:

- Gmail
  - `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`
- Microsoft 365 (Outlook)
  - `M365_CLIENT_ID`, `M365_CLIENT_SECRET`, `M365_TENANT_ID`

Model provider:

- `OPENAI_API_KEY` (or equivalent)
- `MODEL_NAME`

A complete `.env.example` will be added with the code.

---

## Observability

Planned observability features:

- Structured logs (JSON)
- Request correlation IDs
- Metrics (latency, error rate, model call count)
- Tracing hooks (optional)

---

## Testing strategy (planned)

- Unit tests for parsing, normalization, routing, prompt building
- Integration tests for mailbox providers (using mocks/sandboxes)
- Contract tests for API payloads
- Security tests (secret scanning, dependency scanning)

---

## Roadmap

### Milestone 0 — Documentation & scaffolding
- [ ] Finalize MVP scope (safe-by-default)
- [ ] Add Python project scaffold, linting, formatting, testing harness

### Milestone 1 — Minimal MVP (safe)
- [ ] Ingest a single email payload via API
- [ ] Summarize + extract action items
- [ ] Suggest 2–3 reply drafts (no auto-send)

### Milestone 2 — Mailbox connectors
- [ ] OAuth login + token storage (encrypted)
- [ ] Gmail: fetch messages + write drafts
- [ ] Microsoft Graph: fetch messages + write drafts
- [ ] Basic audit log

### Milestone 3 — Cloud deploy
- [ ] Docker image + production config
- [ ] CI/CD pipeline
- [ ] Observability baseline

---

## Contributing

Contributions are welcome once the initial scaffold lands.

Suggested flow (planned):

1. Create an issue describing the change
2. Fork the repo / create a branch
3. Add tests for new behaviors
4. Open a PR

---

## License

TBD. Add a `LICENSE` file before first release.
