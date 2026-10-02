"""Google Gemini AI Service implementation for EDUGENIE educational capabilities."""

import json
import logging
import uuid
from typing import Any, Dict, List, Optional

from app.core.config import Settings, get_settings
from app.core.exceptions import AIGenerationError
from app.schemas.explain import ExplainResponse
from app.schemas.learning_path import (
    LearningPathResponse,
    LearningResource,
    LearningStage,
    MilestoneStage,
)
from app.schemas.qa import QAResponse
from app.schemas.quiz import QuizQuestionItem, QuizResponse
from app.schemas.summarize import SummarizeResponse
from app.services.ai.base import BaseAIService
from app.services.ai.client import GeminiClientManager, get_gemini_client_manager
from app.services.ai.prompts.explanation import EXPLANATION_SYSTEM_INSTRUCTION, build_explanation_prompt
from app.services.ai.prompts.learning_path import LEARNING_PATH_SYSTEM_INSTRUCTION, build_learning_path_prompt
from app.services.ai.prompts.qa import QA_SYSTEM_INSTRUCTION, build_qa_prompt
from app.services.ai.prompts.quiz import QUIZ_SYSTEM_INSTRUCTION, build_quiz_prompt
from app.services.ai.prompts.research import RESEARCH_SYSTEM_INSTRUCTION, build_research_prompt
from app.services.ai.prompts.summary import SUMMARY_SYSTEM_INSTRUCTION, build_summary_prompt

from app.services.ai.parser import safe_extract_json

logger = logging.getLogger("edugenie.gemini.service")


def extract_json_from_ai_text(raw_text: str) -> Dict[str, Any]:
    """Safely extract and parse JSON payload from Gemini response text."""
    parsed = safe_extract_json(raw_text)
    if isinstance(parsed, dict):
        return parsed
    raise AIGenerationError("Parsed JSON root is not an object.")


class GeminiService(BaseAIService):
    """Production-grade Google Gemini AI orchestrator for EduGenie."""

    def __init__(
        self,
        settings: Optional[Settings] = None,
        client_manager: Optional[GeminiClientManager] = None,
    ) -> None:
        super().__init__(service_name="GeminiService")
        self.settings = settings or get_settings()
        self.client_manager = client_manager or GeminiClientManager(settings=self.settings)

    async def answer_question(
        self,
        question: str,
        context: Optional[str] = None,
        enable_web_grounding: bool = False,
    ) -> QAResponse:
        """Answer educational question using Google Gemini with anti-hallucination directives."""
        self.logger.info("Executing Q&A inquiry via Gemini for query length %d", len(question))
        prompt = build_qa_prompt(
            question=question,
            context=context,
            enable_web_grounding=enable_web_grounding,
        )

        response_text = await self.client_manager.generate_content(
            prompt=prompt,
            system_instruction=QA_SYSTEM_INSTRUCTION,
            temperature=0.3,  # Lower temperature for higher factual precision
        )

        model_used = self.client_manager.model_name
        return QAResponse(
            status="ok",
            question=question.strip(),
            answer=response_text.strip(),
            sources=["Context Provided"] if context else [],
            grounded=enable_web_grounding,
            model=model_used,
        )

    async def explain_topic(
        self,
        topic: str,
        level: str = "beginner",
        depth: str = "standard",
        enable_web_grounding: bool = False,
    ) -> ExplainResponse:
        """Deconstruct concept tailored to audience level with title, explanation, key points, and example."""
        self.logger.info("Explaining concept '%s' at level '%s'", topic, level)
        prompt = build_explanation_prompt(
            topic=topic,
            level=level,
            depth=depth,
            enable_web_grounding=enable_web_grounding,
        )

        raw_response = await self.client_manager.generate_content(
            prompt=prompt,
            system_instruction=EXPLANATION_SYSTEM_INSTRUCTION,
            temperature=0.4,
            response_mime_type="application/json",
        )

        parsed = extract_json_from_ai_text(raw_response)
        model_used = self.client_manager.model_name

        explanation_raw = parsed.get("explanation")
        if not explanation_raw or not str(explanation_raw).strip():
            raise AIGenerationError("Gemini output missing 'explanation' text in structured payload.")
        explanation_text = str(explanation_raw).strip()

        title_raw = parsed.get("title")
        title = str(title_raw).strip() if title_raw else f"Understanding {topic.strip()}"

        raw_kp = parsed.get("key_points") or parsed.get("key_takeaways") or []
        if not isinstance(raw_kp, list):
            raw_kp = [str(raw_kp)]
        key_points = [str(kp).strip() for kp in raw_kp if str(kp).strip()]
        if not key_points:
            key_points = [f"Core takeaway: {title}"]

        raw_example = parsed.get("example") or parsed.get("examples") or ""
        if isinstance(raw_example, list):
            example = "\n".join(str(e).strip() for e in raw_example if str(e).strip())
        else:
            example = str(raw_example).strip()

        analogies = parsed.get("analogies", [])
        if not isinstance(analogies, list):
            analogies = [str(analogies)]

        return ExplainResponse(
            status="ok",
            topic=topic.strip(),
            level=level,
            depth=depth,
            title=title,
            explanation=explanation_text,
            key_points=key_points,
            key_takeaways=key_points,
            example=example,
            analogies=[str(a).strip() for a in analogies if str(a).strip()],
            model=model_used,
        )

    async def generate_quiz(
        self,
        content: str,
        question_count: int = 3,
        difficulty: str = "beginner",
    ) -> QuizResponse:
        """Generate structured multiple-choice assessment questions validated against schema."""
        self.logger.info("Generating %d quiz items at difficulty '%s'", question_count, difficulty)
        prompt = build_quiz_prompt(
            content=content,
            question_count=question_count,
            difficulty=difficulty,
        )

        raw_response = await self.client_manager.generate_content(
            prompt=prompt,
            system_instruction=QUIZ_SYSTEM_INSTRUCTION,
            temperature=0.3,
            response_mime_type="application/json",
        )

        parsed = extract_json_from_ai_text(raw_response)
        raw_questions = parsed.get("questions")

        if not isinstance(raw_questions, list) or len(raw_questions) == 0:
            self.logger.error("Structured quiz response did not contain a 'questions' list.")
            raise AIGenerationError("Gemini failed to generate a valid list of quiz questions.")

        title = str(parsed.get("title") or "Quiz").strip()

        validated_questions: List[QuizQuestionItem] = []
        seen_ids = set()

        for idx, item in enumerate(raw_questions, start=1):
            if not isinstance(item, dict):
                continue

            raw_id = item.get("id")
            q_id = str(raw_id).strip() if raw_id else f"q{idx}"
            if q_id in seen_ids:
                q_id = f"q{idx}"
            seen_ids.add(q_id)

            question_text = str(item.get("question", "")).strip()
            raw_options = item.get("options", [])
            options = [str(opt).strip() for opt in raw_options if str(opt).strip()]
            correct_answer = str(item.get("correct_answer") or "").strip()
            correct_index = item.get("correct_index")
            explanation = str(item.get("explanation", "")).strip()

            if not question_text or len(options) != 4:
                continue

            try:
                question_item = QuizQuestionItem(
                    id=q_id,
                    question=question_text,
                    options=options,
                    correct_answer=correct_answer if correct_answer else options[correct_index if isinstance(correct_index, int) and 0 <= correct_index < 4 else 0],
                    explanation=explanation or f"'{correct_answer}' is correct based on the provided material.",
                    correct_index=correct_index if isinstance(correct_index, int) and 0 <= correct_index < 4 else None,
                )
                validated_questions.append(question_item)
            except Exception as val_err:
                self.logger.warning("Quiz item %d failed validation: %s", idx, val_err)
                continue

        if len(validated_questions) < question_count:
            raise AIGenerationError(
                f"Gemini output generated only {len(validated_questions)} valid quiz items, "
                f"but {question_count} were required."
            )

        validated_questions = validated_questions[:question_count]

        model_used = self.client_manager.model_name
        return QuizResponse(
            title=title,
            status="ok",
            difficulty=difficulty,
            total_questions=len(validated_questions),
            questions=validated_questions,
            model=model_used,
        )

    async def summarize_text(
        self,
        content: str,
        length: str = "medium",
        format: str = "bullet_points",
        max_length_words: Optional[int] = None,
    ) -> SummarizeResponse:
        """Distill educational material into structured summary with key points."""
        self.logger.info("Summarizing text of %d chars (length: '%s', format: '%s')", len(content), length, format)
        prompt = build_summary_prompt(
            content=content,
            length=length,
            format_type=format,
            max_length_words=max_length_words,
        )

        raw_response = await self.client_manager.generate_content(
            prompt=prompt,
            system_instruction=SUMMARY_SYSTEM_INSTRUCTION,
            temperature=0.3,
            response_mime_type="application/json",
        )

        parsed = extract_json_from_ai_text(raw_response)
        summary_raw = parsed.get("summary")
        if not summary_raw or not str(summary_raw).strip():
            raise AIGenerationError("Gemini output missing 'summary' field in structured response.")

        key_points_raw = parsed.get("key_points", [])
        if not isinstance(key_points_raw, list):
            key_points_raw = [str(key_points_raw)]

        model_used = self.client_manager.model_name
        summary_clean = str(summary_raw).strip()
        key_points = [str(kp).strip() for kp in key_points_raw if str(kp).strip()]
        if not key_points:
            key_points = [s.strip() for s in summary_clean.split(".") if len(s.strip()) > 15][:3]
            if not key_points:
                key_points = [summary_clean[:120]]

        return SummarizeResponse(
            status="ok",
            format=format,
            length=length,
            summary=summary_clean,
            key_points=key_points,
            original_length_chars=len(content),
            summary_length_chars=len(summary_clean),
            request_id=f"sum-{uuid.uuid4().hex[:12]}",
            model=model_used,
        )


    async def generate_learning_path(
        self,
        topic: str,
        current_level: str,
        target_goal: Optional[str] = None,
        duration_weeks: Optional[int] = 8,
    ) -> LearningPathResponse:
        """Synthesize personalized milestone learning pathway with practical projects and activities."""
        self.logger.info("Synthesizing learning path for '%s' (level: %s, goal: '%s')", topic, current_level, target_goal or "general")
        prompt = build_learning_path_prompt(
            topic=topic,
            current_level=current_level,
            target_goal=target_goal,
            duration_weeks=duration_weeks,
        )

        raw_response = await self.client_manager.generate_content(
            prompt=prompt,
            system_instruction=LEARNING_PATH_SYSTEM_INSTRUCTION,
            temperature=0.3,
            response_mime_type="application/json",
        )

        parsed = extract_json_from_ai_text(raw_response)
        raw_stages = parsed.get("stages") or parsed.get("milestones")

        if not isinstance(raw_stages, list) or len(raw_stages) == 0:
            raise AIGenerationError("Gemini output did not contain valid learning stages.")

        validated_stages: List[LearningStage] = []
        for idx, m in enumerate(raw_stages, start=1):
            if not isinstance(m, dict):
                continue
            title = str(m.get("title", f"Stage {idx}")).strip()
            raw_diff = str(m.get("difficulty") or m.get("level") or current_level).strip().lower()
            diff = raw_diff if raw_diff in ("beginner", "intermediate", "advanced") else current_level

            # Concepts
            raw_concepts = m.get("concepts") or m.get("focus_concepts", [])
            if not isinstance(raw_concepts, list):
                raw_concepts = [str(raw_concepts)]
            concepts = [str(c).strip() for c in raw_concepts if str(c).strip()]
            if not concepts:
                concepts = [f"Foundational competencies for {title}"]

            # Practice
            raw_practice = m.get("practice") or m.get("recommended_activities", [])
            if not isinstance(raw_practice, list):
                raw_practice = [str(raw_practice)]
            practice = [str(a).strip() for a in raw_practice if str(a).strip()]
            if not practice:
                practice = [f"Hands-on exercises and practical application for {title}"]

            # Resources
            raw_resources = m.get("resources", [])
            if not isinstance(raw_resources, list):
                raw_resources = []
            resources: List[LearningResource] = []
            for r in raw_resources:
                if isinstance(r, dict):
                    r_type = str(r.get("type", "documentation")).strip().lower()
                    r_title = str(r.get("title", "")).strip()
                    if r_title:
                        # Enforce url: null per anti-hallucination requirement
                        resources.append(LearningResource(type=r_type, title=r_title, url=None))
                elif isinstance(r, str) and r.strip():
                    resources.append(LearningResource(type="documentation", title=r.strip(), url=None))

            checkpoint = m.get("checkpoint_project")

            validated_stages.append(
                LearningStage(
                    stage=idx,
                    title=title,
                    difficulty=diff,
                    concepts=concepts,
                    practice=practice,
                    resources=resources,
                    checkpoint_project=str(checkpoint).strip() if checkpoint else None,
                )
            )

        if not validated_stages:
            raise AIGenerationError("Could not validate milestone roadmap from Gemini output.")

        overview = str(parsed.get("overview") or f"A personalized progressive roadmap for mastering {topic} starting from {current_level} level.").strip()

        raw_next_steps = parsed.get("next_steps", [])
        if not isinstance(raw_next_steps, list):
            raw_next_steps = [str(raw_next_steps)]
        next_steps = [str(ns).strip() for ns in raw_next_steps if str(ns).strip()]
        if not next_steps:
            next_steps = [
                f"Build a showcase portfolio project synthesizing all {topic} stages",
                "Contribute to open-source repositories and explore advanced specialized patterns",
            ]

        model_used = self.client_manager.model_name
        return LearningPathResponse(
            status="ok",
            topic=topic.strip(),
            level=current_level,
            goal=target_goal.strip() if target_goal and target_goal.strip() else None,
            overview=overview,
            stages=validated_stages,
            milestones=validated_stages,
            total_stages=len(validated_stages),
            next_steps=next_steps,
            request_id=f"lp-{uuid.uuid4().hex[:12]}",
            model=model_used,
        )

    async def synthesize_research(
        self,
        query: str,
        sources_context: str,
        conversation_context: Optional[str] = None,
    ) -> str:
        """Synthesize source-grounded educational answer based on retrieved external research."""
        self.logger.info("Synthesizing grounded research for query '%s' (%d context chars)", query[:50], len(sources_context))
        prompt = build_research_prompt(
            query=query,
            sources_context=sources_context,
            conversation_context=conversation_context,
        )

        response_text = await self.client_manager.generate_content(
            prompt=prompt,
            system_instruction=RESEARCH_SYSTEM_INSTRUCTION,
            temperature=0.2,  # Strict precision for grounded synthesis
        )

        return response_text.strip()


_gemini_service_instance: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Singleton provider for GeminiService."""
    global _gemini_service_instance
    if _gemini_service_instance is None:
        _gemini_service_instance = GeminiService()
    return _gemini_service_instance
