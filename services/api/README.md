# Founder OS API

## Environment

Copy root `.env.example` to `services/api/.env` or set:

- `DATABASE_URL` — async Postgres URL (`postgresql+asyncpg://...`) using **`founder_os_app`** (not Guardian admin).
- `SUPABASE_JWT_SECRET` — JWT secret from Supabase project settings (JWT signing).
- `FOUNDER_USER_IDS` — comma-separated UUIDs **or** `FOUNDER_EMAIL_ALLOWLIST` — comma-separated emails.
- `CORS_ORIGINS` — production web origins (comma-separated); dev uses `*`.

## Run

```bash
uvicorn founder_os_api.app_factory:app --reload --port 8000
```

## Tests

```bash
pytest -v
```
