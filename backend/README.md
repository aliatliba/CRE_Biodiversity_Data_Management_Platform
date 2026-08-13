# Biodiversity Platform Backend

## Quick Start

1. Create the database:
   ```bash
   docker-compose up -d db
   # OR manually: createdb biodiversity_db
   ```

2. Run migrations:
   ```bash
   alembic upgrade head
   ```

3. Start the app:
   ```bash
   uvicorn app.main:app --reload
   ```

4. Default admin credentials:
   - Email: `admin@biodiversity.local`
   - Password: `admin123`
   - **Change these immediately in production.**

## Testing

Requires a test PostgreSQL database:

```bash
createdb biodiversity_test_db
pytest
```

Set `TEST_DATABASE_URL` env var to override the default test database URL.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | PostgreSQL Docker URL | Main database connection |
| `JWT_SECRET_KEY` | `change-me-in-production` | JWT signing key |
| `IUCN_API_TOKEN` | — | IUCN Red List API token |
| `EXPORTS_DIR` | `./exports` | Where export files are stored |
| `TEST_DATABASE_URL` | `postgresql://.../biodiversity_test_db` | Test database |

## Docker

```bash
docker-compose up --build
```

The API will be available at `http://localhost:8000`.
API documentation at `http://localhost:8000/docs`.
