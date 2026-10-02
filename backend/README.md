# EDUGENIE — FastAPI Backend Foundation

> **Google Gemini Powered Learning Assistant (Backend API Service)**

Production-grade FastAPI ASGI backend establishing modular architecture, Pydantic v2 validation, versioned endpoints (`/api/v1`), centralized exception handling, structured tracing, and security controls.

---

## 1. Project Structure

```text
backend/
├── app/
│   ├── __init__.py               # Package metadata
│   ├── main.py                   # FastAPI app factory, lifespan, and middlewares
│   ├── api/
│   │   ├── __init__.py
│   │   ├── router.py             # Router aggregator mounting v1 & compatibility routes
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── health.py         # GET /api/v1/health
│   │       ├── qa.py             # POST /api/v1/qa
│   │       ├── explain.py        # POST /api/v1/explain
│   │       ├── quiz.py           # POST /api/v1/quiz
│   │       ├── summarize.py      # POST /api/v1/summarize
│   │       └── learning_path.py  # POST /api/v1/learn/recommendations
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py             # Pydantic Settings, env loading, CORS parsing
│   │   ├── logging.py            # Structured ISO timestamped logger
│   │   ├── exceptions.py         # AppException hierarchy (AI_SERVICE_NOT_CONFIGURED, 413, etc.)
│   │   └── error_handlers.py     # Centralized exception handlers with Request ID
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── common.py             # ErrorResponse, ErrorPayload, BaseResponse
│   │   ├── health.py             # HealthResponse
│   │   ├── qa.py                 # QARequest, QAResponse
│   │   ├── explain.py            # ExplainRequest, ExplainResponse, AudienceLevel, Depth
│   │   ├── quiz.py               # QuizRequest, QuizResponse, QuizQuestionItem, Difficulty
│   │   ├── summarize.py          # SummarizeRequest, SummarizeResponse, SummaryFormat
│   │   └── learning_path.py      # LearningPathRequest, LearningPathResponse, MilestoneStage
│   ├── services/
│   │   ├── __init__.py
│   │   ├── base.py               # BaseService class
│   │   ├── ai_service.py         # BaseAIService abstract interface & AIService provider
│   │   ├── qa_service.py         # QAService business logic
│   │   ├── explanation_service.py# ExplanationService business logic
│   │   ├── quiz_service.py       # QuizService business logic
│   │   ├── summary_service.py    # SummaryService business logic
│   │   └── learning_path_service.py # LearningPathService business logic
│   └── utils/
│       ├── __init__.py
│       └── helpers.py            # Request ID validation, word counting, prompt truncation
├── pyproject.toml                # Project packaging and pytest configuration
├── requirements.txt              # Pinned backend dependencies
└── README.md                     # Backend architectural guide
```

---

## 2. Python Version & Requirements

- **Supported Python**: `Python 3.10+` (Tested on `Python 3.15`)
- **Key Dependencies**:
  - `fastapi >= 0.115.0`
  - `uvicorn[standard] >= 0.30.0`
  - `pydantic >= 2.8.0`
  - `pydantic-settings >= 2.4.0`
  - `anyio >= 4.8.0, < 4.9.0` (Pinned for Python 3.15 typing compatibility)
  - `google-genai >= 2.0.0` (Scheduled for invocation in Step 4)
  - `pytest >= 8.0.0`
  - `httpx >= 0.27.0`

---

## 3. Virtual Environment Setup & Installation

From the project root:

```bash
# 1. Create a virtual environment
python3 -m venv .venv

# 2. Activate virtual environment
source .venv/bin/activate

# 3. Install pinned dependencies
pip install -r backend/requirements.txt
```

---

## 4. Environment Variables

Create `.env` by copying `.env.example`:

```bash
cp .env.example .env
```

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `APP_NAME` | string | `EDUGENIE` | Service name |
| `APP_ENV` | string | `development` | Environment (`development`, `test`, `production`) |
| `DEBUG` | boolean | `true` | FastAPI debug mode |
| `APP_HOST` / `HOST` | string | `0.0.0.0` | Bind IP host |
| `APP_PORT` / `PORT` | integer | `8000` | Bind server port |
| `API_V1_PREFIX` | string | `/api/v1` | Canonical versioned API prefix |
| `LOG_LEVEL` | string | `INFO` | Log severity level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `MAX_REQUEST_BODY_BYTES` | integer | `1048576` | Max request body size (1 MB) to prevent DoS |
| `CORS_ORIGINS` | JSON/csv | `["http://localhost:5173", ...]` | Allowed client origins |
| `GEMINI_API_KEY` | string | *Empty* | Google AI Studio Key (Never exposed to clients) |
| `GEMINI_MODEL` | string | `gemini-2.5-flash` | Configurable model identifier |

---

## 5. Running FastAPI

### Using Uvicorn Directly
```bash
PYTHONPATH=backend .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Using Root Development Script
```bash
# From workspace root:
npm run dev:backend
```

---

## 6. API Endpoints

### Canonical Versioned Routes (`/api/v1`)

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service liveness and operational check | `200 OK` |
| `POST` | `/api/v1/qa` | Educational question answering | `200 OK` / `503`* |
| `POST` | `/api/v1/explain` | Pedagogical concept explanation | `200 OK` / `503`* |
| `POST` | `/api/v1/quiz` | Practice quiz generation | `200 OK` / `503`* |
| `POST` | `/api/v1/summarize` | Text and lecture note summarization | `200 OK` / `503`* |
| `POST` | `/api/v1/learn/recommendations` | Milestone learning pathway recommendations | `200 OK` / `503`* |

*\*Note: In Step 3, the AI endpoints enforce boundary conditions and return `503 AI_SERVICE_NOT_CONFIGURED` without mock strings until Gemini integration is connected in Step 4.*

### Compatibility Routes
- `GET /api/health` — Backward compatibility alias
- `GET /health` — Container / orchestrator probe

---

## 7. Health Check Verification

```bash
# Canonical v1 health probe
curl -i http://127.0.0.1:8000/api/v1/health

# Response
# HTTP/1.1 200 OK
# Content-Type: application/json
# X-Request-ID: req-...
# X-Process-Time-Ms: 0.42
# {"status":"ok","service":"edugenie-api"}
```

---

## 8. Testing & Validation

Run the automated backend test suite using `pytest`:

```bash
PYTHONPATH=backend .venv/bin/pytest tests
```

Tests cover:
- Health check endpoints and header tracing
- Request validation rules and enum rejections
- Controlled `AI_SERVICE_NOT_CONFIGURED` exception boundaries
- Dependency injection overrides with mock AI service
- Centralized configuration parsing
- Payload size limit enforcement (`HTTP 413`)

---

## 9. Interactive API Documentation

When running in `DEBUG=true` mode:
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`
- **OpenAPI Schema**: `http://127.0.0.1:8000/openapi.json`

---

## 10. Architecture & Security Notes

- **Layered Architecture**: Route → Pydantic Schema Validation → Service → AI Service Abstraction.
- **Request Tracing**: Every request is assigned or preserves a validated `X-Request-ID` header, propagated into logs and error responses.
- **Secret Isolation**: `GEMINI_API_KEY` is loaded exclusively in server memory and is never logged or returned over HTTP.
- **Controlled Step Boundary**: Actual Google Gemini API integration and prompt orchestration will be implemented in **STEP 4**.
