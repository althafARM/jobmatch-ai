import { useEffect, useState } from "react";
import { searchLiveJobs, type Job } from "../services/jobservice";
import JobCard from "./JobCard";

export default function JobSearch() {
  const [query, setQuery] = useState("AI Engineer");
  const [location, setLocation] = useState("Sri Lanka");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch(
    event?: React.FormEvent<HTMLFormElement>,
    searchQuery = query,
    searchLocation = location
  ) {
    event?.preventDefault();

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const result = await searchLiveJobs(
        searchQuery.trim(),
        searchLocation.trim()
      );

      setJobs(result.jobs);
    } catch (err) {
      setJobs([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load jobs. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Allow dashboard category buttons to start a search.
  useEffect(() => {
    function handleCategorySearch(event: Event) {
      const customEvent = event as CustomEvent<{ query?: string }>;
      const newQuery = customEvent.detail?.query?.trim();

      if (!newQuery) return;

      setQuery(newQuery);
      void handleSearch(undefined, newQuery, location);
    }

    window.addEventListener("jobmatch:search", handleCategorySearch);

    return () => {
      window.removeEventListener("jobmatch:search", handleCategorySearch);
    };
  }, [location]);

  return (
    <main className="job-search-page">
      <section className="hero-section">
        <div className="search-hero-content">
          <span className="hero-badge">
            <span aria-hidden="true">✦</span>
            YOUR NEXT OPPORTUNITY
          </span>

          <h1>
            Find a job that
            <br />
            <span>matches your future.</span>
          </h1>

          <p>
            Discover opportunities, explore career paths, and take your next
            step with JobMatch AI.
          </p>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <label className="search-field">
            <span className="search-field-icon" aria-hidden="true">
              ⌕
            </span>

            <span className="search-field-content">
              <span className="search-field-label">Job title or skill</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. Machine Learning Intern"
                required
                minLength={2}
                maxLength={100}
              />
            </span>
          </label>

          <span className="search-divider" aria-hidden="true" />

          <label className="search-field">
            <span className="search-field-icon" aria-hidden="true">
              ⌖
            </span>

            <span className="search-field-content">
              <span className="search-field-label">Location</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. Colombo, Sri Lanka"
                required
                minLength={2}
                maxLength={100}
              />
            </span>
          </label>

          <button className="search-submit-button" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="search-spinner" aria-hidden="true" />
                Searching
              </>
            ) : (
              <>
                Search jobs <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        <div className="popular-searches">
          <span>Popular:</span>

          {["AI Engineer", "Software Engineer", "Data Analyst", "Internship"].map(
            (item) => (
              <button
                key={item}
                type="button"
                disabled={loading}
                onClick={() => {
                  setQuery(item);
                  void handleSearch(undefined, item, location);
                }}
              >
                {item}
              </button>
            )
          )}
        </div>
      </section>

      <section className="results-section">
        <div className="results-heading">
          <div>
            <span className="section-label">CAREER OPPORTUNITIES</span>
            <h2>{searched ? "Search results" : "Explore opportunities"}</h2>
            <p className="results-subtitle">
              {searched
                ? `Results for "${query}" in ${location}`
                : "Find opportunities that match your skills and goals."}
            </p>
          </div>

          <span className="result-count">
            {loading ? "Searching..." : `${jobs.length} ${jobs.length === 1 ? "job" : "jobs"} found`}
          </span>
        </div>

        {loading && (
          <div className="search-status" role="status" aria-live="polite">
            <span className="search-spinner" aria-hidden="true" />
            <div>
              <strong>Finding opportunities</strong>
              <p>Searching for jobs that match your query...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message" role="alert">
            <span className="error-icon" aria-hidden="true">!</span>
            <div>
              <strong>We couldn't load the jobs.</strong>
              <p>{error}</p>
              <p>Check your internet connection and confirm the backend is running.</p>
              <button
                type="button"
                className="retry-button"
                onClick={() => void handleSearch()}
                disabled={loading}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">⌕</div>
            <h3>{searched ? "No matching jobs found" : "Your next opportunity awaits"}</h3>
            <p>
              {searched
                ? "Try a different job title or location to discover more opportunities."
                : "Enter a job title and location above to start your search."}
            </p>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="job-grid">
            {jobs.map((job, index) => (
              <JobCard key={job.id ?? `${job.title}-${index}`} job={job} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

