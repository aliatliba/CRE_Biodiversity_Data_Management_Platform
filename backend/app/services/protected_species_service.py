from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.protected_species import ProtectedSpeciesList
from app.models.species import Species
from app.schemas.protected_species import ProtectedSpeciesCreate


def list_protected_species(db: Session, search: str | None = None) -> list[ProtectedSpeciesList]:
    query = db.query(ProtectedSpeciesList)
    if search:
        query = query.filter(ProtectedSpeciesList.scientific_name.ilike(f"%{search}%"))
    return query.order_by(ProtectedSpeciesList.scientific_name).all()


def sync_species_national_status(db: Session, scientific_name: str) -> int:
    """Recompute ``Species.national_status`` for the species matching
    ``scientific_name`` (scientific_name is CITEXT, so ``==`` is case-insensitive).

    Does not commit: callers run it in the same transaction as the change to the
    protected list. Returns the number of species rows updated.
    """
    is_protected = (
        db.query(ProtectedSpeciesList.id)
        .filter(ProtectedSpeciesList.scientific_name == scientific_name)
        .first()
        is not None
    )
    new_status = "Protected" if is_protected else "Non Protected"
    return (
        db.query(Species)
        .filter(Species.scientific_name == scientific_name, Species.national_status != new_status)
        .update({Species.national_status: new_status}, synchronize_session=False)
    )


def add_protected_species(
    db: Session, data: ProtectedSpeciesCreate, user_id: int
) -> ProtectedSpeciesList:
    existing = (
        db.query(ProtectedSpeciesList)
        .filter(ProtectedSpeciesList.scientific_name == data.scientific_name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This species is already on the protected list",
        )
    entry = ProtectedSpeciesList(
        scientific_name=data.scientific_name,
        source_reference=data.source_reference,
        added_by=user_id,
    )
    db.add(entry)
    db.flush()
    sync_species_national_status(db, entry.scientific_name)
    db.commit()
    db.refresh(entry)
    return entry


def remove_protected_species(db: Session, entry_id: int) -> None:
    entry = db.query(ProtectedSpeciesList).filter(ProtectedSpeciesList.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    name = entry.scientific_name
    db.delete(entry)
    db.flush()
    sync_species_national_status(db, name)
    db.commit()
