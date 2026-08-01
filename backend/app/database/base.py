"""Declarative base import point.

Alembic's env.py imports Base.metadata from here to autogenerate migrations,
so every model module must be imported somewhere that eventually runs
through app.models (see app/models/__init__.py) before autogenerate runs.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
