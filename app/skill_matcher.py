
import re
from typing import Any
from typing import Any

KNOWN_SKILLS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "node.js",
    "fastapi",
    "django",
    "flask",
    "sql",
    "mysql",
    "postgresql",
    "mongodb",
    "machine learning",
    "deep learning",
    "artificial intelligence",
    "data analysis",
    "data science",
    "pandas",
    "numpy",
    "scikit-learn",
    "tensorflow",
    "pytorch",
    "html",
    "css",
    "git",
    "docker",
    "aws",
    "excel",
    "power bi",
    "tableau",
    "spring boot",
    "c++",
    "c#",
    "php",
}


def normalize_skill(skill: str) -> str:
    return re.sub(r"\s+", " ", skill.lower().strip())


def find_skills(text: str) -> set[str]:
    text = normalize_skill(text)
    found = set()

    for skill in KNOWN_SKILLS:
        pattern = r"(?<!\w)" + re.escape(skill) + r"(?!\w)"

        if re.search(pattern, text):
            found.add(skill)

    return found


def get_job_required_skills(job: dict[str, Any]) -> set[str]:
    """
    First version: identify known skills mentioned in the job.
    These are detected skills, not verified mandatory requirements.
    """
    title = str(job.get("title") or "")
    description = str(job.get("description") or "")

    return find_skills(f"{title} {description}")


from typing import Any


def filter_jobs_by_resume_skills(
    jobs: list[dict[str, Any]],
    resume_skills: list[str],
) -> list[dict[str, Any]]:

    user_skills = {
        normalize_skill(skill)
        for skill in resume_skills
        if skill and skill.strip()
    }

    results = []

    for job in jobs:
        job_skills = get_job_required_skills(job)
        matched_skills = job_skills.intersection(user_skills)

        score = (
            round(len(matched_skills) / len(job_skills) * 100)
            if job_skills
            else 0
        )

        result = job.copy()
        result["matched_skills"] = sorted(matched_skills)
        result["match_score"] = score
        results.append(result)

    results.sort(
        key=lambda item: item["match_score"],
        reverse=True,
    )

    return results

