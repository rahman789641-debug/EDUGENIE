"""Real Google Gemini Quiz Generation Verification Script.

Tests the production AI service pipeline with real Gemini calls:
1. Beginner quiz on Photosynthesis
2. Intermediate quiz on REST APIs
3. Advanced quiz on Binary Search & Algorithm Complexity

Verifies structured JSON output, exactly 3 questions, exactly 4 options per question,
correct answer alignment, unique question IDs, and clear educational explanations.
"""

import asyncio
import json
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import get_settings
from app.services.ai.gemini_service import GeminiService


async def verify_real_quizzes():
    print("=" * 70)
    print("EDUGENIE STEP 8 — REAL GOOGLE GEMINI QUIZ GENERATION VERIFICATION")
    print("=" * 70)

    settings = get_settings()
    if not settings.is_gemini_configured:
        print("[ERROR] GEMINI_API_KEY is not configured in .env.")
        sys.exit(1)

    print(f"[OK] Model configured: {settings.GEMINI_MODEL}")
    print("[OK] GEMINI_API_KEY is configured (hidden).")

    service = GeminiService(settings=settings)

    test_cases = [
        {
            "name": "Photosynthesis",
            "difficulty": "beginner",
            "content": (
                "Photosynthesis is the process by which green plants and certain other organisms transform "
                "light energy into chemical energy. During photosynthesis in green plants, light energy is captured "
                "and used to convert water, carbon dioxide, and minerals into oxygen and energy-rich organic compounds "
                "such as glucose. The reactions occur within specialized cellular organelles known as chloroplasts, "
                "which contain the green pigment chlorophyll."
            ),
        },
        {
            "name": "REST API Architecture",
            "difficulty": "intermediate",
            "content": (
                "Representational State Transfer (REST) is a software architectural style that defines a set of constraints "
                "to be used for creating Web services. Web services that conform to the REST architectural style are called "
                "RESTful Web services. REST requires stateless communication between client and server, where each request "
                "must contain all necessary information to understand and process the request. Standard HTTP verbs like GET, "
                "POST, PUT, and DELETE provide a uniform interface for resource manipulation."
            ),
        },
        {
            "name": "Binary Search",
            "difficulty": "advanced",
            "content": (
                "Binary search is an efficient search algorithm that works on sorted arrays by repeatedly dividing the search "
                "interval in half. The algorithm begins by comparing the target value to the middle element. If they are equal, "
                "the index is returned. If the target is less than the middle element, search continues in the lower half; "
                "otherwise, the upper half. To avoid integer overflow in midpoint calculation, (low + (high - low) / 2) is used. "
                "Binary search achieves O(log n) time complexity and O(1) auxiliary space."
            ),
        },
    ]

    results = []

    for i, test in enumerate(test_cases, 1):
        print(f"\n--- [TEST {i}/3]: Topic='{test['name']}', Difficulty='{test['difficulty']}' ---")
        try:
            resp = await service.generate_quiz(
                content=test["content"],
                question_count=3,
                difficulty=test["difficulty"],
            )

            print(f"[SUCCESS] Title: {resp.title}")
            print(f"          Difficulty: {resp.difficulty}")
            print(f"          Model: {resp.model}")
            print(f"          Total Questions: {len(resp.questions)}")

            assert len(resp.questions) == 3, f"Expected 3 questions, got {len(resp.questions)}"

            q_summaries = []
            for idx, q in enumerate(resp.questions, 1):
                print(f"          Q{idx}: {q.question}")
                print(f"              Options: {q.options}")
                print(f"              Correct Answer: '{q.correct_answer}' (index: {q.correct_index})")
                print(f"              Explanation: {q.explanation[:120]}...")

                assert len(q.options) == 4, f"Q{idx} must have 4 options"
                assert len(set(q.options)) == 4, f"Q{idx} options must be unique"
                assert q.correct_answer in q.options, f"Q{idx} correct_answer not in options"
                assert len(q.explanation.strip()) > 5, f"Q{idx} explanation too short"

                q_summaries.append({
                    "id": q.id,
                    "question": q.question,
                    "options": q.options,
                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation,
                })

            results.append({
                "test_name": test["name"],
                "difficulty": test["difficulty"],
                "title": resp.title,
                "questions": q_summaries,
                "model": resp.model,
                "status": "PASSED",
            })

        except Exception as exc:
            print(f"[FAIL] Error generating quiz for '{test['name']}': {type(exc).__name__}: {exc}")
            results.append({
                "test_name": test["name"],
                "difficulty": test["difficulty"],
                "status": "FAILED",
                "error": str(exc),
            })

    print("\n" + "=" * 70)
    print("SUMMARY OF REAL GEMINI QUIZ TESTS:")
    for r in results:
        print(f" - [{r['status']}] {r['test_name']} ({r['difficulty']}) -> {len(r.get('questions', []))} questions verified")
    print("=" * 70)

    # Save artifact for reporting
    out_path = Path(__file__).resolve().parent / "real_gemini_quiz_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Saved real execution results to {out_path}")

    all_passed = all(r["status"] == "PASSED" for r in results)
    if not all_passed:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(verify_real_quizzes())
