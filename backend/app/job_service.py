import os
import asyncio

import httpx
from dotenv import load_dotenv

load_dotenv()

JSEARCH_API_KEY = os.getenv("JSEARCH_API_KEY")
JSEARCH_URL = "https://jsearch.p.rapidapi.com/search-v2"

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


async def _search_single_query(
    client: httpx.AsyncClient,
    query: str,
    location: str,
    country: str,
    page: int,
) -> list[dict]:

    params = {
        "query": f"{query} in {location}",
        "page": str(page),
        "num_pages": "1",
        "date_posted": "all",
        "country": country,
        "language": "en",
    }

    headers = {
        "X-RapidAPI-Key": JSEARCH_API_KEY or "",
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }

    response = await client.get(
        JSEARCH_URL,
        params=params,
        headers=headers,
    )

    print(
        f"JSearch query={query!r}, "
        f"status={response.status_code}"
    )

    response.raise_for_status()

    payload = response.json()

    print("JSearch response status:", payload.get("status"))

    if payload.get("status") != "OK":
        print("JSearch API error:", payload.get("error", payload))
        return []
    
    print("JSearch jobs returned:", len(payload.get("data", [])))

    data = payload.get("data", [])

    if isinstance(data, dict):
        items = data.get("jobs", [])
    elif isinstance(data, list):
        items = data
    else:
        items = []

    jobs = []

    for item in items:
        if not isinstance(item, dict):
            continue

        jobs.append({
            "id": item.get("job_id"),
            "title": item.get("job_title") or "Untitled position",
            "company": item.get("employer_name") or "Unknown company",
            "location": ", ".join(
                str(part)
                for part in [
                    item.get("job_city"),
                    item.get("job_state"),
                    item.get("job_country"),
                ]
                if part
            ) or "Location not specified",
            "description": item.get("job_description") or "",
            "employment_type": item.get("job_employment_type"),
            "is_remote": item.get("job_is_remote", False),
            "posted_at": item.get("job_posted_at_datetime_utc"),
            "apply_url": item.get("job_apply_link"),
            "source": item.get("job_publisher"),
        })

    return jobs


async def search_jobs(
    query: str = "",
    location: str = "Sri Lanka",
    page: int = 1,
    country: str = "lk",
    all_it_jobs: bool = False,
) -> list[dict]:

    if not JSEARCH_API_KEY:
        raise RuntimeError(
            "JSEARCH_API_KEY is missing. "
            "Add it to the backend .env file."
        )

    # Broad IT search or a targeted search.
    if all_it_jobs:
        queries = IT_JOB_QUERIES
    else:
        queries = [query.strip() or "IT jobs"]

    # Avoid excessive simultaneous API requests.
    semaphore = asyncio.Semaphore(3)

    async with httpx.AsyncClient(timeout=25.0) as client:

        async def safe_search(search_query: str):
            async with semaphore:
                try:
                    return await _search_single_query(
                        client=client,
                        query=search_query,
                        location=location,
                        country=country,
                        page=page,
                    )
                except httpx.HTTPStatusError as error:
                    print(
                        f"JSearch failed for {search_query!r}: "
                        f"HTTP {error.response.status_code}"
                    )
                    return []
                except httpx.RequestError as error:
                    print(
                        f"JSearch connection error for "
                        f"{search_query!r}: {error}"
                    )
                    return []

        results = await asyncio.gather(
            *(safe_search(search_query) for search_query in queries)
        )

    # Combine results and remove duplicate jobs.
    unique_jobs = {}

    for result_list in results:
        for job in result_list:
            job_id = job.get("id")

            if job_id:
                unique_key = str(job_id)
            else:
                unique_key = (
                    f"{job.get('title', '').lower()}|"
                    f"{job.get('company', '').lower()}|"
                    f"{job.get('location', '').lower()}"
                )

            unique_jobs[unique_key] = job

    return list(unique_jobs.values())

