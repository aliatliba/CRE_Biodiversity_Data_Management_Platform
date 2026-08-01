from fastapi import APIRouter

from app.api.v1 import auth, dashboard, exports, sites, species, users

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(sites.router)
api_router.include_router(species.router)
api_router.include_router(exports.router)
api_router.include_router(dashboard.router)
