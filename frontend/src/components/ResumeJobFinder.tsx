
import { useState } from "react";

const API_URL = "http://127.0.0.1:8000";

type Job = {
  id: string | number;
  title: string;
  company: string;
  location: string;
  description: string;
  matched_skills: string[];
  match_score: number;
  apply_url?: string;
  source?: string;
};

export default function ResumeJobFinder() {
  const [file, setFile] = useState<File | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function findJobs() {
    if (!file) {
      setError("Please upload your resume first.");
      return;
    }

    setLoading(true);
    setError("");
    setJobs([]);
    setSkills([]);
    setSearched(false);

    try {
      // Step 1: Extract skills from the resume.
      const formData = new FormData();
      formData.append("file", file);

      const resumeResponse = await fetch(
        `${API_URL}/api/resume/skills`,
        {
          method: "POST",
          body: formData,
        }
      );

      const resumeData = await resumeResponse.json();

      if (!resumeResponse.ok) {
        throw new Error(
          resumeData.detail || "Could not analyse your resume."
        );
      }

      const extractedSkills: string[] = resumeData.skills || [];

      if (extractedSkills.length === 0) {
        throw new Error(
          "No recognised skills were found. Check your resume or add more skills to the skill extractor."
        );
      }

      setSkills(extractedSkills);

      // Step 2: Search live jobs using the extracted skills.
      const jobResponse = await fetch(
        `${API_URL}/api/jobs/match-resume`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            skills: extractedSkills,
            query: extractedSkills.slice(0, 3).join(" "),
            location: "Sri Lanka",
          }),
        }
      );

      const jobData = await jobResponse.json();

      if (!jobResponse.ok) {
        throw new Error(
          jobData.detail || "Could not find matching jobs."
        );
      }

      setJobs(jobData.jobs || []);
      setSearched(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="resume-finder">
      


      

      {searched && (
        <section className="rf-results-section">
          <span className="rf-eyebrow">STEP 03</span>
          <h2>Jobs matching your skills</h2>
          <p className="rf-result-count">
            {jobs.length} matching jobs found
          </p>

          {jobs.length === 0 ? (
            <div className="rf-empty">
              <h3>No matching jobs found</h3>
              <p>
                No jobs met the strict skill-matching rule in the
                current search results. Try another resume or search
                after expanding the job search.
              </p>
            </div>
          ) : (
            <div className="rf-job-list">
              {jobs.map((job) => (
                <article
                  className="rf-job-card"
                  key={`${job.id}-${job.company}`}
                >
                  <div className="rf-job-top">
                    <div className="rf-company-icon">
                      {job.company?.charAt(0) || "J"}
                    </div>
                    <div className="rf-job-title">
                      <h3>{job.title}</h3>
                      <p>{job.company}</p>
                    </div>
                    <span className="rf-match-badge">
                      Skills matched
                    </span>
                  </div>

                  <p className="rf-location">
                    📍 {job.location || "Location not specified"}
                  </p>

                  <div className="rf-job-skills">
                    {job.matched_skills?.map((skill) => (
                      <span key={skill}>{skill}</span>
                    ))}
                  </div>

                  <p className="rf-job-description">
                    {job.description
                      ? `${job.description.slice(0, 240)}${
                          job.description.length > 240 ? "…" : ""
                        }`
                      : "No description available."}
                  </p>

                  {job.apply_url ? (
                    <a
                      className="rf-apply-button"
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Apply Now ↗
                    </a>
                  ) : (
                    <p className="rf-no-link">
                      No application link is available.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

