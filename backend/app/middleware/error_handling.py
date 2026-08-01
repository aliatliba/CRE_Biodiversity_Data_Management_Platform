import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.services.auth_service import InvalidCredentialsError
from app.services.species_validation_service import AlreadyAssociatedError, DuplicateSpeciesError

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DuplicateSpeciesError)
    async def duplicate_species_handler(request: Request, exc: DuplicateSpeciesError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": str(exc),
                "existing_species_id": exc.existing.id,
            },
        )

    @app.exception_handler(AlreadyAssociatedError)
    async def already_associated_handler(request: Request, exc: AlreadyAssociatedError) -> JSONResponse:
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": str(exc)})

    @app.exception_handler(InvalidCredentialsError)
    async def invalid_credentials_handler(request: Request, exc: InvalidCredentialsError) -> JSONResponse:
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": str(exc)})

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception while processing request", exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"},
        )
