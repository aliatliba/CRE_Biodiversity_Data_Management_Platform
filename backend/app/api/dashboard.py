from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone

from app.core.dependencies import DBSession, CurrentUser
from app.models.species import Species
from app.models.site import Site
from app.models.site_species import SiteSpecies
from app.models.validation_history import SpeciesValidationHistory

router = APIRouter()


@router.get("/stats")
def dashboard_stats(db: DBSession, user: CurrentUser):
    total_species = db.query(Species).count()
    total_sites = db.query(Site).count()
    total_associations = db.query(SiteSpecies).count()

    status_counts = (
        db.query(Species.national_status, func.count(Species.id))
        .group_by(Species.national_status)
        .all()
    )
    status_breakdown = {s: c for s, c in status_counts}

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    validations_last_30 = (
        db.query(SpeciesValidationHistory)
        .filter(SpeciesValidationHistory.validated_at >= thirty_days_ago)
        .count()
    )

    return {
        "total_species": total_species,
        "total_sites": total_sites,
        "total_associations": total_associations,
        "status_breakdown": status_breakdown,
        "validations_last_30_days": validations_last_30,
    }
