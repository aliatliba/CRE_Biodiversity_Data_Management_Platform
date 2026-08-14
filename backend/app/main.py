from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import IntegrityError

from app.api import router as api_router
from app.core.db import init_extensions, SessionLocal
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.exceptions import (
    app_exception_handler,
    integrity_error_handler,
    generic_exception_handler,
    AppException,
)
from app.core.limiter import limiter
from app.models.role import Role
from app.models.user import User
from app.core.security import get_password_hash


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    settings = get_settings()
    if settings.environment != "test":
        init_extensions()
        seed_database()
    yield


app = FastAPI(
    title="Biodiversity Data Entry Platform",
    version="1.0.0",
    lifespan=lifespan,
    debug=True
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RateLimitExceeded, app_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.state.limiter = limiter
app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok"}


def seed_database() -> None:
    db = SessionLocal()
    try:
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            admin_role = Role(name="admin", description="Administrator")
            db.add(admin_role)
            researcher_role = Role(name="researcher", description="Researcher")
            db.add(researcher_role)
            db.commit()
            db.refresh(admin_role)

        admin_user = db.query(User).filter(User.email == "admin@biodiversity.local").first()
        if not admin_user:
            admin_user = User(
                email="admin@biodiversity.local",
                hashed_password=get_password_hash("admin123"),
                full_name="Default Admin",
                role_id=admin_role.id,
            )
            db.add(admin_user)
            db.commit()
    finally:
        db.close()
