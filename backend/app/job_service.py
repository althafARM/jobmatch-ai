import asyncio
import logging
import re
from html import unescape
from typing import Any

import httpx


logger = logging.getLogger(__name__)

HIMALAYAS_API_URL = "https://himalayas.app/jobs/api"
HIMALAYAS_SEARCH_URL = "https://himalayas.app/jobs/api/search"

# Keep the same function signature your existing backend uses.
IT_JOB_QUERIES = [
    "Software Engineer",
    "Software Developer",
    "Python Developer",
    "Java Developer",
    "JavaScript Developer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Web Developer",
    "Mobile App Developer",
    "AI Engineer",
    "Machine Learning Engineer",
    "Data Scientist",
    "Data Analyst",
    "Business Intelligence Analyst",
    "Cybersecurity Analyst",
    "Security Engineer",
    "Cloud Engineer",
    "DevOps Engineer",
    "QA Engineer",
    "Software Tester",
    "IT Support Engineer",
    "System Administrator",
    "Network Engineer",
    "Database Administrator",
    "UI UX Designer",
    "IT Intern",
    "Software Engineer Intern",
    "Data Analyst Intern",
    "AI ML Intern",
    "Trainee Software Engineer",
]


def _clean_description(value: Any) -> str:
    """Convert an HTML job description into readable plain text."""
    if not isinstance(value, str):
        return ""

    value = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</li>", "\n", value)
    value = re.sub(r"<[^>]+>", " ", value)
    value = unescape(value)
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n\s*\n+", "\n\n", value)

    return value.strip()


def _normalize_job(item: dict[str, Any]) -> dict[str, Any]:
    """Convert a Himalayas job into the format used by JobMatch AI."""

    restrictions = item.get("locationRestrictions") or []

    if isinstance(restrictions, list):
        restriction_names = [
            entry.get("name", "")
            for entry in restrictions
            if isinstance(entry, dict) and entry.get("name")
        ]
        location = ", ".join(restriction_names) or "Remote"
    else:
        location = "Remote"

    title = item.get("title") or "Untitled position"
    company = item.get("companyName") or "Unknown company"

    return {
        "id": item.get("guid") or (
            f"{company}-{title}".lower().replace(" ", "-")
        ),
        "title": title,
        "company": company,
        "location": location,
        "description": _clean_description(
            item.get("description") or item.get("excerpt") or ""
        ),
        "employment_type": item.get("employmentType"),
        "is_remote": True,
        "posted_at": item.get("pubDate"),
        "apply_url": item.get("applicationLink") or item.get("guid"),
        "source": "Himalayas",
        "company_logo": item.get("companyLogo"),
        "salary_min": item.get("minSalary"),
        "salary_max": item.get("maxSalary"),
        "salary_currency": item.get("currency"),
        "salary_period": item.get("salaryPeriod"),
        "categories": item.get("categories") or [],
        "seniority": item.get("seniority") or [],
        "location_restrictions": restrictions,
    }


async def _fetch_himalayas_jobs(
    client: httpx.AsyncClient,
    query: str = "",
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Fetch jobs from the public Himalayas API."""

    limit = max(1, min(limit, 20))

    if query.strip():
        # The official search endpoint supports keyword filtering.
        response = await client.get(
            HIMALAYAS_SEARCH_URL,
            params={
                "q": query.strip(),
                "page": 1,
            },
        )
    else:
        response = await client.get(
            HIMALAYAS_API_URL,
            params={"limit": limit},
        )

    response.raise_for_status()

    payload = response.json()
    items = payload.get("jobs", [])

    if not isinstance(items, list):
        logger.warning("Himalayas returned an unexpected jobs format.")
        return []

    return [
        _normalize_job(item)
        for item in items[:limit]
        if isinstance(item, dict)
    ]


async def search_jobs(
    query: str = "",
    location: str = "Sri Lanka",
    page: int = 1,
    country: str = "lk",
    all_it_jobs: bool = False,
) -> list[dict[str, Any]]:
    """
    Search remote jobs using the free Himalayas API.

    The existing arguments are retained for compatibility with the
    current JobMatch AI backend.

    Note:
    - Himalayas mainly lists remote jobs.
    - The location and country arguments are retained for compatibility;
      they do not filter the unfiltered browse endpoint.
    - Search results are limited to 20 jobs per API request.
    """

    del location, country  # Not used by the browse endpoint.

    if page < 1:
        page = 1

    timeout = httpx.Timeout(20.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            if all_it_jobs:
                # Fetch a single page to avoid making many API requests.
                jobs = await _fetch_himalayas_jobs(
                    client=client,
                    limit=20,
                )

                # Retain jobs whose titles look relevant to IT.
                relevant_terms = (
                    "software", "developer", "engineer", "python",
                    "java", "data", "machine learning", "artificial",
                    "ai ", "cybersecurity", "security", "cloud",
                    "devops", "frontend", "backend", "full stack",
                    "qa ", "analyst", "technology", "technical",
                    "it intern",
                )

                jobs = [
                    job for job in jobs
                    if any(
                        term in job["title"].lower()
                        for term in relevant_terms
                    )
                ]

                return jobs

            search_query = query.strip()

            if not search_query:
                return await _fetch_himalayas_jobs(
                    client=client,
                    limit=20,
                )

            return await _fetch_himalayas_jobs(
                client=client,
                query=search_query,
                limit=20,
            )

    except httpx.HTTPStatusError as error:
        logger.warning(
            "Himalayas API returned HTTP %s.",
            error.response.status_code,
        )
        return []

    except (httpx.RequestError, ValueError) as error:
        logger.warning(
            "Could not retrieve or parse Himalayas jobs: %s",
            type(error).__name__,
        )
        return []