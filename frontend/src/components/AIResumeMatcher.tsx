import { useEffect, useState } from "react";
import type {
  ChangeEvent,
  DragEvent,
  FormEvent,
} from "react";

import type { Job } from "../services/jobservice";
import JobCard from "./JobCard";

const API_BASE_URL = "http://127.0.0.1:8000";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
];

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
];

interface SkillsResponse {
  success: boolean;
  filename?: string;
  skills?: string[];
  skills_count?: number;
  detail?: string;
  message?: string;
}

interface MatchResponse {
  success: boolean;
  resume_skills?: string[];
  total_jobs_found?: number;
  matching_jobs_count?: number;
  jobs?: Job[];
  detail?: string;
  message?: string;
}

function getErrorMessage(
  data: { detail?: unknown; message?: unknown },
  fallback: string
): string {
  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  return fallback;
}

export default function AIResumeMatcher() {
  const [resume, setResume] = useState<File | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [jobSearch, setJobSearch] = useState("AI Engineer");

  const [loadingJobs, setLoadingJobs] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [matchingJobs, setMatchingJobs] = useState<Job[]>([]);
  const [matchingCount, setMatchingCount] = useState<number | null>(
    null
  );
  const [totalJobsFound, setTotalJobsFound] = useState<number | null>(
    null
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadJobs() {
      setLoadingJobs(true);
      setError("");

      try {
        const params = new URLSearchParams({
          query: jobSearch.trim() || "AI Engineer",
          location: "Sri Lanka",
          page: "1",
        });

        const response = await fetch(
          `${API_BASE_URL}/api/jobs/live?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load jobs from the server.");
        }

        const payload = await response.json();

        const rawJobs: unknown[] = Array.isArray(payload.jobs)
          ? payload.jobs
          : [];

        const validJobs: Job[] = rawJobs
          .filter((item): item is Record<string, unknown> => {
            return (
              typeof item === "object" &&
              item !== null &&
              Boolean((item as Record<string, unknown>).title)
            );
          })
          .map((item) => ({
            id: item.id != null ? String(item.id) : null,
            title: String(item.title),
            company: String(item.company || "Company not specified"),
            location: String(item.location || "Location not specified"),
            description: String(item.description || ""),
            employment_type:
              item.employment_type != null
                ? String(item.employment_type)
                : null,
            is_remote: Boolean(item.is_remote),
            posted_at:
              item.posted_at != null ? String(item.posted_at) : null,
            apply_url:
              item.apply_url != null ? String(item.apply_url) : null,
            source: item.source != null ? String(item.source) : null,
          }));

        setJobs(validJobs);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setJobs([]);
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't load job listings."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingJobs(false);
        }
      }
    }

    const timer = window.setTimeout(loadJobs, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [jobSearch]);

  function validateFile(file: File) {
    setError("");
    setNotice("");
    setSkills([]);
    setMatchingJobs([]);
    setMatchingCount(null);
    setTotalJobsFound(null);

    const name = file.name.toLowerCase();
    const extensionAllowed = ALLOWED_EXTENSIONS.some((extension) =>
      name.endsWith(extension)
    );

    const mimeAllowed =
      file.type === "" || ALLOWED_MIME_TYPES.includes(file.type);

    if (!extensionAllowed || !mimeAllowed) {
      setError("Please choose a PDF, DOCX, PNG, JPG, or JPEG file.");
      return;
    }

    if (file.size === 0) {
      setError("The selected file is empty. Please choose another file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Your resume must be smaller than 5 MB.");
      return;
    }

    setResume(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      validateFile(file);
    }

    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      validateFile(file);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setNotice("");
    setSkills([]);
    setMatchingJobs([]);
    setMatchingCount(null);
    setTotalJobsFound(null);

    if (!resume) {
      setError("Please upload your resume first.");
      return;
    }

    if (!jobSearch.trim()) {
      setError("Please enter a job title or skill.");
      return;
    }

    setAnalyzing(true);

    try {
      // Step 1: Upload the resume and extract skills.
      const formData = new FormData();
      formData.append("file", resume);

      const skillsResponse = await fetch(
        `${API_BASE_URL}/api/resume/skills`,
        {
          method: "POST",
          body: formData,
        }
      );

      const skillsData = (await skillsResponse
        .json()
        .catch(() => ({}))) as SkillsResponse;

      if (!skillsResponse.ok) {
        throw new Error(
          getErrorMessage(
            skillsData,
            `Resume analysis failed (${skillsResponse.status}).`
          )
        );
      }

      if (skillsData.success === false) {
        throw new Error(
          getErrorMessage(
            skillsData,
            "The backend could not analyze your resume."
          )
        );
      }

      const extractedSkills = Array.isArray(skillsData.skills)
        ? skillsData.skills.filter(
            (skill): skill is string => typeof skill === "string"
          )
        : [];

      setSkills(extractedSkills);

      if (extractedSkills.length === 0) {
        setNotice(
          "Your file was processed, but no skills were extracted. Try a clearer resume or another supported file."
        );
        return;
      }

      // Step 2: Find jobs using the extracted skills.
      const matchResponse = await fetch(
        `${API_BASE_URL}/api/jobs/match-resume`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            skills: extractedSkills,
            query: jobSearch.trim(),
            location: "Sri Lanka",
          }),
        }
      );

      const matchData = (await matchResponse
        .json()
        .catch(() => ({}))) as MatchResponse;

      if (!matchResponse.ok) {
        throw new Error(
          getErrorMessage(
            matchData,
            `Job matching failed (${matchResponse.status}).`
          )
        );
      }

      if (matchData.success === false) {
        throw new Error(
          getErrorMessage(
            matchData,
            "The backend could not match your resume to jobs."
          )
        );
      }

      const recommendedJobs: Job[] = Array.isArray(matchData.jobs)
        ? matchData.jobs
            .filter(
              (job): job is Job =>
                typeof job === "object" &&
                job !== null &&
                typeof job.title === "string"
            )
            .map((job) => ({
              id: job.id != null ? String(job.id) : null,
              title: job.title,
              company: job.company || "Company not specified",
              location: job.location || "Location not specified",
              description: job.description || "",
              employment_type: job.employment_type ?? null,
              is_remote: Boolean(job.is_remote),
              posted_at: job.posted_at ?? null,
              apply_url: job.apply_url ?? null,
              source: job.source ?? null,
            }))
        : [];

      setMatchingJobs(recommendedJobs);
      setMatchingCount(
        typeof matchData.matching_jobs_count === "number"
          ? matchData.matching_jobs_count
          : recommendedJobs.length
      );
      setTotalJobsFound(
        typeof matchData.total_jobs_found === "number"
          ? matchData.total_jobs_found
          : null
      );

      setNotice(
        `Resume analyzed successfully. We extracted ${extractedSkills.length} skills and received ${recommendedJobs.length} recommended job listings.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="resume-matcher">
      <div className="resume-hero">
        <div className="resume-hero-content">
          <span className="section-label">
            AI-POWERED CAREER TOOLS
          </span>

          <h1>
            Find your fit.
            <br />
            Build your <span>future.</span>
          </h1>

          <p>
            Upload your resume, discover your skills, and find job
            opportunities in Sri Lanka that suit your career goals.
          </p>

          <div className="resume-benefits">
            <span>✓ Skills extraction</span>
            <span>✓ Job recommendations</span>
            <span>✓ Career opportunities</span>
          </div>
        </div>

        <div className="resume-hero-art" aria-hidden="true">
          <div className="resume-art-document">
            <div className="resume-art-top">
              <span>CV</span>
              <span className="resume-art-check">✓</span>
            </div>
            <div className="resume-art-line long" />
            <div className="resume-art-line medium" />
            <div className="resume-art-line short" />
            <div className="resume-art-divider" />
            <div className="resume-art-line medium" />
            <div className="resume-art-line long" />
            <div className="resume-art-line short" />
          </div>

          <div className="resume-art-badge">✦ AI</div>
        </div>
      </div>

      <div className="resume-workspace">
        <div className="resume-section-heading">
          <div>
            <span className="section-label">LET'S GET STARTED</span>
            <h2>Match your resume to a job</h2>
            <p>
              Upload your CV and tell us what kind of role you want.
            </p>
          </div>

          <div className="resume-step-badge">
            <span>01</span> Resume analysis
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="resume-form-grid">
            <section className="resume-input-card">
              <div className="resume-card-heading">
                <span className="resume-card-icon">↥</span>
                <div>
                  <h3>Upload your resume</h3>
                  <p>Choose your current CV or resume image</p>
                </div>
              </div>

              <label
                className={`resume-dropzone ${
                  dragActive ? "drag-active" : ""
                } ${resume ? "has-file" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
                  onChange={handleFileChange}
                  hidden
                />

                <span className="resume-upload-icon">
                  {resume ? "✓" : "↑"}
                </span>

                <strong>
                  {resume ? resume.name : "Drop your resume here"}
                </strong>

                <span>
                  {resume
                    ? `${(resume.size / 1024).toFixed(0)} KB · Ready`
                    : "or click to browse files"}
                </span>

                {!resume && (
                  <span className="resume-file-types">
                    PDF, DOCX, PNG or JPG · Maximum 5 MB
                  </span>
                )}

                {resume && (
                  <span className="resume-change-file">
                    Click to choose another file
                  </span>
                )}
              </label>

              <div className="resume-privacy-note">
                <span>♧</span>
                <p>
                  Your file will be sent to your configured backend for
                  skills extraction when you click Match My Resume.
                </p>
              </div>
            </section>

            <section className="resume-input-card">
              <div className="resume-card-heading">
                <span className="resume-card-icon">⌕</span>
                <div>
                  <h3>Choose your target role</h3>
                  <p>Tell us which opportunities interest you</p>
                </div>
              </div>

              <label
                className="resume-textarea-label"
                htmlFor="job-search"
              >
                JOB TITLE OR SKILL
              </label>

              <input
                id="job-search"
                className="resume-job-search-input"
                type="search"
                placeholder="e.g. AI Engineer, Data Analyst..."
                value={jobSearch}
                maxLength={100}
                onChange={(event) => setJobSearch(event.target.value)}
              />

              <p className="resume-jobs-status">
                Recommendations will be searched in Sri Lanka.
              </p>

              <label
                className="resume-textarea-label resume-select-label"
                htmlFor="job-select"
              >
                AVAILABLE JOBS
              </label>

              <select
                id="job-select"
                className="resume-job-select"
                value={selectedJobId}
                onChange={(event) => setSelectedJobId(event.target.value)}
                disabled={loadingJobs || jobs.length === 0}
              >
                <option value="">
                  {loadingJobs
                    ? "Loading jobs..."
                    : jobs.length
                      ? "Optional: preview a live job"
                      : "No live jobs available"}
                </option>

                {jobs.map((job, index) => (
                  <option
                    key={job.id ?? `${job.title}-${index}`}
                    value={job.id ?? `${job.title}-${index}`}
                  >
                    {job.title} — {job.company}
                  </option>
                ))}
              </select>

              {loadingJobs && (
                <p className="resume-jobs-status">
                  Loading job listings...
                </p>
              )}

              {!loadingJobs && jobs.length === 0 && (
                <div className="resume-no-jobs">
                  <span>ⓘ</span>
                  <p>
                    Live job previews are unavailable. You can still try
                    matching if the backend is working.
                  </p>
                </div>
              )}

              {selectedJobId && (
                <div className="resume-selected-job">
                  <p>
                    The selected job is for preview only. Matching uses
                    your target role, extracted skills, and Sri Lanka
                    location.
                  </p>
                </div>
              )}
            </section>
          </div>

          {error && (
            <div className="resume-message" role="alert">
              <span>ⓘ</span>
              {error}
            </div>
          )}

          {notice && (
            <div
              className="resume-success-message"
              role="status"
              aria-live="polite"
            >
              <span>✓</span>
              {notice}
            </div>
          )}

          <div className="resume-submit-row">
            <div className="resume-submit-info">
              <span>✦</span>
              <p>
                Your resume skills will be used to search for relevant
                jobs. Results depend on the available job listings.
              </p>
            </div>

            <button
              className="resume-analyze-button"
              type="submit"
              disabled={analyzing || loadingJobs}
            >
              {analyzing ? "Analyzing resume..." : "Match My Resume"}
              {!analyzing && <span>→</span>}
            </button>
          </div>
        </form>
      </div>

      {skills.length > 0 && (
        <section className="resume-results-section">
          <div className="resume-process-heading">
            <span className="section-label">RESUME ANALYSIS</span>
            <h2>Your extracted skills</h2>
            <p>
              These skills were returned by your resume-analysis backend.
            </p>
          </div>

          <div className="resume-skills-list">
            {skills.map((skill, index) => (
              <span className="skill-tag" key={`${skill}-${index}`}>
                ✓ {skill}
              </span>
            ))}
          </div>

          <div className="resume-match-summary">
            <article>
              <span>Recommended listings</span>
              <strong>{matchingCount ?? matchingJobs.length}</strong>
            </article>

            {totalJobsFound !== null && (
              <article>
                <span>Total jobs found</span>
                <strong>{totalJobsFound}</strong>
              </article>
            )}

            <article>
              <span>Skills identified</span>
              <strong>{skills.length}</strong>
            </article>
          </div>

          <div className="resume-process-heading">
            <span className="section-label">CAREER OPPORTUNITIES</span>
            <h2>Jobs for your skills</h2>
            <p>
              Review the returned listings and open the original
              application links to learn more.
            </p>
          </div>

          {matchingJobs.length > 0 ? (
            <div className="job-grid">
              {matchingJobs.map((job, index) => (
                <JobCard
                  key={job.id ?? `${job.title}-${index}`}
                  job={job}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">
                ⌕
              </div>
              <h3>No job listings were returned</h3>
              <p>
                Your skills were extracted successfully, but the backend
                did not return any job cards for this search.
              </p>
            </div>
          )}
        </section>
      )}

      <section className="resume-process">
        <div className="resume-process-heading">
          <span className="section-label">THREE SIMPLE STEPS</span>
          <h2>How it works</h2>
        </div>

        <div className="resume-process-grid">
          <article className="resume-process-card">
            <span className="resume-process-number">01</span>
            <h3>Upload your CV</h3>
            <p>
              Choose a PDF, DOCX, PNG, or JPG file from your computer.
            </p>
          </article>

          <article className="resume-process-card">
            <span className="resume-process-number">02</span>
            <h3>Extract your skills</h3>
            <p>
              The backend analyzes your file and returns recognized
              skills.
            </p>
          </article>

          <article className="resume-process-card">
            <span className="resume-process-number">03</span>
            <h3>Explore job matches</h3>
            <p>
              Review recommended job listings returned by the backend.
            </p>
          </article>
        </div>
      </section>
    </section>
  );
}

