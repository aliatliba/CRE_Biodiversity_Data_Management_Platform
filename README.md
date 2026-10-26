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
# compose reads JWT_SECRET_KEY, IUCN_API_TOKEN, CORS_ORIGINS, VITE_API_URL
# from the shell or a root .env file (see backend/.env.example for the meaning)
docker compose up --build
```

- Frontend: http://localhost:8080
- API: http://localhost:8000 (docs at /docs, hidden when `ENVIRONMENT=production`)
- Postgres is only reachable inside the compose network.

The `api` container runs `alembic upgrade head` on startup, so the schema
(including the `phone` / `must_change_password` columns) is always current.

A first admin is seeded on first boot (`INITIAL_ADMIN_EMAIL`, default
`admin@biodiversity.local`). Its password is `INITIAL_ADMIN_PASSWORD` if set,
otherwise a random one printed once in the API log (`initial_admin_created`).
Either way it must be replaced on first sign-in, through the same
"set a new password" flow researchers use. Databases seeded by older versions
with the published `admin123` password are forced through that flow by
migration 006.

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
| `JWT_SECRET_KEY` | backend | Signs access/refresh tokens. Generate with `python -c "import secrets; print(secrets.token_urlsafe(64))"`. Outside `ENVIRONMENT=development`/`test` the API refuses to start with a weak one |
| `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` | backend | First admin account (see above) |
| `FORWARDED_ALLOW_IPS` | backend | Behind a reverse proxy: the proxy IPs, so rate limiting sees real client IPs |
| `IUCN_API_TOKEN` | backend | IUCN Red List API access |
| `CORS_ORIGINS` | backend | Comma-separated origins allowed to call the API from a browser |
| `VITE_API_URL` | frontend (build-time) | Base URL the frontend calls for the API |

None of the `.env` files are committed — only the `.env.example` templates
(`backend/.env.example`, `frontend/.env.example`). The full backend list is in
`backend/README.md`.
