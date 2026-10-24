from fastapi import APIRouter, Query

from app.core.dependencies import ActiveUser, DBSession
from app.services import dashboard_service

router = APIRouter()


@router.get("/stats")
def dashboard_stats(
    db: DBSession,
    user: ActiveUser,
    site_id: int | None = Query(None),
    include_extra: bool = Query(
        False,
        description="Also return total_associations, completeness_breakdown and "
        "validations_last_30_days (not shown by the frontend).",
    ),
):
    return dashboard_service.get_dashboard_stats(db, site_id, include_extra)
