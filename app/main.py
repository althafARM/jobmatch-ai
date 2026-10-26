import httpx
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from app.job_service import search_jobs
from fastapi import UploadFile, File
from app.resume_service import extract_resume_text, extract_skills
from app.skill_matcher import filter_jobs_by_resume_skills

app = FastAPI(
    title="JobMatch AI API",
    description="API for job search and skill-overlap matching.",
    version="1.0.0",
)

# Development CORS settings. Restrict origins before production deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Job(BaseModel):
    id: int
    title: str
    company: str
    location: str
    type: str
    description: str
    skills: List[str] = Field(default_factory=list)
    salary: Optional[str] = None
    source: str = "Demo seed data"

class RecommendRequest(BaseModel):
    skills: List[str] = Field(default_factory=list)

# Demo seed data only. Replace with a verified jobs feed or database.
JOBS = [
    Job(
        id=1, title="AI/ML Intern", company="Sample Technology",
        location="Colombo, Sri Lanka", type="Internship",
        description="Support model development, data preparation, and evaluation.",
        skills=["Python", "Machine Learning", "scikit-learn", "Pandas"],
        salary="Not specified",
    ),
    Job(
        id=2, title="Junior Data Analyst", company="Sample Analytics",
        location="Hybrid - Colombo", type="Full-time",
        description="Prepare reports, clean datasets, and communicate insights.",
        skills=["Python", "SQL", "Excel", "Pandas"],
        salary="Not specified",
    ),
    Job(
        id=3, title="Python Developer Intern", company="Sample Software",
        location="Kandy, Sri Lanka", type="Internship",
        description="Help build and test APIs and internal tools.",
        skills=["Python", "FastAPI", "Git", "REST API"],
        salary="Not specified",
    ),
    Job(
        id=4, title="Machine Learning Trainee", company="Sample Digital",
        location="Remote - Sri Lanka", type="Trainee",
        description="Assist with data preprocessing and model experiments.",
        skills=["Python", "NumPy", "Machine Learning", "SQL"],
        salary="Not specified",
    ),
    Job(
        id=5, title="Frontend Developer Intern", company="Sample Web Studio",
        location="Colombo, Sri Lanka", type="Internship",
        description="Build responsive user interfaces and integrate APIs.",
        skills=["React", "TypeScript", "CSS", "REST API"],
        salary="Not specified",
    ),
]

@app.get("/")
def root():
    return {"message": "JobMatch AI API is running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/jobs", response_model=List[Job])
def get_jobs():
    return JOBS

@app.post("/api/recommend")
def recommend_jobs(payload: RecommendRequest):
    user_skills = {skill.strip().lower() for skill in payload.skills if skill.strip()}
    results = []
    for job in JOBS:
        job_skills = {skill.lower() for skill in job.skills}
        score = round(100 * len(user_skills & job_skills) / max(len(job_skills), 1))
        results.append({**job.model_dump(), "matchScore": score})
    return sorted(results, key=lambda item: item["matchScore"], reverse=True)

@app.get("/api/jobs/live")
async def get_live_jobs(
    query: str = Query(
        default="AI engineer",
        min_length=2,
        max_length=100,
    ),
    location: str = Query(
        default="Sri Lanka",
        min_length=2,
        max_length=100,
    ),
    country: str = Query(default="lk", min_length=2, max_length=2),
    page: int = Query(
        default=1,
        ge=1,
        le=10,
    ),
):
    try:
        jobs = await search_jobs(
            query=query,
            location=location,
            country=country.lower(),
            page=page,
        )

        return {
            "success": True,
            "count": len(jobs),
            "jobs": jobs,
        }

    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error

    except httpx.TimeoutException as error:
        raise HTTPException(
            status_code=504,
            detail="The job provider took too long to respond.",
        ) from error

    except httpx.HTTPStatusError as error:
        provider_status = error.response.status_code

        raise HTTPException(
            status_code=502,
            detail={
                "message": "The job provider returned an error.",
                "provider_status": provider_status,
                "suggestion": (
                    "Check your API key, subscription, "
                    "and request parameters."
                ),
            },
        ) from error

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to the job provider.",
        ) from error

@app.post("/api/resume/skills")
async def analyze_resume_skills(
    file: UploadFile = File(...),
):
    filename = file.filename or ""

    # Allow PDF, DOCX, JPG, JPEG, and PNG files.
    allowed_extensions = (".pdf", ".docx", ".png", ".jpg", ".jpeg")

    if not filename.lower().endswith(allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF, DOCX, JPG, JPEG, or PNG resume.",
        )

    # Read the uploaded file.
    content = await file.read()

    # Limit uploads to 5 MB.
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Resume must be smaller than 5 MB.",
        )

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded resume is empty.",
        )

    try:
        # Extract text from the uploaded resume.
        text = extract_resume_text(filename, content)

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail=(
                    "No readable text was found. "
                    "For image resumes, check the image quality "
                    "and ensure Tesseract OCR is installed."
                ),
            )

        # Find skills in the extracted text.
        skills = extract_skills(text)

    except HTTPException:
        raise

    except Exception as error:
        print("RESUME EXTRACTION ERROR:", repr(error))

        raise HTTPException(
            status_code=400,
            detail=f"Could not read resume: {str(error)}",
        ) from error

    return {
        "success": True,
        "filename": filename,
        "skills": skills,
        "skills_count": len(skills),
    }


class ResumeJobMatchRequest(BaseModel):
    skills: List[str] = Field(default_factory=list)
    query: str = "software developer"
    location: str = "Sri Lanka"



@app.post("/api/jobs/match-resume")
async def match_jobs_to_resume(
    payload: ResumeJobMatchRequest,
):
    resume_skills = list({
        skill.strip()
        for skill in payload.skills
        if skill.strip()
    })

    if not resume_skills:
        raise HTTPException(
            status_code=400,
            detail="No resume skills were provided. Upload a resume first.",
        )

    try:
        jobs = await search_jobs(
            query="",
            location=payload.location or "Sri Lanka",
            country="lk",
            page=1,
            all_it_jobs=True,
        )

        matching_jobs = filter_jobs_by_resume_skills(
            jobs,
            resume_skills,
        )

        return {
            "success": True,
            "resume_skills": resume_skills,
            "total_jobs_found": len(jobs),
            "matching_jobs_count": len(matching_jobs),
            "jobs": matching_jobs,
        }

    except httpx.TimeoutException as error:
        raise HTTPException(
            status_code=504,
            detail="The job provider took too long to respond.",
        ) from error

    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=502,
            detail="The job provider returned an error.",
        ) from error

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to the job provider.",
        ) from error

