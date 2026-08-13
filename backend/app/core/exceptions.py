import structlog
from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.exc import IntegrityError

logger = structlog.get_logger()


class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


async def validation_exception_handler(
    request: Request, exc: PydanticValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": exc.errors()},
    )


async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    logger.warning("integrity_error", path=request.url.path, error=str(exc.orig))
    return JSONResponse(
        status_code=409,
        content={"detail": "Database integrity error — possible duplicate or constraint violation"},
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Logged at ERROR with a full traceback so `docker compose logs api` (or `docker logs <container>`)
    # shows the real cause, even though the HTTP response body stays generic on purpose.
    logger.error("unhandled_exception", path=request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred"},
    )
