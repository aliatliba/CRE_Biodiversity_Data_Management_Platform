#!/bin/sh
set -e
echo "[start] running migrations"
alembic upgrade head
echo "[start] migrations done, starting uvicorn on port ${PORT:-8000}"
# Behind a reverse proxy (Render, nginx...) set FORWARDED_ALLOW_IPS to the proxy's
# address(es) so uvicorn takes the client IP from X-Forwarded-For; the login rate limit
# is per client IP. uvicorn reads FORWARDED_ALLOW_IPS itself (default 127.0.0.1).
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers
