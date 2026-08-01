from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.protected_species import ProtectedSpeciesList

PROTECTED = "Protected"
NON_PROTECTED = "Non Protected"


class NationalStatusService:
    """Implements the client's rule: if the species is in the organization's
    protected list -> Protected, else Non Protected. Synonym-aware matching
    is explicitly future work — see README Section 17.
    """

    def __init__(self, db: Session):
        self.db = db

    def compute(self, scientific_name: str) -> str:
        stmt = select(ProtectedSpeciesList).where(ProtectedSpeciesList.scientific_name == scientific_name)
        match = self.db.execute(stmt).scalar_one_or_none()
        return PROTECTED if match is not None else NON_PROTECTED
