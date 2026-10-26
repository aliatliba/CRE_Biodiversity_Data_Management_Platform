import uuid

import structlog
from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DataError, IntegrityError

logger = structlog.get_logger()


class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class BadRequestError(AppException):
    def __init__(self, message: str):
        super().__init__(message, 400)


class UnauthorizedError(AppException):
    def __init__(self, message: str):
        super().__init__(message, 401)


class ForbiddenError(AppException):
    def __init__(self, message: str):
        super().__init__(message, 403)


class NotFoundError(AppException):
    def __init__(self, message: str):
        super().__init__(message, 404)


class ConflictError(AppException):
    def __init__(self, message: str):
        super().__init__(message, 409)


class TooManyRequestsError(AppException):
    def __init__(self, message: str):
        super().__init__(message, 429)


class UserFacingError(Exception):
    """An error whose message was written for end users (no paths, SQL or stack
    details) and may be shown as-is, e.g. as a background job's error."""


def public_error_message(exc: BaseException, event: str = "unexpected_error") -> str:
    """Message that is safe to send to a client for ``exc``.

    Messages written for users (AppException, UserFacingError) pass through. Anything
    else is logged with a short reference and replaced by a generic text quoting it,
    so the details stay in the server logs.
    """
    if isinstance(exc, AppException):
        return exc.message
    if isinstance(exc, UserFacingError):
        return str(exc)
    ref = uuid.uuid4().hex[:8]
    logger.error(event, ref=ref, exc_info=exc)
    return f"Unexpected server error (ref: {ref})"


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


async def rate_limit_handler(request: Request, exc: Exception) -> JSONResponse:
    # Same {"detail": ...} shape as every other error, so the frontend can show it
    # (slowapi's default handler answers {"error": ...}).
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait a minute and try again."},
    )


async def data_error_handler(request: Request, exc: DataError) -> JSONResponse:
    # Value the column cannot hold (too long, out of range, ...). The schemas cap
    # lengths, so this is a backstop; the DB message stays in the logs only.
    logger.warning("data_error", path=request.url.path, error=str(exc.orig))
    return JSONResponse(
        status_code=400,
        content={"detail": "A value is too long or has the wrong format"},
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
