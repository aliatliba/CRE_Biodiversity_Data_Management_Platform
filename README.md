# Biodiversity Data Entry Platform

A field biodiversity registry: admins provision sites and researcher
accounts, researchers log species observations that get cross-checked
against GBIF, IUCN Red List, POWO, iNaturalist, and Wikidata.

```
biodiversity-platform/
├── backend/    FastAPI + PostgreSQL API
├── frontend/   React + Vite web app ("BioData")
└── docker-compose.yml
```

## Run everything with Docker

```bash
cp .env.example .env
# edit .env — at minimum set JWT_SECRET_KEY

docker compose up --build
```

- Frontend: http://localhost:8080
- API: http://localhost:8000 (docs at /docs)
- Postgres: localhost:5432 (user/pass/db: `biodiversity`)

The `api` container runs `alembic upgrade head` on startup, so the schema
(including the `phone` / `must_change_password` columns) is always current.

A default admin is seeded on first boot:
- **email:** `admin@biodiversity.local`
- **password:** `admin123`

Change this password immediately in a real deployment — sign in, then use
the same "set a new password" flow researchers use.

## The first-login flow

1. Admin signs in, creates a researcher account (`POST /users`) with a
   temporary password.
2. Researcher signs in with that temporary password. The login response
   includes `must_change_password: true`, so the frontend redirects to
   `/complete-profile` instead of the dashboard.
3. Researcher submits their temporary password + a new one (+ optional
   name/phone) to `POST /auth/complete-profile`. From then on
   `must_change_password` is `false` and they can reach the main app.

This is enforced on the backend too (`ActiveUser` dependency), not just in
the frontend router.

## Running services individually (local dev, no Docker)

**Backend** — see `backend/README.md`. Needs Postgres reachable at the URL
in `backend/.env`.

**Frontend**:
```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000
npm run dev             # http://localhost:5173
```

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `JWT_SECRET_KEY` | backend | Signs access/refresh tokens. Generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `IUCN_API_TOKEN` | backend | IUCN Red List API access |
| `CORS_ORIGINS` | backend | Comma-separated origins allowed to call the API from a browser |
| `VITE_API_URL` | frontend (build-time) | Base URL the frontend calls for the API |

None of the `.env` files are committed — only the `.env.example` templates.
