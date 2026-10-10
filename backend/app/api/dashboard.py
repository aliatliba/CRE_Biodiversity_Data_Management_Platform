from fastapi import APIRouter, Query

from app.core.dependencies import ActiveUser, DBSession
from app.services import dashboard_service

router = APIRouter()


@router.get("/stats")
def dashboard_stats(
    db: DBSession,
    user: ActiveUser,
    site_id: int | None = Query(None),
):
    return dashboard_service.get_dashboard_stats(db, site_id)
