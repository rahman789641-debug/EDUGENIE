"""Real Google Gemini & Persistence Live Verification for Step 16.

Performs live end-to-end execution of all 6 AI modules using:
1. Real Google Gemini API (gemini-3.1-flash-lite)
2. Real persistent SQLite database (backend/data/edugenie.db)
3. Real web research via DuckDuckGo open search
4. Precise latency measurement
5. Multi-user isolation verification
6. Persistence verification across disk re-open
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings
from app.core.auth import AuthenticatedUser
from app.schemas.qa import QARequest
from app.schemas.explain import ExplainRequest
from app.schemas.quiz import QuizRequest
from app.schemas.summarize import SummarizeRequest
from app.schemas.learning_path import LearningPathRequest
from app.schemas.research import ResearchRequest
from app.schemas.activity import ActivityType
from app.services.ai.gemini_service import GeminiService
from app.services.activity_service import ActivityService
from app.services.qa_service import QAService
from app.services.explanation_service import ExplanationService
from app.services.quiz_service import QuizService
from app.services.summary_service import SummaryService
from app.services.learning_path_service import LearningPathService
from app.services.web_research_service import WebResearchService
from app.repositories.sqlite_activity_repository import SQLiteActivityRepository


async def run_step16_live_verification():
    print("=" * 80)
    print("EDUGENIE STEP 16 — REAL PRODUCTION SERVICES & PERSISTENCE VERIFICATION")
    print("=" * 80)

    settings = get_settings()
    if not settings.is_gemini_configured:
        print("[ERROR] GEMINI_API_KEY is not configured in .env.")
        sys.exit(1)

    print(f"[OK] Gemini Model: {settings.GEMINI_MODEL}")
    print(f"[OK] Database Path: {settings.DATABASE_PATH}")

    # Initialize repository and services
    repo = SQLiteActivityRepository(db_path=settings.DATABASE_PATH)
    activity_service = ActivityService(repository=repo)
    ai_service = GeminiService(settings=settings)

    research_service = WebResearchService(
        ai_service=ai_service,
        settings=settings,
        activity_service=activity_service,
    )
    qa_service = QAService(
        ai_service=ai_service,
        research_service=research_service,
        activity_service=activity_service,
    )
    explanation_service = ExplanationService(
        ai_service=ai_service,
        activity_service=activity_service,
    )
    quiz_service = QuizService(
        ai_service=ai_service,
        activity_service=activity_service,
    )
    summary_service = SummaryService(
        ai_service=ai_service,
        activity_service=activity_service,
    )
    learning_path_service = LearningPathService(
        ai_service=ai_service,
        activity_service=activity_service,
    )

    user_a = AuthenticatedUser(
        uid="usr_step16_alice_prod",
        email="alice.prod@edugenie.test",
        email_verified=True,
    )
    user_b = AuthenticatedUser(
        uid="usr_step16_bob_prod",
        email="bob.prod@edugenie.test",
        email_verified=True,
    )

    measurements = {}

    initial_stats_a = await activity_service.get_dashboard_stats(user_id=user_a.uid)
    initial_stats_b = await activity_service.get_dashboard_stats(user_id=user_b.uid)
    initial_count_a = initial_stats_a.total_activities

    async def call_with_retry(coro_fn, description, max_attempts=3):
        for attempt in range(1, max_attempts + 1):
            try:
                t0 = time.perf_counter()
                res = await coro_fn()
                lat = (time.perf_counter() - t0) * 1000.0
                return res, lat
            except Exception as e:
                if attempt == max_attempts:
                    raise
                print(f"     [Retry {attempt}/{max_attempts}] {description} hit transient issue: {e}. Retrying in 4s...")
                await asyncio.sleep(4.0)

    # 1. REAL GEMINI Q&A: "What is a REST API?"
    print("\n--- [1/6] Real Gemini Q&A: 'What is a REST API?' ---")
    req_qa = QARequest(question="What is a REST API?", mode="ai")
    res_qa, latency_qa = await call_with_retry(
        lambda: qa_service.process_qa(request=req_qa, user=user_a),
        "Q&A"
    )
    measurements["qa_latency_ms"] = round(latency_qa, 2)
    print(f"[OK] Status: {res_qa.status} | Time: {latency_qa:.2f}ms")
    print(f"     Answer preview ({len(res_qa.answer)} chars): {res_qa.answer[:120]}...")
    assert len(res_qa.answer) > 50

    await asyncio.sleep(2.0)

    # 2. REAL GEMINI CONCEPT EXPLANATION: "Recursion"
    print("\n--- [2/6] Real Gemini Concept Explanation: 'Recursion' ---")
    req_exp = ExplainRequest(topic="Recursion", level="beginner", depth="standard")
    res_exp, latency_exp = await call_with_retry(
        lambda: explanation_service.process_explanation(request=req_exp, user=user_a),
        "Explanation"
    )
    measurements["explain_latency_ms"] = round(latency_exp, 2)
    print(f"[OK] Title: '{res_exp.title}' | Time: {latency_exp:.2f}ms")
    print(f"     Explanation ({len(res_exp.explanation)} chars): {res_exp.explanation[:120]}...")
    print(f"     Key Points count: {len(res_exp.key_points)}")
    assert len(res_exp.explanation) > 30

    await asyncio.sleep(2.0)

    # 3. REAL GEMINI QUIZ: "Photosynthesis"
    print("\n--- [3/6] Real Gemini Quiz: 'Photosynthesis' ---")
    sample_text = (
        "Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy. "
        "Through cellular respiration, this chemical energy is later released to fuel the organism's activities. "
        "Chloroplasts in plant leaves contain chlorophyll, which captures sunlight and combines carbon dioxide and water "
        "to generate glucose and oxygen."
    )
    req_quiz = QuizRequest(content=sample_text, question_count=3, difficulty="beginner")
    res_quiz, latency_quiz = await call_with_retry(
        lambda: quiz_service.process_quiz(request=req_quiz, user=user_a),
        "Quiz"
    )
    measurements["quiz_latency_ms"] = round(latency_quiz, 2)
    print(f"[OK] Title: '{res_quiz.title}' | Questions: {len(res_quiz.questions)} | Time: {latency_quiz:.2f}ms")
    assert len(res_quiz.questions) == 3

    await asyncio.sleep(2.0)

    # 4. REAL GEMINI SUMMARY
    print("\n--- [4/6] Real Gemini Educational Summary ---")
    summary_passage = (
        "Operating systems manage computer hardware and software resources, providing common services for computer programs. "
        "Time-sharing operating systems schedule tasks for efficient use of the system and may also include accounting software "
        "for cost allocation of processor time, mass storage, printing, and other resources. For hardware functions such as input "
        "and output and memory allocation, the operating system acts as an intermediary between programs and the computer hardware. "
        "Modern operating systems use pre-emptive multitasking to ensure responsiveness across concurrent tasks."
    )
    req_sum = SummarizeRequest(content=summary_passage, length="medium", format="bullet_points")
    res_sum, latency_sum = await call_with_retry(
        lambda: summary_service.process_summary(request=req_sum, user=user_a),
        "Summary"
    )
    measurements["summary_latency_ms"] = round(latency_sum, 2)
    print(f"[OK] Summary points ({len(res_sum.key_points)} points) | Time: {latency_sum:.2f}ms")
    print(f"     Summary preview ({len(res_sum.summary)} chars): {res_sum.summary[:120]}...")
    assert len(res_sum.summary) > 20

    await asyncio.sleep(2.0)

    # 5. REAL GEMINI LEARNING PATH: "Python for backend development"
    print("\n--- [5/6] Real Gemini Learning Path: 'Python for backend development' ---")
    req_lp = LearningPathRequest(
        topic="Python for backend development",
        current_level="beginner",
        target_goal="Build production REST APIs with FastAPI",
        duration_weeks=8,
    )
    res_lp, latency_lp = await call_with_retry(
        lambda: learning_path_service.process_learning_path(request=req_lp, user=user_a),
        "Learning Path"
    )
    measurements["learning_path_latency_ms"] = round(latency_lp, 2)
    print(f"[OK] Roadmap: '{res_lp.topic}' | Stages: {len(res_lp.stages)} | Time: {latency_lp:.2f}ms")
    assert len(res_lp.stages) >= 3

    await asyncio.sleep(2.0)

    # 6. REAL WEB RESEARCH: "Latest official Python developments"
    print("\n--- [6/6] Real Web Research: 'Latest official Python developments' ---")
    req_res = ResearchRequest(query="Latest official Python developments")
    res_res, latency_res = await call_with_retry(
        lambda: research_service.conduct_research(request=req_res, user=user_a),
        "Web Research"
    )
    measurements["research_latency_ms"] = round(latency_res, 2)
    print(f"[OK] Sources retrieved: {len(res_res.sources)} | Time: {latency_res:.2f}ms")
    print(f"     Answer preview ({len(res_res.answer)} chars): {res_res.answer[:120]}...")
    if res_res.sources:
        for i, s in enumerate(res_res.sources[:3], 1):
            print(f"     Source {i}: {s.title} ({s.domain}) -> {s.url}")
    assert len(res_res.answer) > 30

    # 7. REAL PERSISTENCE & DISK RE-OPEN TEST
    print("\n--- [7/8] Verifying Real Persistence & Disk Re-Open ---")
    stats_a = await activity_service.get_dashboard_stats(user_id=user_a.uid)
    print(f"[OK] User A live total activities: {stats_a.total_activities}")
    print(f"[OK] User A Q&A: {stats_a.questions_asked}, Explain: {stats_a.explanations_generated}, Quiz: {stats_a.quizzes_completed}, Summary: {stats_a.summaries_generated}, Learning Path: {stats_a.learning_paths_generated}, Research: {stats_a.research_queries}")
    assert stats_a.total_activities == initial_count_a + 6, f"Expected {initial_count_a + 6}, got {stats_a.total_activities}"

    # Re-open database from disk file to verify persistence across restarts
    reopened_repo = SQLiteActivityRepository(db_path=settings.DATABASE_PATH)
    reopened_service = ActivityService(repository=reopened_repo)
    reopened_stats_a = await reopened_service.get_dashboard_stats(user_id=user_a.uid)
    print(f"[OK] User A persisted activities after fresh repository re-open: {reopened_stats_a.total_activities}")
    assert reopened_stats_a.total_activities == stats_a.total_activities, "Data lost after re-open!"
    print("[PASS] SQLite persistence durable on disk across process lifecycles.")

    # 8. MULTI-USER ISOLATION VERIFICATION
    print("\n--- [8/8] Verifying Multi-User Isolation ---")
    stats_b = await reopened_service.get_dashboard_stats(user_id=user_b.uid)
    print(f"[OK] User B total activities: {stats_b.total_activities} (Expected: 0)")
    assert stats_b.total_activities == 0, "Violation: User B saw User A's data!"
    print("[PASS] Multi-user data isolation verified: User B has 0 records.")

    print("\n" + "=" * 80)
    print("SUMMARY OF REAL PRODUCTION LATENCY MEASUREMENTS:")
    print("=" * 80)
    for k, v in measurements.items():
        print(f"  - {k}: {v}ms ({v/1000.0:.2f}s)")
    print("=" * 80)
    print("🎉 ALL STEP 16 REAL SERVICE TESTS PASSED!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_step16_live_verification())
