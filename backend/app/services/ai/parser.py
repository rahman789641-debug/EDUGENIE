"""Robust JSON extraction and schema validation utilities for Gemini AI outputs."""

import json
import logging
import re
from typing import Any, Dict, List, Type, TypeVar, Union

from pydantic import BaseModel, ValidationError

from app.core.exceptions import AIGenerationError

logger = logging.getLogger("edugenie.ai.parser")

T = TypeVar("T", bound=BaseModel)


def _strip_markdown_code_fences(text: str) -> str:
    """Strip markdown code block markers (```json ... ``` or ``` ... ```)."""
    clean = text.strip()
    if clean.startswith("```"):
        lines = clean.splitlines()
        # Remove opening fence
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        # Remove closing fence
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        clean = "\n".join(lines).strip()
    return clean


def _extract_outermost_json(text: str) -> str:
    """Extract substring between outermost '{' and '}' or '[' and ']'."""
    # Find positions of object vs array braces
    first_brace = text.find("{")
    last_brace = text.rfind("}")

    first_bracket = text.find("[")
    last_bracket = text.rfind("]")

    # Decide whether the outermost structure is an object or an array
    is_object = (
        first_brace != -1
        and last_brace != -1
        and last_brace > first_brace
        and (first_bracket == -1 or first_brace < first_bracket)
    )
    is_array = (
        first_bracket != -1
        and last_bracket != -1
        and last_bracket > first_bracket
        and (first_brace == -1 or first_bracket < first_brace)
    )

    if is_object:
        return text[first_brace : last_brace + 1].strip()
    elif is_array:
        return text[first_bracket : last_bracket + 1].strip()

    return text.strip()


def _sanitize_trailing_commas(json_str: str) -> str:
    """Safely remove invalid trailing commas immediately preceding closing braces/brackets."""
    return re.sub(r",\s*([\]}])", r"\1", json_str)


def safe_extract_json(raw_text: str) -> Union[Dict[str, Any], List[Any]]:
    """Safely extract and parse JSON payload from AI generated text.

    Protections:
    - Strips markdown code blocks (```json ... ```)
    - Isolates outermost JSON structure ignoring preamble/postamble conversational prose
    - Resiliently removes trailing commas before closing braces/brackets
    - Strictly uses json.loads (NEVER eval)
    - Raises controlled AIGenerationError without leaking sensitive internal details
    """
    if not raw_text or not raw_text.strip():
        logger.error("AI generation returned empty or whitespace-only text.")
        raise AIGenerationError("Empty response received from AI model.")

    clean_text = raw_text.strip()

    # Step 1: Strip markdown code blocks
    stripped = _strip_markdown_code_fences(clean_text)

    # Step 2: Attempt direct parse on stripped text
    try:
        parsed = json.loads(stripped)
        if isinstance(parsed, (dict, list)):
            return parsed
    except json.JSONDecodeError:
        pass

    # Step 3: Extract outermost JSON object or array
    isolated = _extract_outermost_json(stripped)
    try:
        parsed = json.loads(isolated)
        if isinstance(parsed, (dict, list)):
            return parsed
    except json.JSONDecodeError:
        pass

    # Step 4: Handle trailing commas (common Gemini syntax quirk)
    try:
        sanitized = _sanitize_trailing_commas(isolated)
        parsed = json.loads(sanitized)
        if isinstance(parsed, (dict, list)):
            return parsed
    except json.JSONDecodeError:
        pass

    # If all recovery attempts fail, log safely and raise controlled domain error
    logger.warning(
        "Failed to extract valid JSON from AI response. Length: %d, Prefix: %s",
        len(raw_text),
        raw_text[:100].replace("\n", " "),
    )
    raise AIGenerationError("AI response did not contain valid JSON structured data.")


def safe_parse_and_validate(raw_text: str, schema: Type[T]) -> T:
    """Extract JSON and strictly validate against a Pydantic schema class.

    On validation failure, logs details cleanly and raises a sanitized AIGenerationError.
    """
    parsed_data = safe_extract_json(raw_text)

    if not isinstance(parsed_data, dict):
        raise AIGenerationError(
            f"Expected a structured JSON object for {schema.__name__}, but received a list."
        )

    try:
        return schema.model_validate(parsed_data)
    except ValidationError as val_err:
        errors = val_err.errors()
        error_summaries: List[str] = []
        for e in errors[:3]:  # Limit to first 3 errors for clarity
            loc = " -> ".join(str(l) for l in e.get("loc", []))
            msg = e.get("msg", "Invalid field")
            error_summaries.append(f"{loc}: {msg}" if loc else msg)

        summary_str = "; ".join(error_summaries)
        logger.warning(
            "AI response schema validation failed for %s: %s",
            schema.__name__,
            summary_str,
        )
        raise AIGenerationError(
            f"AI response failed schema validation for {schema.__name__}: {summary_str}"
        ) from None
