"""Prompt engineering and versioned system templates for EDUGENIE AI services."""

from app.services.ai.prompts.qa import build_qa_prompt
from app.services.ai.prompts.explanation import build_explanation_prompt
from app.services.ai.prompts.quiz import build_quiz_prompt
from app.services.ai.prompts.summary import build_summary_prompt
from app.services.ai.prompts.learning_path import build_learning_path_prompt

__all__ = [
    "build_qa_prompt",
    "build_explanation_prompt",
    "build_quiz_prompt",
    "build_summary_prompt",
    "build_learning_path_prompt",
]
