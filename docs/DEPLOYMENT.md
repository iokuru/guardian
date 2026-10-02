# Deployment Guide

This guide covers deploying Guardian to production using:
- **Supabase**: Managed PostgreSQL database
- **Render**: Backend API web service
- **Cloudflare Pages**: Frontend dashboard static hosting

---

## 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Project Settings** -> **Database** and copy the URI connection string:
   ```text
   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   (Guardian automatically normalizes `postgres://` to `postgresql://` and enables connection pool pre-ping).
3. The backend runs migrations on startup or via alembic:
   ```bash
   alembic upgrade head
   ```

---

## 2. Backend (Render)

### Option A: Blueprint (`render.yaml`)
1. In Render, click **New +** -> **Blueprint**.
2. Connect your Guardian repository. Render detects `render.yaml`.
3. Set the `DATABASE_URL` environment variable to your Supabase connection string.
4. Render will generate `JWT_SECRET_KEY` and build `backend/requirements.txt`.

### Option B: Manual Web Service
- **Build command**: `pip install -r backend/requirements.txt`
- **Start command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Environment variables**:
  - `PYTHON_VERSION`: `3.11.0`
  - `DATABASE_URL`: Your Supabase PostgreSQL URI
  - `JWT_SECRET_KEY`: A 64-character random string
  - `CORS_ORIGINS`: `https://<your-cloudflare-pages-domain>.pages.dev` (or `*`)

Health check URL: `https://<your-backend-url>.onrender.com/health`

---

## 3. Frontend (Cloudflare Pages)

1. In Cloudflare dashboard, go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
2. Select your Guardian repository.
3. Configure build settings:
   - **Framework preset**: Vite
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://<your-backend-url>.onrender.com`
5. Deploy. Cloudflare Pages reads `frontend/public/_redirects` to handle client-side routing automatically.

---

## 4. Testing SDK Against Deployed API

Install the SDK and test directly:

```bash
pip install guardian-sdk
```

```python
from guardian import Guardian

guardian = Guardian(
    api_key="gdn_live_...",
    base_url="https://<your-backend-url>.onrender.com",
)

result = guardian.analyze(
    action="Delete all customer records",
    context="Production database",
    agent_id="customer-support-agent",
)

print(result.request_id, result.decision, result.is_allowed)
```
