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

A dev admin account is seeded on first start (`admin@biodiversity.local` / `admin123`). This is for development only.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | Docker Postgres URL | Main database |
| `JWT_SECRET_KEY` | `change-me-in-production` | JWT signing key |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | `15` / `7` | Token lifetimes |
| `ENVIRONMENT` | `development` | `test` is set by the test suite |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:8080` | Comma-separated origins |
| `IUCN_API_TOKEN` | — | IUCN Red List token (without it IUCN lookups report an error instead of data) |
| `EXPORTS_DIR` | `./exports` | Export output; old files are purged |
| `GRAPHICS_DIR`, `GRAPHICS_CACHE_DIR` | derived | Graphics output / cache |
| `GRAPHICS_DPI`, `GRAPHICS_MAX_RSS_MB`, `GRAPHICS_MAX_CONCURRENT` | `200`, `350`, `1` | R graphics limits |
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

The tests run offline (external providers are faked) against a **separate** Postgres database, never the dev one:

```bash
createdb biodiversity_test_db        # user/password as in TEST_DATABASE_URL
TEST_DATABASE_URL=postgresql+psycopg2://user:pass@localhost:5432/biodiversity_test_db pytest -q
ruff check .
```

Each test runs in a rolled-back transaction. The suite creates the `citext` / `pg_trgm` extensions itself.

## Docker

```bash
docker-compose up --build
```

API at `http://localhost:8000`, docs at `http://localhost:8000/docs`. The container runs `./start.sh` (migrations, then the server).
