# 🫀 Health Recorder

A personal health data recorder with Google Fit and Google Sheets sync.

**Tech stack:** FastAPI · SQLite · React · TypeScript · TailwindCSS · Recharts

---

## Features

| Metric | Record | Chart | Google Fit | Google Sheets |
|--------|--------|-------|-----------|---------------|
| Body weight & BMI | ✅ | ✅ | ✅ | ✅ |
| Total / LDL / HDL Cholesterol | ✅ | ✅ | — | ✅ |
| Triglycerides | ✅ | ✅ | — | ✅ |
| Fasting / Random Glucose | ✅ | ✅ | ✅ | ✅ |
| HbA1c | ✅ | ✅ | — | ✅ |
| Uric Acid | ✅ | ✅ | — | ✅ |
| Blood Pressure | ✅ | ✅ | ✅ | ✅ |
| Heart Rate | ✅ | ✅ | ✅ | ✅ |

> **Note:** Google Fit only has native data types for weight, blood pressure, blood glucose, and heart rate.
> All other lab values (cholesterol, uric acid, HbA1c, etc.) are synced to Google Sheets.

---

## Quick Start (Local Dev)

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Backend

```bash
cd backend
cp .env.example .env        # edit with your Google credentials
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API is now running at http://localhost:8000  
Swagger docs at http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App is now running at http://localhost:5173

---

## Google OAuth2 Setup

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable these APIs:
   - **Fitness API** (Google Fit)
   - **Google Sheets API**
   - **Google Drive API**
4. Go to **Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:8000/auth/google/callback`
5. Copy the **Client ID** and **Client Secret** into `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
6. Restart the backend
7. In the app, go to **Settings** → **Connect Google Account**

---

## Docker Compose

```bash
cp backend/.env.example backend/.env    # edit with Google credentials
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health/body-metrics` | List all weight entries |
| POST | `/health/body-metrics` | Add new weight entry |
| PUT | `/health/body-metrics/{id}` | Update entry |
| DELETE | `/health/body-metrics/{id}` | Delete entry |
| GET | `/health/lab-results` | List lab results (filter by test_type) |
| POST | `/health/lab-results` | Add new lab result |
| GET | `/health/vital-signs` | List BP / heart rate readings |
| POST | `/health/vital-signs` | Add new vital sign reading |
| GET | `/health/lab-types` | All supported test types + reference ranges |
| GET | `/auth/google/login` | Start Google OAuth2 flow |
| GET | `/auth/google/status` | Current connected account |
| DELETE | `/auth/google/disconnect` | Remove stored credentials |
| POST | `/sync/all` | Sync all unsynced records to Google |
| POST | `/sync/body-metrics/{id}` | Sync single weight entry |
| POST | `/sync/lab-results/{id}` | Sync single lab result |
| POST | `/sync/vital-signs/{id}` | Sync single vital reading |

---

## Project Structure

```
health-recorder/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Settings (env vars)
│   │   ├── database.py          # SQLAlchemy + SQLite
│   │   ├── models/health.py     # ORM models
│   │   ├── schemas/health.py    # Pydantic schemas + reference ranges
│   │   ├── routers/
│   │   │   ├── health.py        # CRUD endpoints
│   │   │   ├── auth.py          # OAuth2 endpoints
│   │   │   └── sync.py          # Google sync endpoints
│   │   └── services/
│   │       ├── google_auth.py   # OAuth2 helper
│   │       ├── google_fit.py    # Google Fit sync
│   │       └── google_sheets.py # Google Sheets sync
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/client.ts        # Axios API client
│   │   ├── types/health.ts      # TypeScript interfaces
│   │   ├── components/
│   │   │   ├── forms/           # Entry forms
│   │   │   └── charts/          # Recharts components
│   │   └── pages/               # Dashboard, BodyMetrics, LabResults, VitalSigns, Settings
│   └── package.json
├── docker-compose.yml
└── README.md
```
