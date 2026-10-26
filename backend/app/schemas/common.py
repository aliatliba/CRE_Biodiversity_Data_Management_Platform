"""Reusable constrained field types.

Maximum lengths mirror the database columns, so an oversized value is a clean 422
instead of a database error.
"""
from typing import Annotated

from pydantic import AfterValidator, StringConstraints

from app.core.security import BCRYPT_MAX_PASSWORD_BYTES


def Text(max_length: int, min_length: int = 0):  # noqa: N802  (reads like a type)
    """Whitespace-stripped string of at most ``max_length`` characters."""
    return Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length),
    ]


def _password_fits_bcrypt(value: str) -> str:
    if len(value.encode("utf-8")) > BCRYPT_MAX_PASSWORD_BYTES:
        raise ValueError(f"Password must be at most {BCRYPT_MAX_PASSWORD_BYTES} bytes")
    return value


# Passwords are never stripped: leading/trailing spaces are part of the secret.
PasswordInput = Annotated[str, StringConstraints(min_length=1, max_length=1024)]

Password = Annotated[
    str, StringConstraints(min_length=8), AfterValidator(_password_fits_bcrypt)
]

# Scientific names: a few words, never blank.
ScientificName = Text(255, min_length=1)
