import type { Job } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`API request failed: HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getJobs(): Promise<Job[]> {
  return request<Job[]>("/api/jobs");
}

export function recommendJobs(skills: string[]): Promise<Job[]> {
  return request<Job[]>("/api/recommend", {
    method: "POST",
    body: JSON.stringify({ skills }),
  });
}
