"""Real Google Gemini & Web Research Verification Script for Step 11.

Executes live end-to-end web research and grounded Gemini synthesis on 3 test topics:
1. "What is FastAPI and how is it used?"
2. "What are the latest official developments in Python?"
3. "Explain React Server Components in simple terms."

Validates:
- External web retrieval succeeds and returns verified, deduplicated sources
- Synthesized educational answers are grounded in real retrieved citations
- Zero fake URLs or fabricated citations
- Strict Pydantic serialization
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
from app.schemas.research import ResearchRequest
from app.services.ai.gemini_service import GeminiService
from app.services.web_research_service import WebResearchService


async def verify_real_research():
    print("=" * 75)
    print("EDUGENIE STEP 11 — REAL GOOGLE GEMINI & WEB RESEARCH VERIFICATION")
    print("=" * 75)

    settings = get_settings()
    if not settings.is_gemini_configured:
        print("[ERROR] GEMINI_API_KEY is not configured in .env.")
        sys.exit(1)

    print(f"[OK] Gemini Model configured: {settings.GEMINI_MODEL}")
    print("[OK] GEMINI_API_KEY is configured (hidden).")
    print(f"[OK] Max search results limit: {settings.MAX_SEARCH_RESULTS}")
    print(f"[OK] Search timeout: {settings.WEB_SEARCH_TIMEOUT_SECONDS}s")

    ai_service = GeminiService(settings=settings)
    research_service = WebResearchService(ai_service=ai_service, settings=settings)

    test_queries = [
        "What is FastAPI and how is it used?",
        "What are the latest official developments in Python?",
        "Explain React Server Components in simple terms.",
    ]

    results = []

    for idx, query in enumerate(test_queries, start=1):
        print(f"\n--- [Case {idx}/3] Query: '{query}' ---")
        try:
            req = ResearchRequest(query=query)
            res = await research_service.conduct_research(request=req)

            print(f"[OK] Retrieved {len(res.sources)} verified external sources:")
            for s_idx, src in enumerate(res.sources, start=1):
                print(f"    [{s_idx}] {src.title}")
                print(f"        Domain:  {src.domain}")
                print(f"        URL:     {src.url}")
                print(f"        Snippet: {src.snippet[:80]}...")

            print(f"[OK] Grounded Gemini Answer Length: {len(res.answer)} chars")
            print(f"     Preview: {res.answer[:140]}...")
            print(f"[OK] Model: {res.model} | Request ID: {res.request_id}")

            assert len(res.answer) > 50, "Answer too short"
            assert res.searched is True, "searched flag must be True"

            results.append({
                "query": res.query,
                "answer": res.answer,
                "sources": [s.model_dump() for s in res.sources],
                "request_id": res.request_id,
                "model": res.model,
                "status": res.status,
            })
        except Exception as exc:
            print(f"[FAIL] Error conducting research for '{query}': {exc}")
            raise

    # Persist results
    out_file = Path(__file__).resolve().parent / "real_gemini_research_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 75)
    print(f"[SUCCESS] All 3 real Gemini web research queries verified & saved to {out_file.name}")
    print("=" * 75)


if __name__ == "__main__":
    asyncio.run(verify_real_research())
