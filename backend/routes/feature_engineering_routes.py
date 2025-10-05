import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from typing import Any, Dict, List

from backend.controllers.feature_engineering import controller as fe_controller
from backend.controllers.feature_engineering.types import (
    ApplyFeatureEngineeringRequest,
    FeatureEngineeringPreviewRequest,
    FeatureEngineeringResponse,
    MinioFile,
    RunFeatureEngineeringRequest,
)
from backend.services import minio_service, progress_tracker

router = APIRouter()

@router.get("/files/cleaned", response_model=List[MinioFile])
async def list_cleaned_files_for_fe():
    return await fe_controller.get_minio_files_for_feature_engineering()


@router.get("/preview/{filename:path}")
async def feature_engineering_dataset_preview(filename: str):
    return await fe_controller.get_feature_engineering_dataset_preview(filename)

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


@router.post("/run", response_model=Dict[str, str])
async def run_feature_engineering_route(
    request: RunFeatureEngineeringRequest,
    background_tasks: BackgroundTasks,
):
    job_id = progress_tracker.create_job()
    background_tasks.add_task(fe_controller.run_feature_engineering_job, job_id, request)
    return {"job_id": job_id}


@router.get("/status/{job_id}")
async def feature_engineering_job_status(job_id: str):
    job = progress_tracker.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/save-to-minio")
async def save_feature_engineered_to_minio(request: Request):
    """Save feature engineered data to MinIO feature-engineered bucket"""
    body = await request.json()
    filename = body.get("filename")
    temp_path = body.get("temp_engineered_path")
    data = body.get("data")
    
    if temp_path and filename:
        return minio_service.save_feature_engineered_temp(temp_path, filename)

    if not data or not filename:
        return {"error": "Missing data or filename"}
    
    try:
        result = minio_service.save_data_to_minio(data, filename, "feature-engineered")
        return result
    except Exception as e:
        return {"error": f"Failed to save to MinIO: {str(e)}"}


@router.post("/download-csv")
async def download_feature_engineered_csv(request: Request):
    body = await request.json()
    filename = body.get("filename")
    temp_path = body.get("temp_engineered_path")

    try:
        csv_bytes, download_name = minio_service.prepare_dataset_csv_bytes(
            temp_path=temp_path,
            filename=filename,
            bucket="feature-engineered",
            default_filename="feature_engineered_dataset.csv",
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Feature engineered dataset is no longer available for download")
    except Exception as exc:  # noqa: BLE001
        logging.exception("Failed to prepare engineered dataset CSV", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to prepare engineered dataset download: {exc}") from exc

    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
    )
