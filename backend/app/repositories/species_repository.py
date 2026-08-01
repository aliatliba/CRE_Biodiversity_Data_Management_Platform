from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.site_species import SiteSpecies
from app.models.species import Species
from app.models.validation_history import SpeciesValidationHistory


class SpeciesRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, species_id: int) -> Species | None:
        return self.db.get(Species, species_id)

    def get_by_scientific_name(self, scientific_name: str) -> Species | None:
        # Species.scientific_name is CITEXT, so this comparison is case-insensitive
        # at the database level already.
        stmt = select(Species).where(Species.scientific_name == scientific_name)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_species(
        self,
        status: str | None = None,
        family: str | None = None,
        national_status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Species]:
        stmt = select(Species).order_by(Species.scientific_name).limit(limit).offset(offset)
        if status:
            stmt = stmt.where(Species.status == status)
        if family:
            stmt = stmt.where(Species.family == family)
        if national_status:
            stmt = stmt.where(Species.national_status == national_status)
        return list(self.db.execute(stmt).scalars().all())

    def create(self, species: Species) -> Species:
        self.db.add(species)
        self.db.flush()
        return species

    def update(self, species: Species) -> Species:
        self.db.flush()
        return species

    def add_history_entry(self, entry: SpeciesValidationHistory) -> SpeciesValidationHistory:
        self.db.add(entry)
        self.db.flush()
        return entry

    def get_history(self, species_id: int) -> list[SpeciesValidationHistory]:
        stmt = (
            select(SpeciesValidationHistory)
            .where(SpeciesValidationHistory.species_id == species_id)
            .order_by(SpeciesValidationHistory.validated_at.desc())
        )
        return list(self.db.execute(stmt).scalars().all())

    # --- site_species association ---

    def get_association(self, site_id: int, species_id: int) -> SiteSpecies | None:
        stmt = select(SiteSpecies).where(
            SiteSpecies.site_id == site_id, SiteSpecies.species_id == species_id
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def create_association(self, association: SiteSpecies) -> SiteSpecies:
        self.db.add(association)
        self.db.flush()
        return association

    def list_species_for_site(self, site_id: int) -> list[SiteSpecies]:
        stmt = select(SiteSpecies).where(SiteSpecies.site_id == site_id)
        return list(self.db.execute(stmt).scalars().all())

    def delete_association(self, association: SiteSpecies) -> None:
        self.db.delete(association)
        self.db.flush()
