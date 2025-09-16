# FastAPI route definitions for feature engineering endpoints
from fastapi import APIRouter, Request
from controllers.feature_engineering.controller import apply_feature_engineering, get_feature_engineering_preview

router = APIRouter()

@router.post("/feature-engineering/apply/{filename}")
async def apply_feature_engineering_route(filename: str, request: Request):
    """Apply feature engineering transformations to a dataset"""
    body = await request.json()
    return await apply_feature_engineering(filename, body, request)

@router.get("/feature-engineering/preview/{filename}")
async def get_feature_engineering_preview_route(filename: str):
    """Get preview information for feature engineering"""
    return get_feature_engineering_preview(filename)
