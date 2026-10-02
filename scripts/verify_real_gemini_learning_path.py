"""Real Google Gemini Personalized Learning Path Verification Script.

Tests the production AI service pipeline with real Gemini calls for Step 10:
1. Topic='Python Programming', Level='beginner', Goal='Become a backend developer'
2. Topic='Machine Learning', Level='intermediate', Goal='Build practical ML projects'
3. Topic='SQL', Level='beginner', Goal='Prepare for software developer interviews'

Verifies structured JSON output, level-appropriate progression, goal personalization,
actionable practice tasks, structured resources, and zero fabricated/fake URLs.
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


async def verify_real_learning_paths():
    print("=" * 75)
    print("EDUGENIE STEP 10 — REAL GOOGLE GEMINI LEARNING PATH VERIFICATION")
    print("=" * 75)

    settings = get_settings()
    if not settings.is_gemini_configured:
        print("[ERROR] GEMINI_API_KEY is not configured in .env.")
        sys.exit(1)

    print(f"[OK] Model configured: {settings.GEMINI_MODEL}")
    print("[OK] GEMINI_API_KEY is configured (hidden).")

    service = GeminiService(settings=settings)

    test_cases = [
        {
            "name": "Test 1 — Python for Backend Development",
            "topic": "Python Programming",
            "level": "beginner",
            "goal": "Become a backend developer",
        },
        {
            "name": "Test 2 — Applied Machine Learning",
            "topic": "Machine Learning",
            "level": "intermediate",
            "goal": "Build practical ML projects",
        },
        {
            "name": "Test 3 — SQL for Tech Interviews",
            "topic": "SQL",
            "level": "beginner",
            "goal": "Prepare for software developer interviews",
        },
    ]

    all_passed = True

    for i, test in enumerate(test_cases, 1):
        print(f"\n--- [{test['name']}]: Topic='{test['topic']}', Level='{test['level']}', Goal='{test['goal']}' ---")
        try:
            resp = await service.generate_learning_path(
                topic=test["topic"],
                current_level=test["level"],
                target_goal=test["goal"],
                duration_weeks=8,
            )

            print(f"[SUCCESS] Topic: {resp.topic}")
            print(f"          Level: {resp.level}")
            print(f"          Goal: {resp.goal}")
            print(f"          Overview: {resp.overview[:120]}...")
            print(f"          Total Stages: {len(resp.stages)}")
            print(f"          Request ID: {resp.request_id}")
            print(f"          Model: {resp.model}")

            print("\n[STAGES PROGRESSION]:")
            for stage in resp.stages:
                print(f"  Stage {stage.stage}: {stage.title} [{stage.difficulty.upper()}]")
                print(f"    Concepts ({len(stage.concepts)}): {', '.join(stage.concepts[:3])}...")
                print(f"    Practice ({len(stage.practice)}): {stage.practice[0] if stage.practice else 'None'}")
                print(f"    Resources ({len(stage.resources)}):")
                for r in stage.resources:
                    print(f"      - [{r.type.upper()}] {r.title} (URL: {r.url})")
                    assert r.url is None, f"Forbidden fake/unverified URL detected: {r.url}"

            print("\n[NEXT STEPS]:")
            for ns in resp.next_steps[:3]:
                print(f"  ➔ {ns}")

            # Assertions
            assert resp.topic == test["topic"], f"Topic mismatch: {resp.topic}"
            assert resp.level == test["level"], f"Level mismatch: {resp.level}"
            assert len(resp.stages) >= 2, f"Expected at least 2 stages, got {len(resp.stages)}"
            assert resp.request_id, "Missing request_id"
            assert resp.overview, "Missing overview"

            # Check level adaptation
            if test["level"] == "beginner":
                first_stage_diff = resp.stages[0].difficulty.lower()
                assert first_stage_diff in ("beginner", "foundational"), f"Beginner path should start with beginner stage, got: {first_stage_diff}"
            elif test["level"] == "intermediate":
                first_stage_diff = resp.stages[0].difficulty.lower()
                assert first_stage_diff in ("intermediate", "applied"), f"Intermediate path should start at intermediate stage, got: {first_stage_diff}"

            # Check goal influence
            goal_lower = test["goal"].lower()
            all_text = (
                resp.overview + " " +
                " ".join(s.title + " " + " ".join(s.concepts) + " " + " ".join(s.practice) for s in resp.stages)
            ).lower()

            if "backend" in goal_lower:
                assert any(k in all_text for k in ("backend", "api", "server", "fastapi", "django", "flask", "database", "sql")), "Backend goal was not reflected in the generated path"
            elif "ml" in goal_lower:
                assert any(k in all_text for k in ("model", "training", "pipeline", "scikit", "deploy", "evaluation")), "ML project goal was not reflected in the generated path"
            elif "interview" in goal_lower:
                assert any(k in all_text for k in ("interview", "query", "optimization", "complex", "join", "index")), "Interview goal was not reflected in the generated path"

            print(f"[VALIDATION PASSED] All assertions satisfied for {test['name']}")

        except Exception as exc:
            print(f"[FAILED] Error generating learning path for {test['name']}: {exc}")
            all_passed = False

    print("\n" + "=" * 75)
    if all_passed:
        print("[ALL REAL GEMINI LEARNING PATH TESTS PASSED SUCCESSFULLY]")
    else:
        print("[FAILURES DETECTED IN REAL GEMINI TESTS]")
    print("=" * 75)


if __name__ == "__main__":
    asyncio.run(verify_real_learning_paths())
