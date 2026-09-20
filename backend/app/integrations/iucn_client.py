import os
from typing import Any

from app.integrations.base import ExternalProviderClient, HttpClientMixin, ProviderResult


def _get_scopes(assessment: dict[str, Any]) -> list[dict[str, Any]]:
    scopes = assessment.get("scopes", [])

    if isinstance(scopes, dict):
        return [scopes]

    if isinstance(scopes, list):
        return [s for s in scopes if isinstance(s, dict)]

    return []


def _identify_scope(assessment: dict[str, Any]) -> tuple[str | None, str | None]:
    """
    Return (scope_name, scope_code).

    We only expose the scopes relevant to the application:
    Global, Europe, Mediterranean.
    """

    for scope in _get_scopes(assessment):
        code = str(scope.get("code", ""))
        description = str(scope.get("description", ""))

        text = f"{code} {description}".lower()

        if "global" in text or code == "1":
            return "Global", code

        if "europe" in text:
            return "Europe", code

        if "mediterranean" in text:
            return "Mediterranean", code

    return None, None


def _year(assessment: dict[str, Any]) -> int:
    try:
        return int(assessment.get("year_published") or 0)
    except (TypeError, ValueError):
        return 0


def _extract_category(detail: dict[str, Any]) -> str | None:
    category = detail.get("red_list_category")

    if isinstance(category, dict):
        code = category.get("code")
        if code:
            return code

        description = category.get("description")

        if isinstance(description, dict):
            return description.get("en") or description.get("eng")

        if isinstance(description, str):
            return description

    if isinstance(category, str):
        return category

    return None


def _extract_trend(detail: dict[str, Any]) -> str | None:
    trend = detail.get("population_trend")

    if not trend:
        return None

    if isinstance(trend, str):
        return trend

    if isinstance(trend, dict):

        description = trend.get("description")

        # Actual IUCN response:
        #
        # {
        #     "description": {
        #         "en": "Decreasing"
        #     },
        #     "code": "1"
        # }

        if isinstance(description, dict):
            return (
                description.get("en")
                or description.get("eng")
            )

        if isinstance(description, str):
            return description

        return trend.get("code")

    return None


class IucnClient(ExternalProviderClient, HttpClientMixin):

    def __init__(self):
        HttpClientMixin.__init__(
            self,
            "https://api.iucnredlist.org/api/v4"
        )

        self.token = os.environ.get("IUCN_API_TOKEN", "")

    async def search(self, scientific_name: str) -> ProviderResult:

        try:

            if not self.token:
                print("IUCN API token not set")

                return ProviderResult(
                    source="iucn",
                    data={}
                )

            parts = scientific_name.strip().split(maxsplit=1)

            genus_name = parts[0] if parts else scientific_name
            species_name = parts[1] if len(parts) > 1 else ""

            headers = {
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/json",
            }

            # --------------------------------------------------
            # 1. Find taxon assessments
            # --------------------------------------------------

            response = await self.get(
                "/taxa/scientific_name",
                params={
                    "genus_name": genus_name,
                    "species_name": species_name,
                },
                headers=headers,
            )

            response.raise_for_status()

            data = response.json()

            assessments = data.get("assessments", [])

            if not assessments:
                return ProviderResult(
                    source="iucn",
                    data={
                        "assessments": []
                    }
                )

            # --------------------------------------------------
            # 2. Group assessments by relevant scope
            # --------------------------------------------------

            grouped: dict[str, list[dict[str, Any]]] = {
                "Global": [],
                "Europe": [],
                "Mediterranean": [],
            }

            for assessment in assessments:

                scope_name, scope_code = _identify_scope(assessment)

                if scope_name:
                    assessment["_scope_name"] = scope_name
                    assessment["_scope_code"] = scope_code

                    grouped[scope_name].append(assessment)

            # --------------------------------------------------
            # 3. Select latest assessment per scope
            # --------------------------------------------------

            selected: list[dict[str, Any]] = []

            for scope_name in (
                "Global",
                "Europe",
                "Mediterranean",
            ):

                candidates = grouped[scope_name]

                if not candidates:
                    continue

                # Prefer assessments marked latest.
                latest = [
                    assessment
                    for assessment in candidates
                    if assessment.get("latest") is True
                ]

                if latest:
                    chosen = max(
                        latest,
                        key=_year
                    )
                else:
                    chosen = max(
                        candidates,
                        key=_year
                    )

                assessment_id = chosen.get("assessment_id")

                if not assessment_id:
                    continue

                # --------------------------------------------------
                # 4. Get full assessment details
                # --------------------------------------------------

                detail_response = await self.get(
                    f"/assessment/{assessment_id}",
                    headers=headers,
                )

                detail_response.raise_for_status()

                detail = detail_response.json()

                selected.append(
                    {
                        "assessment_id": assessment_id,
                        "scope": scope_name,
                        "scope_code": chosen.get("_scope_code"),
                        "year": _year(chosen),
                        "category": _extract_category(detail),
                        "population_trend": _extract_trend(detail),
                    }
                )

            # --------------------------------------------------
            # 5. Return assessments WITHOUT selecting one
            # --------------------------------------------------

            return ProviderResult(
                source="iucn",
                data={
                    "assessments": selected
                }
            )

        except Exception as exc:

            print(
                f"IUCN lookup failed for "
                f"{scientific_name}: {exc}"
            )

            return ProviderResult(
                source="iucn",
                data={}
            )

        finally:
            await self.close()