from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.models.auth_dependencies import get_current_user
from app.models.dependencies import get_db
from app.domains.decisions.schemas import (
    ReviewResponse,
    ReviewResolutionRequest,
    ReviewStatsResponse,
)
from app.domains.decisions.service import (
    list_reviews,
    get_review_by_id,
    get_review_by_request_id,
    get_review_stats,
    approve_review,
    reject_review,
)

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.get("", response_model=list[ReviewResponse])
@router.get("/", response_model=list[ReviewResponse])
def get_reviews_endpoint(
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = current_user.get("workspace_id", 1) or 1
    return list_reviews(
        db=db,
        status=status_filter,
        workspace_id=workspace_id,
        limit=limit,
        offset=offset,
    )


@router.get("/stats", response_model=ReviewStatsResponse)
def get_review_stats_endpoint(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = current_user.get("workspace_id", 1) or 1
    return get_review_stats(db=db, workspace_id=workspace_id)


@router.get("/by-request/{request_id}", response_model=ReviewResponse)
def get_review_by_request_id_endpoint(
    request_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = current_user.get("workspace_id", 1) or 1
    review = get_review_by_request_id(db=db, request_id=request_id, workspace_id=workspace_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review item not found",
        )
    return review


@router.get("/{review_id}", response_model=ReviewResponse)
def get_review_endpoint(
    review_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = current_user.get("workspace_id", 1) or 1
    review = get_review_by_id(db=db, review_id=review_id, workspace_id=workspace_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review item not found",
        )
    return review


@router.post("/{review_id}/approve", response_model=ReviewResponse)
def approve_review_endpoint(
    review_id: int,
    req: ReviewResolutionRequest = ReviewResolutionRequest(),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = current_user.get("workspace_id", 1) or 1
    reviewer_id = int(current_user["sub"])
    reviewer_name = req.reviewer_name or current_user.get("username", f"User #{reviewer_id}")

    review = approve_review(
        db=db,
        review_id=review_id,
        reviewer_id=reviewer_id,
        reviewer_name=reviewer_name,
        notes=req.notes,
        workspace_id=workspace_id,
    )
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review item not found",
        )
    return review


@router.post("/{review_id}/reject", response_model=ReviewResponse)
def reject_review_endpoint(
    review_id: int,
    req: ReviewResolutionRequest = ReviewResolutionRequest(),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    workspace_id = current_user.get("workspace_id", 1) or 1
    reviewer_id = int(current_user["sub"])
    reviewer_name = req.reviewer_name or current_user.get("username", f"User #{reviewer_id}")

    review = reject_review(
        db=db,
        review_id=review_id,
        reviewer_id=reviewer_id,
        reviewer_name=reviewer_name,
        notes=req.notes,
        workspace_id=workspace_id,
    )
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review item not found",
        )
    return review
