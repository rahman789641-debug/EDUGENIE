"""Quiz generation request and response schemas for EduGenie."""

from enum import Enum
from typing import List, Optional, Union
from pydantic import AliasChoices, BaseModel, Field, field_validator, model_validator


class QuizDifficulty(str, Enum):
    """Assessment difficulty tier."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class QuizRequest(BaseModel):
    """Payload for generating quiz items from study content."""

    content: str = Field(
        ...,
        min_length=5,
        max_length=25000,
        validation_alias=AliasChoices("content", "topic", "text"),
        description="Educational passage, study notes, or topic description",
        examples=["Photosynthesis is the process by which green plants and certain other organisms transform light energy into chemical energy..."],
    )
    difficulty: QuizDifficulty = Field(
        default=QuizDifficulty.BEGINNER,
        description="Cognitive difficulty rating: beginner, intermediate, or advanced",
        examples=["beginner"],
    )
    question_count: Optional[int] = Field(
        default=3,
        ge=1,
        le=20,
        validation_alias=AliasChoices("question_count", "num_questions", "numQuestions", "count"),
        description="Number of quiz questions to generate (default: 3)",
    )

    @field_validator("content", mode="before")
    @classmethod
    def validate_content(cls, value: object) -> str:
        """Strip whitespace and reject empty or whitespace-only content."""
        if not isinstance(value, str):
            raise ValueError("Content must be a text string.")
        stripped = value.strip()
        if not stripped:
            raise ValueError("Content cannot be empty or contain only whitespace.")
        return stripped

    @field_validator("difficulty", mode="before")
    @classmethod
    def normalize_difficulty(cls, value: object) -> object:
        """Normalize case and map legacy difficulty tiers (easy, medium, hard)."""
        if isinstance(value, str):
            val_lower = value.strip().lower()
            legacy_mapping = {
                "easy": "beginner",
                "medium": "intermediate",
                "hard": "advanced",
            }
            if val_lower in legacy_mapping:
                return legacy_mapping[val_lower]
            return val_lower
        return value


class QuizQuestionItem(BaseModel):
    """Structured multiple-choice assessment item."""

    id: Union[str, int] = Field(..., description="Unique question identifier (e.g., 'q1', 1)")
    question: str = Field(..., description="The assessment prompt or question")
    options: List[str] = Field(..., min_length=4, max_length=4, description="Exactly 4 distinct candidate choices")
    correct_answer: str = Field(..., description="The exact correct choice matching one of options")
    explanation: str = Field(..., description="Concise educational rationale explaining why the correct choice is right")
    correct_index: Optional[int] = Field(default=None, description="0-indexed position of correct answer in options list")

    @model_validator(mode="before")
    @classmethod
    def validate_and_align_question(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data

        # Ensure question string is present
        question_text = str(data.get("question", "")).strip()
        if not question_text:
            raise ValueError("Question text cannot be empty.")
        data["question"] = question_text

        # Validate options: clean and check duplicates
        raw_options = data.get("options", [])
        if not isinstance(raw_options, list):
            raise ValueError("Options must be a list of 4 choices.")

        clean_options = [str(opt).strip() for opt in raw_options if str(opt).strip()]
        if len(clean_options) != 4:
            raise ValueError(f"Each question must contain exactly 4 options, got {len(clean_options)}.")

        # Check for duplicate options (case-insensitive)
        seen = set()
        for opt in clean_options:
            opt_lower = opt.lower()
            if opt_lower in seen:
                raise ValueError(f"Duplicate option detected in question: '{opt}'")
            seen.add(opt_lower)
        data["options"] = clean_options

        # Validate or derive correct_answer and correct_index
        correct_answer = data.get("correct_answer")
        correct_index = data.get("correct_index")

        if correct_answer is not None and str(correct_answer).strip():
            clean_correct_answer = str(correct_answer).strip()
            # Find match in options
            match_index = -1
            for idx, opt in enumerate(clean_options):
                if opt.lower() == clean_correct_answer.lower():
                    match_index = idx
                    clean_correct_answer = opt  # normalize to exact option casing
                    break
            if match_index == -1:
                # If correct_index was also supplied and in bounds, align
                if isinstance(correct_index, int) and 0 <= correct_index < len(clean_options):
                    clean_correct_answer = clean_options[correct_index]
                    match_index = correct_index
                else:
                    raise ValueError(f"correct_answer '{correct_answer}' does not match any of the 4 options.")
            data["correct_answer"] = clean_correct_answer
            data["correct_index"] = match_index
        elif isinstance(correct_index, int) and 0 <= correct_index < len(clean_options):
            data["correct_answer"] = clean_options[correct_index]
        else:
            raise ValueError("Question must have either a valid correct_answer matching an option or a valid correct_index.")

        # Ensure explanation is present
        explanation = str(data.get("explanation", "")).strip()
        if not explanation:
            data["explanation"] = f"'{data['correct_answer']}' is the correct answer according to the provided material."
        else:
            data["explanation"] = explanation

        return data


class QuizResponse(BaseModel):
    """Structured response containing generated quiz items."""

    title: str = Field(default="Quiz", description="Title of the generated quiz")
    questions: List[QuizQuestionItem] = Field(default_factory=list, description="List of generated questions")
    difficulty: Optional[str] = Field(default="beginner", description="Difficulty tier applied")
    total_questions: Optional[int] = Field(default=None, description="Total count of questions returned")
    status: Optional[str] = Field(default="ok", description="Response status")
    model: Optional[str] = Field(default=None, description="Gemini model identifier used for generation")
    request_id: Optional[str] = Field(default=None, description="Request tracking identifier")

    @model_validator(mode="after")
    def compute_total_questions(self) -> "QuizResponse":
        if self.total_questions is None:
            self.total_questions = len(self.questions)
        return self
