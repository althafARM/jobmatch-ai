import { useEffect, useState } from "react";
import type { Job } from "../services/jobservice";

interface JobCardProps {
  job: Job;
}


function getSavedJobs(): string[] {
  try {
    const saved = JSON.parse(
      localStorage.getItem("jobmatch-saved-jobs") || "[]"
    );

    if (!Array.isArray(saved)) return [];

    // Supports both older saved IDs and complete saved job objects.
    return saved.map((item: unknown) => {
      if (typeof item === "string") return item;

      return getJobId(item as Job);
    });
  } catch {
    return [];
  }
}


function getJobId(job: Job): string {
  const jobWithId = job as Job & {
    id?: string | number;
    job_id?: string | number;
  };

  return String(
    jobWithId.id ??
      jobWithId.job_id ??
      `${job.company ?? ""}-${job.title}-${job.location ?? ""}-${job.apply_url ?? ""}`
  );
}

export default function JobCard({ job }: JobCardProps) {
  const description = job.description?.trim();
  const jobId = getJobId(job);

  const matchScore = (
    job as Job & { match_score?: number }
  ).match_score;

  const [isSaved, setIsSaved] = useState(() =>
    getSavedJobs().includes(jobId)
  );

  const [showSavedMessage, setShowSavedMessage] = useState(false);

  useEffect(() => {
    setIsSaved(getSavedJobs().includes(jobId));
  }, [jobId]);


  const toggleSaved = () => {
    const savedJobs: Job[] = (() => {
        try {
        return JSON.parse(
            localStorage.getItem("jobmatch-saved-jobs") || "[]"
        ) as Job[];
        } catch {
        return [];
        }
    })();

    const alreadySaved = savedJobs.some(
        (savedJob) => getJobId(savedJob) === jobId
    );

    const updatedJobs = alreadySaved
        ? savedJobs.filter((savedJob) => getJobId(savedJob) !== jobId)
        : [...savedJobs, job];

    localStorage.setItem(
        "jobmatch-saved-jobs",
        JSON.stringify(updatedJobs)
    );

    setIsSaved(!alreadySaved);
    setShowSavedMessage(!alreadySaved);

    window.dispatchEvent(new Event("jobmatch:saved-jobs-updated"));
    };



  const jobWithSkills = job as Job & {
    skills?: string[];
    required_skills?: string[];
    salary?: string;
  };

  const skills = (
    jobWithSkills.skills ??
    jobWithSkills.required_skills ??
    []
  ).slice(0, 4);

  return (
    <article className="job-card">
      <div className="job-card-header">
        <div className="company-logo" aria-hidden="true">
          {job.company?.trim().charAt(0).toUpperCase() || "J"}
        </div>

        <div className="job-title-section">
          <h3 className="job-title">{job.title}</h3>
          <p className="job-company">
            {job.company || "Company not listed"}
          </p>
        </div>

        <button
          type="button"
          className={`save-job-button ${isSaved ? "saved" : ""}`}
          onClick={toggleSaved}
          aria-label={isSaved ? "Remove saved job" : "Save job"}
          title={isSaved ? "Remove from saved jobs" : "Save this job"}
        >
          {isSaved ? "♥" : "♡"}
        </button>
      </div>

      {typeof matchScore === "number" && (
        <div className="job-match-row">
          <span className="match-score">
            <span className="match-score-icon">✦</span>
            {Math.round(matchScore)}% Match
          </span>

          <span className="match-score-caption">
            AI compatibility score
          </span>
        </div>
      )}

      <div className="job-details">
        <span className="job-detail">
          <span aria-hidden="true">📍</span>
          {job.location || "Location not specified"}
        </span>

        <span className="job-badge">
          {job.employment_type || "Job opportunity"}
        </span>

        {job.is_remote && (
          <span className="job-badge remote-badge">
            <span aria-hidden="true">🏠</span> Remote
          </span>
        )}
      </div>

      {jobWithSkills.salary && (
        <div className="job-salary">
          <span aria-hidden="true">💰</span>
          {jobWithSkills.salary}
        </div>
      )}

      <p className="job-description">
        {description
          ? description.length > 180
            ? `${description.slice(0, 180).trim()}...`
            : description
          : "View the original job listing for more information about this position."}
      </p>

      {skills.length > 0 && (
        <div className="job-skills">
          {skills.map((skill, index) => (
            <span className="skill-tag" key={`${skill}-${index}`}>
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="job-card-footer">
        <span className="job-source">
          {job.source || "Job listing"}
        </span>

        {job.apply_url ? (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="apply-button"
            aria-label={`Apply for ${job.title} at ${job.company || "this company"}`}
          >
            Apply Now <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className="application-unavailable">
            Application link unavailable
          </span>
        )}
      </div>

      {showSavedMessage && (
        <p className="saved-confirmation" role="status">
          ✓ Job saved successfully
        </p>
      )}
    </article>
  );
}

