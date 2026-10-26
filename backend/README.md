# Biodiversity Platform — Backend

FastAPI + SQLAlchemy 2 + Alembic on PostgreSQL (needs the `citext` and `pg_trgm` extensions; migrations create them).

## Quick start

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt

cp .env.example .env            # or create .env with the variables below
alembic upgrade head            # create / update the schema
uvicorn app.main:app --reload   # http://localhost:8000  (docs at /docs)
```

A first admin account is seeded on first start (`INITIAL_ADMIN_EMAIL`). Set `INITIAL_ADMIN_PASSWORD`, or read the random password printed once in the log (`initial_admin_created`); it must be changed on first sign-in.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | Docker Postgres URL | Main database |
| `JWT_SECRET_KEY` | `change-me-in-production` | JWT signing key. Must be ≥ 32 random characters unless `ENVIRONMENT` is `development`/`test` (startup fails otherwise) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | `15` / `7` | Token lifetimes. Refresh tokens rotate on every use and are stored in `refresh_tokens` |
| `ENVIRONMENT` | `development` | `test` is set by the test suite; `production` hides `/docs` |
| `DEBUG` | `false` | Starlette debug mode (sends tracebacks to clients: local use only) |
| `API_DOCS_ENABLED` | unset | Force `/docs`, `/redoc`, `/openapi.json` on or off |
| `LOG_LEVEL` | `INFO` | Root log level |
| `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` | `admin@biodiversity.local` / random | First admin account |
| `LOGIN_MAX_FAILED_ATTEMPTS` / `LOGIN_LOCKOUT_MINUTES` | `5` / `15` | Per-account lockout after failed sign-ins |
| `FORWARDED_ALLOW_IPS` | `127.0.0.1` | Read by uvicorn: proxies trusted for `X-Forwarded-For` (rate limits are per client IP) |
| `PROVIDER_CONTACT` | — | Contact sent to GBIF / Wikidata in the User-Agent |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:8080` | Comma-separated origins |
| `IUCN_API_TOKEN` | — | IUCN Red List token (without it IUCN lookups report an error instead of data) |
| `EXPORTS_DIR` | `./exports` | Export output; old files are purged |
| `GRAPHICS_DIR`, `GRAPHICS_CACHE_DIR` | derived | Graphics output / cache |
| `GRAPHICS_DPI`, `GRAPHICS_MAX_RSS_MB`, `GRAPHICS_MAX_CONCURRENT` | `200`, `350`, `1` | R graphics limits |
| `GRAPHICS_MAX_PENDING_JOBS` | `5` | Graphics jobs queued or running across all users |
| `MAX_ACTIVE_JOBS_PER_USER` | `1` | Queued/running jobs per user and job type (bulk import, batch lookup, graphics) |
| `JOB_TTL_SECONDS` | `3600` | How long finished background jobs stay in memory |
| `EXPORTS_RETENTION_HOURS`, `GRAPHICS_RETENTION_HOURS` | `24` | Generated-file retention |
| `LOOKUP_BATCH_CONCURRENCY` | `3` | Species looked up in parallel in a batch |
| `PROVIDER_CACHE_TTL_SECONDS` | `86400` | Cache for GBIF/POWO/IUCN responses |
| `TEST_DATABASE_URL` | local `biodiversity_test_db` | Database used by the tests |

## Migrations

```bash
alembic upgrade head      # apply
alembic check             # fails if models and migrations drifted
alembic revision --autogenerate -m "describe change"
```

Applied revisions are never edited; add a new one.

## Tests and lint

The tests run offline (external providers are faked). Unit tests (`tests/unit`) need no database; integration tests use a **separate** Postgres database, never the dev one:

```bash
createdb biodiversity_test_db        # user/password as in TEST_DATABASE_URL
TEST_DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/biodiversity_test_db pytest -q
ruff check .
pip-audit -r requirements.txt   # known vulnerabilities (also run in CI)
```

Each test runs in a rolled-back transaction. The suite creates the `citext` / `pg_trgm` extensions itself.

## Docker

```bash
docker-compose up --build
```

API at `http://localhost:8000`, docs at `http://localhost:8000/docs`. The container runs `./start.sh` (migrations, then the server).
