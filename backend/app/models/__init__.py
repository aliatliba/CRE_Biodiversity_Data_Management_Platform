"""Importing this package registers every model on Base.metadata.

Alembic's env.py imports app.models before autogenerating a migration, so
every model file must be listed here.
"""
from app.models.api_query_log import ApiQueryLog
from app.models.export import Export
from app.models.protected_species import ProtectedSpeciesList
from app.models.role import Role
from app.models.site import Site
from app.models.site_species import SiteSpecies
from app.models.species import Species
from app.models.user import User
from app.models.validation_history import SpeciesValidationHistory

__all__ = [
    "ApiQueryLog",
    "Export",
    "ProtectedSpeciesList",
    "Role",
    "Site",
    "SiteSpecies",
    "Species",
    "User",
    "SpeciesValidationHistory",
]
