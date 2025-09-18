from fastapi import APIRouter, Request
from typing import List, Dict, Any

from backend.controllers.feature_engineering import controller as fe_controller
from backend.controllers.feature_engineering.types import (
    ApplyFeatureEngineeringRequest, FeatureEngineeringPreviewRequest, FeatureEngineeringResponse, MinioFile
)
from backend.services import minio_service

router = APIRouter()

@router.get("/files/cleaned", response_model=List[MinioFile])
async def list_cleaned_files_for_fe():
    return await fe_controller.get_minio_files_for_feature_engineering()

@router.post("/apply-preview", response_model=FeatureEngineeringResponse)
async def get_feature_engineering_preview_route(
    request: FeatureEngineeringPreviewRequest
):
    return await fe_controller.get_feature_engineering_preview(request)

@router.post("/apply-and-save", response_model=Dict[str, str])
async def apply_and_save_feature_engineering_route(
    request: ApplyFeatureEngineeringRequest
):
    return await fe_controller.apply_and_save_feature_engineering(request)

@router.post("/save-to-minio")
async def save_feature_engineered_to_minio(request: Request):
    """Save feature engineered data to MinIO feature-engineered bucket"""
    body = await request.json()
    data = body.get("data")
    filename = body.get("filename")
    
    if not data or not filename:
        return {"error": "Missing data or filename"}
    
    try:
        result = minio_service.save_data_to_minio(data, filename, "feature-engineered")
        return result
    except Exception as e:
        return {"error": f"Failed to save to MinIO: {str(e)}"}
