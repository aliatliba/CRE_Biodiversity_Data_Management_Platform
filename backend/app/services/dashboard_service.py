from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.site import Site
from app.models.species import Species
from app.models.validation_history import SpeciesValidationHistory


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def stats(self) -> dict:
        total_species = self.db.execute(select(func.count(Species.id))).scalar_one()
        total_sites = self.db.execute(select(func.count(Site.id))).scalar_one()

        by_national_status = dict(
            self.db.execute(
                select(Species.national_status, func.count(Species.id)).group_by(Species.national_status)
            ).all()
        )

        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        recent_validations = self.db.execute(
            select(func.count(SpeciesValidationHistory.id)).where(
                SpeciesValidationHistory.validated_at >= thirty_days_ago
            )
        ).scalar_one()

        return {
            "total_species": total_species,
            "total_sites": total_sites,
            "species_by_national_status": by_national_status,
            "validations_last_30_days": recent_validations,
        }
