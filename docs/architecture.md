# EDUGENIE Architecture Documentation

## 1. System Overview

**EDUGENIE** ("Google Gemini Powered Learning Assistant") is a production-grade full-stack AI educational platform designed with enterprise-level software engineering practices.

### Core Architectural Pillars
- **Strict Separation of Concerns**: Monorepo structure with distinct frontend, backend, test suites, and documentation.
- **Strong Typing & Validation**: End-to-end type safety with TypeScript on the client and Pydantic v2 on the FastAPI backend.
- **Zero Secret Exposure**: Google Gemini API keys and server-side credentials reside exclusively in the backend runtime environment.
- **Observability by Design**: Structured logging with request tracing, execution time tracking, and centralized exception translation.
- **Reliable Communication**: Frontend dev proxy via Vite routing `/api` directly to FastAPI without cross-origin configuration fragility.

---

## 2. Monorepo Topology

```text
edugenie/
├── frontend/                     # React + TypeScript + Vite Client
│   ├── src/
│   │   ├── api/                  # Typed HTTP client and API endpoints
│   │   │   ├── client.ts         # Central fetch wrapper with timeout & error handling
│   │   │   └── health.ts         # Health check service
│   │   ├── components/           # Accessible, modular UI components
│   │   │   ├── common/           # Header, Card, Button, StatusBadge
│   │   │   └── dashboard/        # SystemHealthCard, ArchitectureRoadmap, EngineeringPrinciples
│   │   ├── styles/               # Design tokens, dark mode, glassmorphism
│   │   │   └── variables.css     # CSS variables, color palettes, transitions
│   │   ├── types/                # Domain and API TypeScript definitions
│   │   │   ├── api.ts            # Health and error contracts
│   │   │   └── education.ts      # Domain models for 5 educational features
│   │   ├── App.tsx               # Main application container
│   │   └── main.tsx              # React DOM entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts            # Vite config with /api reverse proxy
│
├── backend/                      # Python FastAPI Application
│   ├── app/
│   │   ├── api/                  # Routing and endpoint handlers
│   │   │   ├── router.py         # Main API router (/api)
│   │   │   └── v1/
│   │   │       └── endpoints/
│   │   │           └── health.py # GET /api/health endpoint
│   │   ├── core/                 # Foundation systems
│   │   │   ├── config.py         # Pydantic Settings & environment validation
│   │   │   ├── error_handlers.py # Centralized FastAPI exception handlers
│   │   │   ├── exceptions.py     # Domain exception hierarchy (AppException)
│   │   │   └── logging.py        # Structured logger with ISO timestamps
│   │   ├── schemas/              # Pydantic data transfer models
│   │   │   ├── common.py         # ErrorResponse and ErrorPayload
│   │   │   └── health.py         # HealthResponse schema
│   │   ├── services/             # Core business logic
│   │   │   ├── base.py           # BaseService class
│   │   │   └── ai/               # AI orchestration
│   │   │       ├── base.py       # Abstract BaseAIService contract
│   │   │       └── gemini_service.py # Gemini client provider (no mock strings)
│   │   └── main.py               # FastAPI application factory & lifespan
│   ├── pyproject.toml            # Python packaging metadata & pytest config
│   └── requirements.txt          # Python dependencies
│
├── tests/                        # Automated Test Suites
│   ├── conftest.py               # Pytest fixtures and test client
│   ├── test_config.py            # Settings and CORS loading tests
│   ├── test_exceptions.py        # Exception handlers and 422 validation tests
│   └── test_health.py            # GET /api/health verification tests
│
├── docs/                         # Architecture and API documentation
│   └── architecture.md
│
├── .env.example                  # Environment template with placeholders
├── .gitignore                    # Comprehensive ignores for OS, Node, Python
├── package.json                  # Root runner orchestrating concurrent dev
└── README.md                     # Installation, execution, and architecture guide
```

---

## 3. Communication & Gateway Flow

```text
Browser (React + TS)
       │
       │ (Relative requests: /api/health)
       ▼
Vite Dev Server (Port 5173)
       │
       │ (Proxy rule: /api -> http://127.0.0.1:8000)
       ▼
FastAPI Application (Port 8000)
       │
       ├── Middleware Pipeline (Request Timing, CORS, Logging)
       ├── API Router (/api/health)
       ├── Pydantic Serialization (HealthResponse)
       └── Error Handlers (AppException -> ErrorResponse)
```

In production, an ingress controller, Nginx reverse proxy, or cloud load balancer replaces the Vite dev proxy, routing `/api/*` to the FastAPI ASGI cluster and static assets to CDN storage.

---

## 4. Google Gemini AI Architecture

The AI subsystem adheres to the following rules:
1. **Configurable Model Name**: Controlled through `GEMINI_MODEL` (e.g. `gemini-2.5-flash`), never hardcoded.
2. **Key Isolation**: `GEMINI_API_KEY` is validated by Pydantic Settings on startup and injected strictly into backend server calls.
3. **Prepared Grounding Interface**: `BaseAIService` specifies `web_search_grounding: bool = False` parameters across all five core capabilities:
   - Educational Q&A
   - Concept Explanation
   - Adaptive Quiz Generation
   - Text Summarization
   - Personalized Learning Paths
4. **No Fake AI Responses**: Methods either call verified Google GenAI SDK APIs or enforce architectural boundary preconditions.

---

## 5. Security & Error Handling

- **Error Format**: All errors return a uniform JSON schema:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Human readable explanation",
      "details": { ... }
    }
  }
  ```
- **CORS**: Configurable via `CORS_ORIGINS` environment variable (JSON or comma-separated), preventing wildcard exposure in production.

---

## 6. Firebase Authentication Architecture (Step 5)

### Modular Web SDK Structure
EduGenie uses the modern Firebase Web SDK (v12) with tree-shakeable modular imports (`firebase/app`, `firebase/auth`).

```text
Browser Client (React 19)
    │
    ├── src/lib/firebase.ts           # Centralized singleton (initializeApp, getAuth, GoogleAuthProvider)
    ├── src/context/AuthContext.tsx   # React Provider with onAuthStateChanged observer
    ├── src/hooks/useAuth.ts          # Type-safe consumer hook
    ├── src/lib/authErrors.ts         # User-friendly error sanitizer (no raw stack traces)
    │
    ├── Route Guarding:
    │   ├── ProtectedRoute            # Strict guard for /dashboard, /ask, /quiz, /learn, etc.
    │   └── PublicRoute               # Guest redirector for /login and /signup
    │
    └── Backend Token Foundation:
        └── src/api/client.ts         # Asynchronous Bearer ID token injection interceptor
```

### Authentication Flows
1. **Email + Password**:
   - Registration via `createUserWithEmailAndPassword()` + `updateProfile()` for display names.
   - Automatic dispatch of email verification via `sendEmailVerification()`.
   - Login via `signInWithEmailAndPassword()`.
   - Password recovery via `sendPasswordResetEmail()` with generic user-facing safety messaging.
2. **Google OAuth**:
   - `signInWithPopup(auth, googleProvider)` with controlled fallback to `signInWithRedirect()`.
   - Automatic extraction of Google profile photo with graceful initials avatar fallback.
3. **Session State Lifecycle**:
   - `onAuthStateChanged()` serves as the single source of truth for authentication state.
   - Clean `signOut()` clears application cache while deferring session cleanup to Firebase SDK.

### Backend Token Verification Foundation
When authenticated, `apiClient` automatically attaches the user's Firebase ID token to backend requests via the standard HTTP header:
```http
Authorization: Bearer <Firebase_ID_Token>
```
Backend token verification using Firebase Admin SDK is prepared for the subsequent backend security integration phase.

### Vercel & Production Deployment Preparation
For Vercel or cloud static hosting, configure the following environment variables in the project settings:
- `VITE_FIREBASE_API_KEY`: Client public API key
- `VITE_FIREBASE_AUTH_DOMAIN`: `your-project-id.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID`: Firebase project identifier
- `VITE_FIREBASE_STORAGE_BUCKET`: `your-project-id.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Cloud Messaging sender ID
- `VITE_FIREBASE_APP_ID`: Web app identifier
- `VITE_API_BASE_URL`: Production FastAPI backend URL (e.g. `https://api.edugenie.org`)

Ensure that the production domain is added to **Firebase Console -> Authentication -> Settings -> Authorized Domains**.

