from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.protected_species import ProtectedSpeciesList
from app.schemas.protected_species import ProtectedSpeciesCreate


def list_protected_species(db: Session, search: str | None = None) -> list[ProtectedSpeciesList]:
    query = db.query(ProtectedSpeciesList)
    if search:
        query = query.filter(ProtectedSpeciesList.scientific_name.ilike(f"%{search}%"))
    return query.order_by(ProtectedSpeciesList.scientific_name).all()


def add_protected_species(
    db: Session, data: ProtectedSpeciesCreate, user_id: int
) -> ProtectedSpeciesList:
    existing = (
        db.query(ProtectedSpeciesList)
        .filter(func.lower(ProtectedSpeciesList.scientific_name) == func.lower(data.scientific_name))
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
    db.commit()
    db.refresh(entry)
    return entry


def remove_protected_species(db: Session, entry_id: int) -> None:
    entry = db.query(ProtectedSpeciesList).filter(ProtectedSpeciesList.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    db.delete(entry)
    db.commit()
