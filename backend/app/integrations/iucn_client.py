import os
from app.integrations.base import ExternalProviderClient, HttpClientMixin, ProviderResult

GLOBAL_SCOPE_CODE = "1"  # per IUCN docs: scope_code=1 → Global


def _is_global_scope(assessment: dict) -> bool:
    scopes = assessment.get("scopes")
    if not scopes:
        return False
    if isinstance(scopes, dict):
        scopes = [scopes]
    for scope in scopes:
        if not isinstance(scope, dict):
            continue
        code = str(scope.get("code", ""))
        description = str(scope.get("description", "")).lower()
        if code == GLOBAL_SCOPE_CODE or "global" in description:
            return True
    return False


def _year(assessment: dict) -> int:
    try:
        return int(assessment.get("year_published") or 0)
    except (TypeError, ValueError):
        return 0


class IucnClient(ExternalProviderClient, HttpClientMixin):
    def __init__(self):
        HttpClientMixin.__init__(self, "https://api.iucnredlist.org/api/v4")
        self.token = os.environ.get("IUCN_API_TOKEN", "")

    async def search(self, scientific_name: str) -> ProviderResult:
        try:
            if not self.token:
                return ProviderResult(source="iucn", data={})

            parts = scientific_name.strip().split(maxsplit=1)
            genus_name = parts[0] if parts else scientific_name
            species_name = parts[1] if len(parts) > 1 else ""
            auth_headers = {"Authorization": f"Bearer {self.token}"}

            resp = await self.get(
                "/taxa/scientific_name",
                params={"genus_name": genus_name, "species_name": species_name},
                headers=auth_headers,
            )
            resp.raise_for_status()
            assessments = resp.json().get("assessments", [])
            if not assessments:
                return ProviderResult(source="iucn", data={})

            # Restrict to the Global scope only — a species can also carry
            # regional/national assessments that shouldn't override it.
            global_assessments = [a for a in assessments if _is_global_scope(a)]
            if not global_assessments:
                return ProviderResult(source="iucn", data={})

            # "Last global assessment" = the one IUCN flags latest within
            # the global scope, falling back to the most recently published
            # global one if none is explicitly flagged.
            chosen = next((a for a in global_assessments if a.get("latest")), None)
            if chosen is None:
                chosen = max(global_assessments, key=_year)

            assessment_id = chosen.get("assessment_id")
            if not assessment_id:
                return ProviderResult(source="iucn", data={})

            detail_resp = await self.get(f"/assessment/{assessment_id}", headers=auth_headers)
            detail_resp.raise_for_status()
            detail = detail_resp.json()

            category = detail.get("red_list_category", {})
            if isinstance(category, dict):
                category = category.get("code") or category.get("description")

            trend = detail.get("population_trend", {})
            if isinstance(trend, dict):
                trend = trend.get("description") or trend.get("code")

            return ProviderResult(source="iucn", data={"category": category, "population_trend": trend['en']})
        except Exception:
            return ProviderResult(source="iucn", data={})
        finally:
            await self.close()