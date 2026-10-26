import os
from typing import List

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.dependencies import ActiveUser, DBSession
from app.schemas.export import ExportRequest, ExportResponse
from app.services import export_service

router = APIRouter()


@router.post("", response_model=ExportResponse, status_code=201)
def create_export(data: ExportRequest, db: DBSession, user: ActiveUser):
    filters = data.filters.model_dump(mode="json", exclude_none=True) if data.filters else None

    return export_service.create_export(
        db,
        data.format,
        filters,
        user.id,
    )


@router.get("", response_model=List[ExportResponse])
def list_my_exports(db: DBSession, user: ActiveUser):
    """The signed-in user's own exports, newest first."""
    return export_service.list_exports(db, user.id)


@router.get("/options")
def get_export_options(db: DBSession, user: ActiveUser):
    return export_service.get_export_options(db)


@router.get("/{export_id}", response_model=ExportResponse)
def get_export(export_id: int, db: DBSession, user: ActiveUser):
    return export_service.get_export_for_user(db, export_id, user)


@router.get("/{export_id}/download")
def download_export(export_id: int, db: DBSession, user: ActiveUser):
    export = export_service.get_export_for_user(db, export_id, user)

    if export.status != "done" or not export.file_path or not os.path.exists(export.file_path):
        raise HTTPException(
            status_code=404,
            detail="Export file not ready or not found",
        )

    return FileResponse(
        path=export.file_path,
        filename=f"export_{export_id}.{export.format}",
        media_type="application/octet-stream",
    )
