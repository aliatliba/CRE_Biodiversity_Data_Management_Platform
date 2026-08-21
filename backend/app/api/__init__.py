from fastapi import APIRouter
from app.api import auth, users, sites, species, exports, dashboard, protected_species

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(sites.router, prefix="/sites", tags=["sites"])
router.include_router(species.router, prefix="/species", tags=["species"])
router.include_router(exports.router, prefix="/exports", tags=["exports"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
router.include_router(
    protected_species.router, prefix="/protected-species", tags=["protected-species"]
)
