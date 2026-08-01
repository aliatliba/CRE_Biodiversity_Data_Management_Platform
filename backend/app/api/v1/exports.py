from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.user import User
from app.repositories.export_repository import ExportRepository
from app.schemas.export import ExportRead, ExportRequest
from app.services.export_service import ExportService

router = APIRouter(prefix="/exports", tags=["exports"])


@router.post("", response_model=ExportRead, status_code=status.HTTP_201_CREATED)
def request_export(
    payload: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # V1 runs synchronously for the expected data volume (README Section 15).
    # For larger datasets, swap this call for a FastAPI BackgroundTasks call
    # without changing the API contract.
    return ExportService(db).create_and_run(requested_by=current_user.id, fmt=payload.format, filters=payload.filters)


@router.get("/{export_id}", response_model=ExportRead)
def get_export(export_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    export = ExportRepository(db).get_by_id(export_id)
    if export is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export not found")
    return export


@router.get("/{export_id}/download")
def download_export(export_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    export = ExportRepository(db).get_by_id(export_id)
    if export is None or export.status != "done" or not export.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export not ready or not found")
    media_type = "text/csv" if export.format == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return FileResponse(export.file_path, media_type=media_type, filename=f"export_{export.id}.{export.format}")
