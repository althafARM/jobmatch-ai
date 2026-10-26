export interface Job {
  id: string | number;
  title: string;
  company: string;
  location: string;
  type?: string;
  description?: string;
  salary?: string | null;
  skills?: string[];
  source?: string;
  matchScore?: number;
}
