const API_BASE_URL = "http://127.0.0.1:8000";

export interface Job {
  id: string | null;
  title: string;
  company: string;
  location: string;
  description: string;
  employment_type: string | null;
  is_remote: boolean;
  posted_at: string | null;
  apply_url: string | null;
  source: string | null;
}

export interface JobSearchResponse {
  success: boolean;
  count: number;
  jobs: Job[];
}

export async function searchLiveJobs(
  query: string,
  location: string
): Promise<JobSearchResponse> {
  const params = new URLSearchParams({
    query,
    location,
    page: "1",
  });

  const response = await fetch(
    `${API_BASE_URL}/api/jobs/live?${params.toString()}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail?.message ||
      errorData.detail ||
      `Job search failed (${response.status})`
    );
  }

  return response.json();
}