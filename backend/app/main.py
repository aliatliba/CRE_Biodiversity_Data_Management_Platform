import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from slowapi.errors import RateLimitExceeded
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware  # add this import

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
from app.models.protected_species import ProtectedSpeciesList
from app.core.security import get_password_hash

PROTECTED_SPECIES_SEED_FILE = (
    Path(__file__).resolve().parent / "data" / "protected_species_dz.json"
)


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

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
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
                must_change_password=False,
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        seed_protected_species(db, admin_user)
    finally:
        db.close()


def seed_protected_species(db, admin_user: User) -> None:
    """Populate protected_species_list with Algeria's nationally protected
    animal and plant species, sourced from:
      - Décret exécutif n° 12-235 du 24 mai 2012 (JO n° 35 du 10 juin 2012)
        - protected non-domestic animal species
      - Décret exécutif n° 12-03 du 4 janvier 2012 (JO n° 03 du 18 janvier 2012)
        - protected non-cultivated plant species

    Mirrors the admin-account seeding above: runs on every startup, but only
    inserts species that are not already present (matched case-insensitively
    on scientific_name, which is a CITEXT column).
    """
    if not PROTECTED_SPECIES_SEED_FILE.exists():
        return

    already_seeded = db.query(ProtectedSpeciesList.id).first() is not None
    if already_seeded:
        return

    with open(PROTECTED_SPECIES_SEED_FILE, encoding="utf-8") as f:
        species_data = json.load(f)

    existing_names = {
        name.lower()
        for (name,) in db.query(ProtectedSpeciesList.scientific_name).all()
    }

    new_rows = []
    for item in species_data:
        scientific_name = (item.get("scientific_name") or "").strip()
        if not scientific_name:
            continue
        if scientific_name.lower() in existing_names:
            continue
        existing_names.add(scientific_name.lower())
        new_rows.append(
            ProtectedSpeciesList(
                scientific_name=scientific_name,
                source_reference=item.get("source_reference"),
                added_by=admin_user.id,
            )
        )

    if new_rows:
        db.bulk_save_objects(new_rows)
        db.commit()