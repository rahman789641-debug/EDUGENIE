"""Concept Explanation endpoint route handler."""

from fastapi import APIRouter, Depends, Request, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.schemas.explain import ExplainRequest, ExplainResponse
from app.services.explanation_service import ExplanationService, get_explanation_service

router = APIRouter()


@router.post(
    "/explain",
    response_model=ExplainResponse,
    status_code=status.HTTP_200_OK,
    summary="Pedagogical Concept Explanation",
    description="Deconstruct complex concepts into structured pedagogical explanations tailored by learner level.",
    tags=["Educational AI"],
)
async def explain_concept(
    request: Request,
    payload: ExplainRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    service: ExplanationService = Depends(get_explanation_service),
) -> ExplainResponse:
    """Thin route handler delegating to ExplanationService for authenticated users."""
    req_id = getattr(request.state, "request_id", None)
    return await service.process_explanation(request=payload, request_id=req_id, user=user)
