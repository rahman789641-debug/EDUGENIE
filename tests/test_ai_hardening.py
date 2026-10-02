"""Automated tests for STEP 13: EduGenie AI Reliability, Validation & Production Hardening."""

import asyncio
from typing import List, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from app.core.exceptions import (
    AIAuthenticationError,
    AIConfigurationError,
    AIGenerationError,
    AIProviderError,
    AIRateLimitedError,
    AITimeoutError,
)
from app.schemas.quiz import QuizQuestionItem, QuizResponse
from app.services.ai.client import GeminiClientManager
from app.services.ai.gemini_service import GeminiService
from app.services.ai.parser import safe_extract_json, safe_parse_and_validate
from app.services.ai.prompts.explanation import EXPLANATION_SYSTEM_INSTRUCTION, build_explanation_prompt
from app.services.ai.prompts.learning_path import LEARNING_PATH_SYSTEM_INSTRUCTION, build_learning_path_prompt
from app.services.ai.prompts.qa import QA_SYSTEM_INSTRUCTION, build_qa_prompt
from app.services.ai.prompts.quiz import QUIZ_SYSTEM_INSTRUCTION, build_quiz_prompt
from app.services.ai.prompts.research import RESEARCH_SYSTEM_INSTRUCTION, build_research_prompt
from app.services.ai.prompts.summary import SUMMARY_SYSTEM_INSTRUCTION, build_summary_prompt
from app.services.ai_service import get_ai_service


# ---------------------------------------------------------------------------
# 1. Central Robust JSON Parser Tests
# ---------------------------------------------------------------------------
class SampleSchema(BaseModel):
    title: str = Field(..., min_length=2)
    count: int = Field(..., ge=1)
    tags: List[str] = Field(default_factory=list)


def test_safe_extract_json_clean():
    """Verify safe_extract_json parses standard valid JSON."""
    raw = '{"title": "Valid Object", "count": 10, "tags": ["python", "ai"]}'
    res = safe_extract_json(raw)
    assert res["title"] == "Valid Object"
    assert res["count"] == 10
    assert len(res["tags"]) == 2


def test_safe_extract_json_markdown_fences():
    """Verify safe_extract_json strips markdown code fences."""
    raw = '```json\n{\n  "title": "Fenced Object",\n  "count": 5\n}\n```'
    res = safe_extract_json(raw)
    assert res["title"] == "Fenced Object"
    assert res["count"] == 5


def test_safe_extract_json_conversational_wrapping():
    """Verify safe_extract_json handles conversational preamble and postamble prose."""
    raw = (
        "Certainly! Here is the JSON data you requested for the educational module:\n\n"
        '{"title": "Wrapped Data", "count": 3, "tags": ["edu"]}\n\n'
        "I hope this structured data is helpful for your learning path!"
    )
    res = safe_extract_json(raw)
    assert res["title"] == "Wrapped Data"
    assert res["count"] == 3


def test_safe_extract_json_trailing_commas():
    """Verify safe_extract_json fixes common LLM trailing commas before closing braces."""
    raw = '{"title": "Trailing Comma", "count": 4, "tags": ["a", "b",],}'
    res = safe_extract_json(raw)
    assert res["title"] == "Trailing Comma"
    assert res["count"] == 4
    assert res["tags"] == ["a", "b"]


def test_safe_extract_json_array_support():
    """Verify safe_extract_json handles top-level JSON arrays."""
    raw = '```json\n[{"id": "q1"}, {"id": "q2"}]\n```'
    res = safe_extract_json(raw)
    assert isinstance(res, list)
    assert len(res) == 2


def test_safe_extract_json_empty_or_non_json_rejects():
    """Verify safe_extract_json raises controlled AIGenerationError for empty or invalid inputs."""
    with pytest.raises(AIGenerationError) as exc_info:
        safe_extract_json("")
    assert "Empty response" in str(exc_info.value)

    with pytest.raises(AIGenerationError) as exc_info:
        safe_extract_json("This is purely arbitrary text with no json whatsoever.")
    assert "did not contain valid JSON" in str(exc_info.value)


def test_safe_parse_and_validate_success():
    """Verify safe_parse_and_validate correctly loads and validates against Pydantic schema."""
    raw = '{"title": "Photosynthesis", "count": 3, "tags": ["biology", "science"]}'
    validated = safe_parse_and_validate(raw, SampleSchema)
    assert isinstance(validated, SampleSchema)
    assert validated.title == "Photosynthesis"
    assert validated.count == 3


def test_safe_parse_and_validate_schema_mismatch():
    """Verify safe_parse_and_validate produces clear sanitized AIGenerationError on validation error."""
    raw = '{"title": "X", "count": 0}'  # title too short (< 2), count < 1
    with pytest.raises(AIGenerationError) as exc_info:
        safe_parse_and_validate(raw, SampleSchema)
    err_msg = str(exc_info.value)
    assert "failed schema validation" in err_msg


# ---------------------------------------------------------------------------
# 2. Prompt Injection Defense & Untrusted Boundaries Tests
# ---------------------------------------------------------------------------
def test_all_prompts_have_anti_override_directives():
    """Verify that all system instructions contain immutable anti-override and role-preservation rules."""
    instructions = [
        ("QA", QA_SYSTEM_INSTRUCTION),
        ("Research", RESEARCH_SYSTEM_INSTRUCTION),
        ("Quiz", QUIZ_SYSTEM_INSTRUCTION),
        ("Summary", SUMMARY_SYSTEM_INSTRUCTION),
        ("Explanation", EXPLANATION_SYSTEM_INSTRUCTION),
        ("LearningPath", LEARNING_PATH_SYSTEM_INSTRUCTION),
    ]

    for name, instruction in instructions:
        inst_lower = instruction.lower()
        assert "ignore previous instructions" in inst_lower, f"{name} prompt missing 'ignore previous instructions' defense"
        assert "dan" in inst_lower, f"{name} prompt missing DAN defense"
        assert "preserve your identity" in inst_lower or "identity" in inst_lower, f"{name} prompt missing identity preservation"


def test_prompt_builders_delimit_untrusted_inputs():
    """Verify that user queries and untrusted web excerpts are wrapped in strict boundary tags."""
    # QA prompt
    qa_p = build_qa_prompt("Tell me about gravity", context="Newton physics")
    assert "=== UNTRUSTED USER QUESTION START ===" in qa_p
    assert "=== UNTRUSTED USER CONTEXT START ===" in qa_p

    # Research prompt
    res_p = build_research_prompt("Quantum computing 2026", sources_context="IBM announced 1000 qubits")
    assert "=== UNTRUSTED USER RESEARCH QUERY START ===" in res_p
    assert "=== UNTRUSTED RETRIEVED EXTERNAL WEB DATA START ===" in res_p
    assert "CRITICAL SECURITY RULE:" in res_p

    # Quiz prompt
    quiz_p = build_quiz_prompt("Cell biology content")
    assert "=== UNTRUSTED STUDY PASSAGE START ===" in quiz_p

    # Summary prompt
    sum_p = build_summary_prompt("History of Rome")
    assert "=== UNTRUSTED CONTENT TO SUMMARIZE START ===" in sum_p

    # Explanation prompt
    exp_p = build_explanation_prompt("Recursion")
    assert "=== UNTRUSTED TOPIC INPUT START ===" in exp_p

    # Learning Path prompt
    lp_p = build_learning_path_prompt("Python", target_goal="Backend Developer")
    assert "=== UNTRUSTED TOPIC INPUT START ===" in lp_p
    assert "=== UNTRUSTED LEARNER GOAL START ===" in lp_p


# ---------------------------------------------------------------------------
# 3. Quiz Validation Guarantee Tests
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_quiz_generator_rejects_fewer_questions_than_requested():
    """Verify GeminiService.generate_quiz rejects output if fewer valid questions are generated than requested."""
    mock_manager = MagicMock(spec=GeminiClientManager)
    mock_manager.model_name = "gemini-2.5-flash"
    # Returns only 1 valid question when 3 are requested
    mock_manager.generate_content = AsyncMock(
        return_value="""{
            "title": "Partial Quiz",
            "questions": [
                {
                    "id": "q1",
                    "question": "What is photosynthesis?",
                    "options": ["A process", "A car", "A computer", "A mineral"],
                    "correct_answer": "A process",
                    "explanation": "It converts light into energy."
                }
            ]
        }"""
    )

    service = GeminiService(client_manager=mock_manager)
    with pytest.raises(AIGenerationError) as exc_info:
        await service.generate_quiz(content="Photosynthesis passage...", question_count=3)
    assert "only 1 valid quiz items, but 3 were required" in str(exc_info.value)


@pytest.mark.anyio
async def test_quiz_generator_enforces_exact_four_options_and_no_duplicates():
    """Verify QuizQuestionItem rejects items with fewer than 4 options or duplicate options."""
    # Fewer than 4 options
    with pytest.raises(ValueError) as exc1:
        QuizQuestionItem(
            id="q1",
            question="What is DNA?",
            options=["Nucleic acid", "Protein", "Lipid"],
            correct_answer="Nucleic acid",
            explanation="DNA is deoxyribonucleic acid.",
        )
    assert "exactly 4 options" in str(exc1.value)

    # Duplicate options
    with pytest.raises(ValueError) as exc2:
        QuizQuestionItem(
            id="q2",
            question="What is DNA?",
            options=["Nucleic acid", "Protein", "Lipid", "nucleic acid"],
            correct_answer="Nucleic acid",
            explanation="DNA is deoxyribonucleic acid.",
        )
    assert "Duplicate option detected" in str(exc2.value)


# ---------------------------------------------------------------------------
# 4. Learning Path Anti-Hallucination URL Guarantee Tests
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_learning_path_strictly_enforces_null_urls():
    """Verify GeminiService.generate_learning_path forces resource URLs to null to prevent hallucinated links."""
    mock_manager = MagicMock(spec=GeminiClientManager)
    mock_manager.model_name = "gemini-2.5-flash"
    mock_manager.generate_content = AsyncMock(
        return_value="""{
            "overview": "A comprehensive roadmap",
            "stages": [
                {
                    "stage": 1,
                    "title": "Stage 1",
                    "difficulty": "beginner",
                    "concepts": ["Basics"],
                    "practice": ["Exercise 1"],
                    "resources": [
                        {"type": "documentation", "title": "Official Docs", "url": "https://fake-link.com/nonexistent"}
                    ]
                }
            ]
        }"""
    )

    service = GeminiService(client_manager=mock_manager)
    lp = await service.generate_learning_path(topic="Python", current_level="beginner")
    assert len(lp.stages) == 1
    assert lp.stages[0].stage == 1
    assert len(lp.stages[0].resources) == 1
    # URL must be strictly null
    assert lp.stages[0].resources[0].url is None


# ---------------------------------------------------------------------------
# 5. Bounded Retries & Error Categorization Tests
# ---------------------------------------------------------------------------
@pytest.mark.anyio
async def test_bounded_retries_transient_vs_non_transient():
    """Verify GeminiClientManager does NOT retry non-transient auth/quota errors, but retries transient ones."""
    manager = GeminiClientManager()

    # Test error categorization:
    # 1. 403 / auth error
    auth_err = manager._categorize_exception(RuntimeError("API_KEY_INVALID: 403 Forbidden"))
    assert isinstance(auth_err, AIAuthenticationError)

    # 2. 429 / quota error
    quota_err = manager._categorize_exception(RuntimeError("ResourceExhausted: 429 Quota exceeded"))
    assert isinstance(quota_err, AIRateLimitedError)

    # 3. Timeout error
    timeout_err = manager._categorize_exception(asyncio.TimeoutError())
    assert isinstance(timeout_err, AITimeoutError)

    # 4. Generic error
    gen_err = manager._categorize_exception(RuntimeError("Connection reset by peer"))
    assert isinstance(gen_err, AIProviderError)


# ---------------------------------------------------------------------------
# 6. Uniform Error Envelope Schema Tests Across All Endpoints
# ---------------------------------------------------------------------------
def test_all_ai_endpoints_return_standard_error_envelope(app, client: TestClient):
    """Verify that every AI endpoint returns the standard {'error': {'code': ..., 'message': ...}} structure."""
    endpoints = [
        ("/api/v1/qa", {"question": ""}),  # Empty input triggers 422
        ("/api/v1/explain", {"topic": ""}),
        ("/api/v1/quiz", {"content": ""}),
        ("/api/v1/summarize", {"content": ""}),
        ("/api/v1/learn/recommendations", {"topic": ""}),
        ("/api/v1/research", {"query": ""}),
    ]

    for path, payload in endpoints:
        resp = client.post(path, json=payload)
        assert resp.status_code == 422, f"Failed on {path}"
        data = resp.json()
        assert "error" in data, f"Missing error envelope on {path}"
        assert data["error"]["code"] == "VALIDATION_ERROR", f"Wrong code on {path}"
        assert "message" in data["error"], f"Missing error message on {path}"
