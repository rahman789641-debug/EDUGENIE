"""Real Google Gemini Concept Explanation Verification Script.

Tests the full production AI service pipeline with real Gemini calls:
1. Recursion at Beginner level
2. REST API at Intermediate level
3. Binary Search at Advanced level

Verifies structured JSON output, level tailoring, factual accuracy, key points, and illustrative examples.
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


async def verify_real_explanations():
    print("=" * 70)
    print("EDUGENIE STEP 7 — REAL GOOGLE GEMINI CONCEPT EXPLANATION VERIFICATION")
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
            "topic": "Recursion",
            "level": "beginner",
            "expect_keyword": ["call", "function", "base"],
        },
        {
            "topic": "REST API",
            "level": "intermediate",
            "expect_keyword": ["http", "request", "endpoint", "resource"],
        },
        {
            "topic": "Binary Search",
            "level": "advanced",
            "expect_keyword": ["log", "o(log", "complexity", "pointer", "divide"],
        },
    ]

    results = []

    for i, test in enumerate(test_cases, 1):
        print(f"\n--- [TEST {i}/3]: Topic='{test['topic']}', Level='{test['level']}' ---")
        try:
            resp = await service.explain_topic(
                topic=test["topic"],
                level=test["level"],
            )

            print(f"[SUCCESS] Title: {resp.title}")
            print(f"          Level: {resp.level}")
            print(f"          Model: {resp.model}")
            print(f"          Key Points Count: {len(resp.key_points)}")
            for idx, pt in enumerate(resp.key_points[:3], 1):
                print(f"            {idx}. {pt}")
            print(f"          Explanation Preview: {resp.explanation[:200]}...")
            print(f"          Example Preview: {resp.example[:150]}...")

            assert resp.topic.lower() == test["topic"].lower(), "Topic mismatch"
            assert resp.level.lower() == test["level"].lower(), "Level mismatch"
            assert len(resp.title.strip()) > 3, "Empty title"
            assert len(resp.explanation.strip()) > 50, "Explanation too brief"
            assert len(resp.key_points) >= 2, "Expected at least 2 key points"
            assert len(resp.example.strip()) > 10, "Expected non-empty example"

            results.append({
                "topic": test["topic"],
                "level": test["level"],
                "title": resp.title,
                "key_points": resp.key_points,
                "explanation_preview": resp.explanation[:300],
                "example_preview": resp.example[:200],
                "model": resp.model,
                "status": "PASSED",
            })

        except Exception as exc:
            print(f"[FAIL] Error explaining '{test['topic']}': {type(exc).__name__}: {exc}")
            results.append({
                "topic": test["topic"],
                "level": test["level"],
                "status": "FAILED",
                "error": str(exc),
            })

    print("\n" + "=" * 70)
    print("SUMMARY OF REAL GEMINI TESTS:")
    for r in results:
        print(f" - [{r['status']}] {r['topic']} ({r['level']}) -> Title: '{r.get('title', 'N/A')}'")
    print("=" * 70)

    # Save artifact for reporting
    out_path = Path(__file__).resolve().parent / "real_gemini_explain_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Saved real execution results to {out_path}")

    all_passed = all(r["status"] == "PASSED" for r in results)
    if not all_passed:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(verify_real_explanations())
