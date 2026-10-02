# EDUGENIE
> **Google Gemini Powered Personalized Learning Assistant**
> *Project Submission for Naan Mudhalvan Skill Development Program*

[![Tests](https://img.shields.io/badge/Tests-229%20Passed-brightgreen)](https://github.com/rahman789641-debug/EDUGENIE)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-blue)](https://github.com/rahman789641-debug/EDUGENIE)
[![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python%203.11-teal)](https://github.com/rahman789641-debug/EDUGENIE)
[![AI](https://img.shields.io/badge/AI%20Engine-Google%20Gemini%203.1-orange)](https://github.com/rahman789641-debug/EDUGENIE)
[![License](https://img.shields.io/badge/License-MIT-purple)](https://github.com/rahman789641-debug/EDUGENIE)

* **GitHub Repository**: [https://github.com/rahman789641-debug/EDUGENIE](https://github.com/rahman789641-debug/EDUGENIE)
* **Live Demo**: [https://rahman789641-debug.github.io/EDUGENIE/](https://rahman789641-debug.github.io/EDUGENIE/)

EDUGENIE is a production-grade, full-stack AI educational assistant engineered with React 19, FastAPI, Google Gemini 2.5/3.1, Firebase Authentication, DuckDuckGo/Tavily Web Research, and persistent SQLite learning analytics.

---

## 1. EduGenie Overview

EduGenie empowers students and lifelong learners through six core AI-powered educational modules:
- **Ask AI (Q&A)**: Grounded question answering with dual AI-only and verified web-research modes.
- **Concept Explanation**: Adaptive pedagogical deconstruction tailoring explanations from beginner to advanced.
- **Interactive Quiz Generator**: Structured multiple-choice practice assessments generated from educational material with client-side grading.
- **Educational Summarizer**: Clear, revision-ready reductions retaining essential concepts without redundant fluff.
- **Personalized Learning Path**: Sequential study roadmaps organized by prerequisite difficulty and weeks.
- **Live Web Research**: Transparent external web search and source grounding with clickable citation cards.
- **Learning History & Dashboard**: Aggregated metrics and paginated session history with multi-user isolation.

---

## 2. Architecture

```
                  ┌────────────────────────────────────────┐
                  │          React 19 Frontend             │
                  │   Vite + TypeScript + CSS Tokens       │
                  └──────────────────┬─────────────────────┘
                                     │  Bearer ID Token (JWT)
                                     ▼
                  ┌────────────────────────────────────────┐
                  │          FastAPI Backend               │
                  │  Lifespan + CORS + Rate Limiter (429)  │
                  └──────┬──────────────┬──────────────┬───┘
                         │              │              │
       Firebase Admin SDK│   Google GenAI│SDK    SQLite│Thread-safe
                         ▼              ▼              ▼
                  ┌────────────┐ ┌─────────────┐ ┌──────────────┐
                  │  Firebase  │ │Google Gemini│ │ SQLite DB    │
                  │  Auth (STS)│ │2.5/3.1 Flash│ │ (edugenie.db)│
                  └────────────┘ └─────────────┘ └──────────────┘
```

- **Frontend**: Single-Page Application (SPA) using React 19, TypeScript, Vite, React Router 7, and Firebase Web SDK v12.
- **Backend**: FastAPI ASGI service with Pydantic v2 schemas, async SQLite persistence, sliding-window rate limiting, and standard error envelopes.
- **API Boundary**: Versioned under `/api/v1` with a public health check probe at `/health`.

---

## 3. Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Python**: v3.10, v3.11, or v3.12 (Python 3.15 tested)
- **Package Managers**: `npm` (Node) and `pip` (Python)
- **Google AI Studio API Key**: For Gemini AI capabilities
- **Firebase Project**: For user authentication (Email/Password and Google OAuth)

---

## 4. Local Setup

Clone the repository and install dependencies:

```bash
# 1. Clone repository
git clone https://github.com/rahman789641-debug/EDUGENIE.git
cd EDUGENIE

# 2. Install root and frontend dependencies
npm install
npm --prefix frontend install

# 3. Create Python virtual environment and install backend dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

---

## 5. Environment Variables

EduGenie isolates client configuration from server secrets.

### Backend Environment (`backend/.env` or root `.env`)
```ini
APP_NAME=EDUGENIE
APP_ENV=development
DEBUG=true
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO

# CORS Configuration (allowed frontend domains)
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000"]

# Google Gemini API Key (Backend-Only Secret)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite

# Firebase Authentication Verification
FIREBASE_PROJECT_ID=edugenie-eb3f5

# Rate Limiting & Abuse Prevention
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STANDARD_PER_MINUTE=120
RATE_LIMIT_AI_PER_MINUTE=30

# Persistence
DATABASE_PATH=backend/data/edugenie.db
```

### Frontend Environment (`frontend/.env`)
```ini
# Backend API Base URL (empty for Vite local proxy; full domain for production)
VITE_API_BASE_URL=

# Public Firebase Web Client Credentials
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

---

## 6. Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Authentication** > **Sign-in method** and enable:
   - **Email/Password**
   - **Google**
3. Navigate to **Project Settings** > **General** > **Your apps** > **Web App** (`</>`).
4. Copy the client configuration keys into `frontend/.env`.
5. Under **Authentication** > **Settings** > **Authorized domains**, add your deployment domains (e.g. `localhost`, `your-app.vercel.app`).

---

## 7. Gemini API Setup

1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. Set `GEMINI_API_KEY` in `backend/.env`.
3. Set `GEMINI_MODEL=gemini-3.1-flash-lite` (or `gemini-2.5-flash`).
4. *Security Notice*: The Gemini API key is strictly isolated to the backend and never bundled into frontend assets.

---

## 8. Web Research Setup

EduGenie supports dual-mode search:
- **Default Open Web Search**: Out-of-the-box DuckDuckGo HTML search (no external search key required).
- **Dedicated Provider (Optional)**: Set `TAVILY_API_KEY=tvly-...` in `backend/.env` for Tavily Search API.

---

## 9. Run Frontend

```bash
# From workspace root
npm run dev:frontend

# Or directly in frontend folder
cd frontend && npm run dev
```
The client starts on `http://localhost:5173`.

---

## 10. Run Backend

```bash
# Using virtual environment
source .venv/bin/activate
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API endpoints are available on `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

---

## 11. Run Tests

```bash
# Run both backend and frontend test suites
npm test

# Run backend tests only (136 unit and integration tests)
npm run test:backend
# Or: ./.venv/bin/pytest tests/

# Run frontend typecheck
npm run typecheck

# Run real Google Gemini verification scripts
./.venv/bin/python scripts/verify_real_gemini_step14.py

# Run browser E2E test suite (Headless Puppeteer)
node scripts/test_step14_e2e.mjs
node scripts/verify_full_regression.mjs
```

---

## 12. Production Build

```bash
# Build frontend for production
npm run build
```
Generates optimized static artifacts in `frontend/dist`.

---

## 13. Deployment

### Frontend (Vercel)
The project includes [`frontend/vercel.json`](file:///Users/software%20file/EDUGENIE/frontend/vercel.json) with SPA rewrites and security headers.
1. Link your repository in Vercel.
2. Set Root Directory to `frontend`.
3. Configure Environment Variables (`VITE_API_BASE_URL=https://your-backend-api.com`, `VITE_FIREBASE_*`).
4. Deploy.

### Backend (Render / Railway / Docker / Cloud Run)
The backend includes both a [`backend/Procfile`](file:///Users/software%20file/EDUGENIE/backend/Procfile) and a multi-stage [`backend/Dockerfile`](file:///Users/software%20file/EDUGENIE/backend/Dockerfile).
- **PaaS (Render / Railway)**:
  - Root directory: `backend`
  - Build command: `pip install -r requirements.txt`
  - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - Set `APP_ENV=production`, `GEMINI_API_KEY`, `CORS_ORIGINS=["https://your-frontend.vercel.app"]`.
- **Docker / Cloud Run**:
  ```bash
  docker build -t edugenie-backend backend/
  docker run -p 8000:8000 -e GEMINI_API_KEY="your-key" edugenie-backend
  ```

---

## 14. Troubleshooting

- **CORS Error**: Ensure your frontend domain is listed in `CORS_ORIGINS` in `backend/.env`. Wildcard `*` is rejected in production mode when credentials are enabled.
- **Rate Limit Throttling (429)**: The server limits AI requests to 30/min per IP. Wait for the `Retry-After` seconds or adjust `RATE_LIMIT_AI_PER_MINUTE`.
- **Missing Gemini Key on Startup**: In production mode (`APP_ENV=production`), the application fails fast if `GEMINI_API_KEY` is empty. Ensure your host environment variable is configured.
- **Firebase Token Expired (401)**: The client SDK automatically refreshes ID tokens before dispatch. If a session expires, the UI prompts for re-authentication.

---

## 15. Security Notes

- **Secrets Isolation**: `GEMINI_API_KEY` and service account keys are backend-only.
- **Token Verification**: User identity is derived strictly from cryptographic Firebase JWT claims on the server. Client-sent `user_id` parameters are ignored.
- **Data Isolation**: SQLite queries strictly filter by verified `user.uid`.
- **Rate Limiting**: Sliding-window rate limiter prevents abuse of expensive AI endpoints.
- **Security Headers**: Standard OWASP headers (`nosniff`, `DENY`, `strict-origin-when-cross-origin`) are injected automatically on every response.
