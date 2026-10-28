import { useEffect, useState } from "react";
import "./App.css";
import type { Job } from "./services/jobservice";
import JobCard from "./components/JobCard";

import JobSearch from "./components/JobSearch";
import AIResumeMatcher from "./components/AIResumeMatcher";
import ResumeJobFinder from "./components/ResumeJobFinder";

type Page = "Dashboard" | "Find Jobs" | "AI Resume Matcher" | "Saved Jobs";

function App() {
  const [activePage, setActivePage] = useState<Page>("Dashboard");
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("jobmatch-theme") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("jobmatch-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const navigationItems: {
    name: Page;
    icon: string;
    badge?: string;
  }[] = [
    { name: "Dashboard", icon: "▦" },
    { name: "Find Jobs", icon: "⌕" },
    { name: "AI Resume Matcher", icon: "✧", badge: "AI" },
    { name: "Saved Jobs", icon: "♡" },
  ];

  const categories = [
    {
      name: "AI / Machine Learning",
      description: "Build intelligent solutions",
      icon: "🤖",
      query: "AI Machine Learning",
    },
    {
      name: "Software Engineering",
      description: "Develop modern applications",
      icon: "💻",
      query: "Software Engineer",
    },
    {
      name: "Data Science",
      description: "Discover insights from data",
      icon: "📊",
      query: "Data Scientist",
    },
    {
      name: "Internships",
      description: "Start your career journey",
      icon: "🎓",
      query: "Intern",
    },
  ];

  const handleCategoryClick = (query: string) => {
    setActivePage("Find Jobs");

    // Allows the existing JobSearch component to receive the selected category.
    window.dispatchEvent(
      new CustomEvent("jobmatch:search", {
        detail: { query },
      })
    );
  };

  const [savedJobs, setSavedJobs] = useState<Job[]>([]);

  useEffect(() => {
    const loadSavedJobs = () => {
      try {
        const stored = JSON.parse(
          localStorage.getItem("jobmatch-saved-jobs") || "[]"
        );

        if (!Array.isArray(stored)) {
          setSavedJobs([]);
          return;
        }

        // Older saved entries were IDs, so only display full job objects.
        const jobs = stored.filter(
          (item): item is Job =>
            typeof item === "object" &&
            item !== null &&
            "title" in item
        );

        setSavedJobs(jobs);
      } catch {
        setSavedJobs([]);
      }
    };

    loadSavedJobs();

    window.addEventListener(
      "jobmatch:saved-jobs-updated",
      loadSavedJobs
    );

    window.addEventListener("storage", loadSavedJobs);

    return () => {
      window.removeEventListener(
        "jobmatch:saved-jobs-updated",
        loadSavedJobs
      );

      window.removeEventListener("storage", loadSavedJobs);
    };
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return (
          <>
            <section className="welcome-header">
              <div className="welcome-content">
                <span className="section-label">YOUR CAREER STARTS HERE</span>

                <h1>
                  Find your next
                  <br />
                  <span>opportunity.</span>
                </h1>

                <p>
                  Discover jobs that match your skills, explore new career
                  paths, and let AI help you take the next step.
                </p>

                <button
                  className="primary-button"
                  onClick={() => setActivePage("Find Jobs")}
                >
                  Explore Jobs <span aria-hidden="true">→</span>
                </button>
              </div>

              <div className="welcome-illustration" aria-hidden="true">
                <div className="illustration-circle">
                  <span className="illustration-emoji">🚀</span>
                </div>

                <div className="illustration-card illustration-card-top">
                  <span>✨</span>
                  <div>
                    <strong>New opportunities</strong>
                    <small>Start something great</small>
                  </div>
                </div>

                <div className="illustration-card illustration-card-bottom">
                  <span>🎯</span>
                  <div>
                    <strong>Better job matches</strong>
                    <small>Find your direction</small>
                  </div>
                </div>
              </div>
            </section>

            <section className="dashboard-search">
              <div className="section-heading">
                <div>
                  <span className="section-label">GET STARTED</span>
                  <h2>Find your perfect job</h2>
                  <p>Search for opportunities that fit your goals.</p>
                </div>
              </div>

              <JobSearch />
            </section>

            <section className="career-categories">
              <div className="section-heading">
                <div>
                  <span className="section-label">EXPLORE OPPORTUNITIES</span>
                  <h2>Explore career paths</h2>
                  <p>Choose an area to discover related opportunities.</p>
                </div>

                <button
                  className="text-button"
                  onClick={() => setActivePage("Find Jobs")}
                >
                  View all jobs <span aria-hidden="true">→</span>
                </button>
              </div>

              <div className="category-grid">
                {categories.map((category) => (
                  <button
                    className="category-card"
                    key={category.name}
                    onClick={() => handleCategoryClick(category.query)}
                    type="button"
                  >
                    <span className="category-icon" aria-hidden="true">
                      {category.icon}
                    </span>

                    <span className="category-name">{category.name}</span>

                    <span className="category-description">
                      {category.description}
                    </span>

                    <span className="category-arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="dashboard-tip">
              <div className="tip-icon" aria-hidden="true">
                💡
              </div>

              <div className="tip-content">
                <h3>Make your resume work smarter</h3>
                <p>
                  Use our AI Resume Matcher to compare your resume with job
                  requirements and discover skills you could improve.
                </p>
              </div>

              <button
                className="tip-button"
                onClick={() => setActivePage("AI Resume Matcher")}
              >
                Try AI Matcher <span aria-hidden="true">→</span>
              </button>
            </section>
          </>
        );

      case "Find Jobs":
        return (
          <section className="simple-page">
            <div className="section-heading">
              <div>
                <span className="section-label">JOB DISCOVERY</span>
                <h1>Find your next job</h1>
                <p>
                  Search for opportunities and discover roles that fit your
                  career goals.
                </p>
              </div>
            </div>

            <JobSearch />
          </section>
        );

      case "AI Resume Matcher":
        return (
          <section className="simple-page">
            <div className="section-heading">
              <div>
                <span className="section-label">POWERED BY AI</span>
                <h1>AI Resume Matcher</h1>
                <p>
                  Explore how your resume matches job requirements and identify
                  areas where you can improve.
                </p>
              </div>
            </div>

            <div className="feature-panel">
              <div className="feature-symbol" aria-hidden="true">
                ✨
              </div>

              <div className="feature-panel-content">
                <h2>Find jobs that match your skills</h2>
                <p>
                  Use your resume to discover relevant opportunities and
                  understand how your skills fit different roles.
                </p>
              </div>
            </div>

            <ResumeJobFinder />
            <AIResumeMatcher />
          </section>
        );

      case "Saved Jobs":
        return (
          <section className="simple-page">
            <div className="section-heading">
              <div>
                <span className="section-label">YOUR COLLECTION</span>
                <h1>Saved Jobs</h1>
                <p>
                  Keep track of opportunities you want to revisit.
                </p>
              </div>

              <span className="result-count">
                {savedJobs.length} saved{" "}
                {savedJobs.length === 1 ? "job" : "jobs"}
              </span>
            </div>

            {savedJobs.length > 0 ? (
              <div className="job-grid">
                {savedJobs.map((job, index) => (
                  <JobCard
                    key={
                      job.id ??
                      `${job.title}-${job.company}-${index}`
                    }
                    job={job}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon" aria-hidden="true">
                  ♡
                </div>

                <h3>No saved jobs yet</h3>

                <p>
                  Find interesting opportunities and click the heart icon
                  to save them here.
                </p>

                <button
                  className="primary-button"
                  onClick={() => setActivePage("Find Jobs")}
                >
                  Explore Jobs <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`app dashboard-layout ${darkMode ? "dark-mode" : ""}`}>
      <aside className="sidebar">
        
        <span className="brand-icon" aria-hidden="true">
            J
          </span>
        <span className="brand-name">
            JobMatch<span>AI</span>
          </span>

        <div className="sidebar-section">
          <span className="sidebar-label">WORKSPACE</span>

          <nav className="sidebar-nav" aria-label="Main navigation">
            {navigationItems.map((item) => (
              <button
                key={item.name}
                type="button"
                className={`nav-item ${
                  activePage === item.name ? "active" : ""
                }`}
                onClick={() => setActivePage(item.name)}
                aria-current={activePage === item.name ? "page" : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>

                <span className="nav-text">{item.name}</span>

                {item.badge && (
                  <span className="new-badge">{item.badge}</span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-help-icon" aria-hidden="true">
            💬
          </div>

          <div className="sidebar-help-text">
            <strong>Need a little help?</strong>
            <p>Keep moving toward your goals.</p>
          </div>
        </div>

      </aside>

      <main className="dashboard-main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-separator" aria-hidden="true">
              /
            </span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setDarkMode((current) => !current)}
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              title={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              <span aria-hidden="true">{darkMode ? "☀️" : "🌙"}</span>
              <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
            </button>

            <div className="country-badge">
              <span aria-hidden="true">📍</span>
              Sri Lanka
            </div>

            <button
              className="profile-avatar"
              type="button"
              title="Your profile"
              aria-label="Your profile"
              onClick={() =>
                window.alert(
                  "Profile settings can be added to JobMatch AI in a future update."
                )
              }
            >
              U
            </button>
          </div>
        </header>

        <div className="page-content">
          {renderPage()}

          <footer className="dashboard-footer">
            <span>
              © {new Date().getFullYear()} JobMatch AI
            </span>
            <span>Find your fit. Build your future.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;

