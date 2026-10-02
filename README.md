# Guardian

Action review and policy enforcement for automated systems.

Guardian acts as an inline security and policy layer between autonomous agents and infrastructure tools. When an agent attempts an operation (e.g. database migration, bash command, credential lookup, or data export), Guardian evaluates the action against active workspace policies, enforces risk boundaries, requests human approval when necessary, and maintains an immutable audit trail.

```text
Automated System (Agent / Workflow)
                ↓
           Guardian API
                ↓
         Action Analysis
                ↓
        Policy Evaluation
                ↓
             Decision
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
  allow               review_required
                            ↓
                      Human Review
                            ↓
                    approve / reject
                            ↓
                     Audit Timeline
```

The `request_id` is preserved through every stage of this lifecycle.

---

## Architecture

- **`backend/`**: FastAPI service with PostgreSQL persistence, JWT & Argon2 API key authentication, multi-tenant workspace isolation, and risk evaluation engine.
- **`frontend/`**: Single-page application built with React 19, TypeScript, and Vite, featuring an action evaluation workbench, real-time review queue, and audit log investigation drawer.
- **`sdk/python/`**: Official Python client (`guardian-sdk`) for agent integration.
- **`docs/`**: Production deployment guides for Supabase, Render, and Cloudflare Pages.

---

## Python SDK Quickstart

### Installation

```bash
pip install guardian-sdk
```

### Usage

```python
from guardian import Guardian

guardian = Guardian(
    api_key="gdn_live_..."
)

result = guardian.analyze(
    action="Delete all customer records",
    context="Production database",
    agent_id="customer-support-agent",
)

if result.is_allowed:
    perform_action()

elif result.is_review_required:
    review = guardian.wait_for_review(result.request_id, timeout_seconds=300)
    if review and review.is_approved:
        perform_action()
    else:
        abort_action()

else:
    abort_action()
```

---

## Local Development

### 1. Database & Backend

Using Docker Compose:

```bash
docker compose up -d
```

Or manually:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Dashboard

```bash
cd frontend
npm install
npm run dev
```

Dashboard runs at `http://localhost:5173`.

---

## Verification & Testing

### Backend & Python SDK Tests

```bash
cd backend
pytest

cd ../sdk/python
pytest
```

### Frontend Unit & Component Tests

```bash
cd frontend
npm run test
```

### End-to-End Browser Tests

```bash
cd frontend
npm run build
npm run test:e2e
```

---

## Production Deployment

Production deployments use:
- **Supabase**: Managed PostgreSQL database
- **Render**: Backend API web service (`render.yaml` blueprint included)
- **Cloudflare Pages**: Static frontend hosting (`frontend/public/_redirects` included)

For configuration instructions and environment variable references, see [Deployment Guide](docs/DEPLOYMENT.md).
