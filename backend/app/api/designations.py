from typing import List

from fastapi import APIRouter

from app.core.dependencies import ActiveUser
from app.core.designations import CATALOG
from app.schemas.site import DesignationResponse

router = APIRouter()


@router.get("", response_model=List[DesignationResponse])
def list_designations(user: ActiveUser):
    """The designation catalog, in display order."""
    return [d.as_dict() for d in sorted(CATALOG, key=lambda d: d.sort_order)]
