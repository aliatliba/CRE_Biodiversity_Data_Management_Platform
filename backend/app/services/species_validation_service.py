from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.site_species import SiteSpecies
from app.models.species import Species
from app.models.validation_history import SpeciesValidationHistory
from app.repositories.species_repository import SpeciesRepository
from app.schemas.species import SpeciesCreate, SpeciesUpdate
from app.services.national_status_service import NationalStatusService


class DuplicateSpeciesError(Exception):
    """Raised when POST /species is called for a scientific_name that already
    exists. The API layer should catch this and return 409, per README
    Section 10 — the client should have called /species/check first.
    """

    def __init__(self, existing: Species):
        self.existing = existing
        super().__init__(f"Species '{existing.scientific_name}' already exists (id={existing.id})")


class AlreadyAssociatedError(Exception):
    """Raised when a species is already linked to the requested site."""


class SpeciesValidationService:
    def __init__(self, db: Session):
        self.db = db
        self.species = SpeciesRepository(db)
        self.national_status = NationalStatusService(db)

    def check_duplicate(self, scientific_name: str) -> Species | None:
        return self.species.get_by_scientific_name(scientific_name)

    def validate_and_save(self, payload: SpeciesCreate, user_id: int) -> Species:
        """Creates a brand-new, validated species record + its site association.

        Raises DuplicateSpeciesError if scientific_name already exists —
        callers should have routed the request through the duplicate-handling
        workflow (README Section 12) instead of reaching this path.
        """
        existing = self.check_duplicate(payload.scientific_name)
        if existing is not None:
            raise DuplicateSpeciesError(existing)

        now = datetime.now(timezone.utc)
        field_sources = (
            {k: v.model_dump(mode="json") for k, v in payload.field_sources.items()}
            if payload.field_sources
            else None
        )

        species = Species(
            scientific_name=payload.scientific_name,
            kingdom=payload.kingdom,
            class_name=payload.class_name,
            order_name=payload.order_name,
            family=payload.family,
            genus=payload.genus,
            species_epithet=payload.species_epithet,
            common_name=payload.common_name,
            raw_taxonomy_extra=payload.raw_taxonomy_extra,
            field_sources=field_sources,
            iucn_status=payload.iucn_status,
            iucn_trend=payload.iucn_trend,
            national_status=self.national_status.compute(payload.scientific_name),
            guild=payload.guild,
            ecosystem_service=payload.ecosystem_service,
            habitat=payload.habitat,
            typology=payload.typology,
            endemism=payload.endemism,
            potential_threats=payload.potential_threats,
            reference=payload.reference,
            status="validated",
            created_by=user_id,
            validated_by=user_id,
            validated_at=now,
        )
        self.species.create(species)

        self.species.add_history_entry(
            SpeciesValidationHistory(
                species_id=species.id,
                action="created",
                changed_fields={"scientific_name": {"old": None, "new": species.scientific_name}},
                validated_by=user_id,
            )
        )

        self.associate_with_site(species_id=species.id, site_id=payload.site_id, user_id=user_id)
        return species

    def update_and_revalidate(self, species: Species, payload: SpeciesUpdate, user_id: int) -> Species:
        """Updates permitted fields on an existing species and writes an audit entry.
        See README Section 12 for which fields are considered "permitted".
        """
        changes = payload.model_dump(exclude_unset=True)
        changed_fields = {}
        for field_name, new_value in changes.items():
            old_value = getattr(species, field_name)
            if old_value != new_value:
                changed_fields[field_name] = {"old": old_value, "new": new_value}
                setattr(species, field_name, new_value)

        if changed_fields:
            species.validated_by = user_id
            species.validated_at = datetime.now(timezone.utc)
            self.species.update(species)
            self.species.add_history_entry(
                SpeciesValidationHistory(
                    species_id=species.id,
                    action="updated",
                    changed_fields=changed_fields,
                    validated_by=user_id,
                )
            )
        return species

    def associate_with_site(self, species_id: int, site_id: int, user_id: int, notes: str | None = None) -> SiteSpecies:
        existing = self.species.get_association(site_id=site_id, species_id=species_id)
        if existing is not None:
            raise AlreadyAssociatedError("This species is already recorded at this site")

        association = SiteSpecies(site_id=site_id, species_id=species_id, recorded_by=user_id, notes=notes)
        return self.species.create_association(association)
