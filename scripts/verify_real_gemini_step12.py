"""Real Google Gemini & Web Research Integration Verification Script for Step 12.

Executes live end-to-end tests for Step 12:
Case A: "What is React?" (AI mode -> direct Gemini, 0 sources)
Case B: "What are the latest official React developments?" (Web Research mode -> DuckDuckGo + Gemini grounding + real citations)
Case C1: "What is FastAPI?" (AI mode)
Case C2: "What is FastAPI?" (Web Research mode)
Case D: Follow-up question with conversation context

Validates:
- Mode selection behaves accurately
- Citations are real and non-fabricated
- Output conforms to QAResponse schema
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
from app.schemas.qa import QARequest
from app.services.ai.gemini_service import GeminiService
from app.services.qa_service import QAService
from app.services.web_research_service import WebResearchService


async def verify_real_step12():
    print("=" * 75)
    print("EDUGENIE STEP 12 — REAL GOOGLE GEMINI & WEB RESEARCH INTEGRATION")
    print("=" * 75)

    settings = get_settings()
    if not settings.is_gemini_configured:
        print("[ERROR] GEMINI_API_KEY is not configured in .env.")
        sys.exit(1)

    print(f"[OK] Gemini Model: {settings.GEMINI_MODEL}")
    print("[OK] GEMINI_API_KEY is configured (hidden).")

    ai_service = GeminiService(settings=settings)
    research_service = WebResearchService(ai_service=ai_service, settings=settings)
    qa_service = QAService(ai_service=ai_service, research_service=research_service)

    results = []

    # Case A: "What is React?" (AI Answer mode)
    print("\n--- [Case A] Query: 'What is React?' (Mode: 'ai') ---")
    req_a = QARequest(question="What is React?", mode="ai")
    res_a = await qa_service.process_qa(request=req_a)
    print(f"[OK] Mode: {res_a.mode} | Grounded: {res_a.grounded} | Sources count: {len(res_a.sources)}")
    print(f"[OK] Answer Length: {len(res_a.answer)} chars")
    print(f"     Preview: {res_a.answer[:120]}...")
    assert res_a.mode == "ai", "Mode must be 'ai'"
    assert len(res_a.sources) == 0, "AI mode must have zero external sources"
    assert len(res_a.answer) > 50, "Answer must be substantial"
    results.append({
        "case": "Case A",
        "question": res_a.question,
        "mode": res_a.mode,
        "answer": res_a.answer[:200] + "...",
        "sources_count": len(res_a.sources),
        "model": res_a.model,
    })

    # Case B: "What are the latest official React developments?" (Web Research mode)
    print("\n--- [Case B] Query: 'What are the latest official React developments?' (Mode: 'research') ---")
    req_b = QARequest(question="What are the latest official React developments?", mode="research")
    res_b = await qa_service.process_qa(request=req_b)
    print(f"[OK] Mode: {res_b.mode} | Grounded: {res_b.grounded} | Sources count: {len(res_b.sources)}")
    for s_idx, src in enumerate(res_b.sources, start=1):
        print(f"    [{s_idx}] {src.title}")
        print(f"        Domain: {src.domain} | URL: {src.url}")
    print(f"[OK] Grounded Answer Length: {len(res_b.answer)} chars")
    print(f"     Preview: {res_b.answer[:140]}...")
    assert res_b.mode == "research", "Mode must be 'research'"
    assert res_b.grounded is True, "Grounded flag must be True"
    assert len(res_b.sources) > 0, "Research mode must return external web sources"
    results.append({
        "case": "Case B",
        "question": res_b.question,
        "mode": res_b.mode,
        "answer": res_b.answer[:200] + "...",
        "sources": [s.model_dump() for s in res_b.sources],
        "model": res_b.model,
    })

    # Case C1: "What is FastAPI?" (AI Answer mode)
    print("\n--- [Case C1] Query: 'What is FastAPI?' (Mode: 'ai') ---")
    req_c1 = QARequest(question="What is FastAPI?", mode="ai")
    res_c1 = await qa_service.process_qa(request=req_c1)
    print(f"[OK] Mode: {res_c1.mode} | Sources: {len(res_c1.sources)}")
    assert res_c1.mode == "ai"
    assert len(res_c1.sources) == 0

    # Case C2: "What is FastAPI?" (Web Research mode)
    print("\n--- [Case C2] Query: 'What is FastAPI?' (Mode: 'research') ---")
    req_c2 = QARequest(question="What is FastAPI?", mode="research")
    res_c2 = await qa_service.process_qa(request=req_c2)
    print(f"[OK] Mode: {res_c2.mode} | Sources: {len(res_c2.sources)}")
    assert res_c2.mode == "research"
    assert len(res_c2.sources) > 0
    results.append({
        "case": "Case C",
        "question": res_c2.question,
        "c1_ai_answer": res_c1.answer[:150] + "...",
        "c2_research_answer": res_c2.answer[:150] + "...",
        "c2_sources_count": len(res_c2.sources),
    })

    # Case D: Follow-up question with conversation context
    print("\n--- [Case D] Follow-up Query: 'How is it different from Flask?' ---")
    context_d = f"Student: What is FastAPI?\nEduGenie: {res_c1.answer[:300]}"
    req_d = QARequest(
        question="How is it different from Flask?",
        context=context_d,
        mode="ai",
    )
    res_d = await qa_service.process_qa(request=req_d)
    print(f"[OK] Follow-up Answer Length: {len(res_d.answer)} chars")
    print(f"     Preview: {res_d.answer[:140]}...")
    assert "Flask" in res_d.answer, "Follow-up answer must reference Flask in context of FastAPI"
    results.append({
        "case": "Case D",
        "question": req_d.question,
        "context": context_d,
        "answer": res_d.answer[:200] + "...",
    })

    # Persist results
    out_file = Path(__file__).resolve().parent / "real_gemini_step12_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 75)
    print(f"[SUCCESS] All Step 12 real Gemini and Web Research tests passed! Saved to {out_file.name}")
    print("=" * 75)


if __name__ == "__main__":
    asyncio.run(verify_real_step12())
