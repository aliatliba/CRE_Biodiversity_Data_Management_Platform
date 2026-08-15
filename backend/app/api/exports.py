from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.dependencies import DBSession, CurrentUser
from app.schemas.export import ExportRequest, ExportResponse
from app.services import export_service

router = APIRouter()


@router.post("", response_model=ExportResponse, status_code=201)
def create_export(
    data: ExportRequest, db: DBSession, user: CurrentUser
):
    return export_service.create_export(db, data.format, data.filters, user.id)


@router.get("/{export_id}", response_model=ExportResponse)
def get_export(export_id: int, db: DBSession, user: CurrentUser):
    return export_service.get_export(db, export_id)


@router.get("/{export_id}/download")
def download_export(export_id: int, db: DBSession, user: CurrentUser):
    export = export_service.get_export(db, export_id)
    if export.status != "done" or not export.file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export file not ready or not found",
        )
    return FileResponse(
        path=export.file_path,
        filename=f"export_{export_id}.{export.format}",
        media_type="application/octet-stream",
    )
