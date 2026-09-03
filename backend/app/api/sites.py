from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import DBSession, ActiveUser, AdminUser
from app.schemas.site import SiteCreate, SiteUpdate, SiteResponse
from app.services import site_service

router = APIRouter()


@router.get("", response_model=List[SiteResponse])
def list_sites(
    db: DBSession,
    user: ActiveUser,
    search: str | None = Query(None),
):
    return site_service.list_sites(db, search)


@router.post("", response_model=SiteResponse, status_code=201)
def create_site(data: SiteCreate, db: DBSession, admin: AdminUser):
    return site_service.create_site(db, data, admin.id)


@router.get("/{site_id}", response_model=SiteResponse)
def get_site(site_id: int, db: DBSession, user: ActiveUser):
    return site_service.get_site(db, site_id)


@router.patch("/{site_id}", response_model=SiteResponse)
def update_site(
    site_id: int, data: SiteUpdate, db: DBSession, admin: AdminUser
):
    return site_service.update_site(db, site_id, data)


@router.delete("/{site_id}")
def delete_site(
    site_id: int,
    db: DBSession,
    admin: AdminUser,
    force: bool = False,
):
    site_service.delete_site(db, site_id, force)
    return {"detail": "Site deleted"}
