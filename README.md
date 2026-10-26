# JobMatch AI — Full Starter Project

A full-stack starter for a job-matching platform:
- React + TypeScript + Vite frontend
- FastAPI backend
- Job search with keyword, location, and job-type filters
- Save jobs in the browser (localStorage)
- Simple skill-overlap match score demonstration
- API health endpoint and interactive FastAPI docs

## Requirements
- Node.js 20+ recommended
- Python 3.10+

## 1. Run the backend (Windows PowerShell)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend:
- API: http://127.0.0.1:8000
- Swagger docs: http://127.0.0.1:8000/docs

## 2. Run the frontend (new terminal)

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

## Notes
- The included job listings are clearly labelled **demo seed data**. This starter does not scrape job boards or fetch live vacancies from external websites.
- The match score is a simple skill-overlap demonstration, not a trained ML model.
- Replace the seed data with a legitimate jobs API or your own database to provide live listings.
- The frontend `.env` defaults to `http://127.0.0.1:8000`. If you change it, restart Vite.
