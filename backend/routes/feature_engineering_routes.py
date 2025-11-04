import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from typing import Any, Dict

from backend.controllers.feature_engineering import controller as fe_controller
from backend.controllers.feature_engineering.types import RunFeatureEngineeringRequest
from backend.services import minio_service, progress_tracker

router = APIRouter()

@router.get("/files/cleaned")
async def list_cleaned_files_for_fe():
    """List cleaned files available for feature engineering"""
    try:
        return await fe_controller.get_minio_files_for_feature_engineering()
    except Exception as e:
        logging.error(f"Error listing cleaned files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analyze/{filename:path}")
async def analyze_dataset_for_recommendations(filename: str):
    """Analyze dataset and provide feature engineering recommendations"""
    try:
        return await fe_controller.get_dataset_analysis_with_recommendations(filename)
    except Exception as e:
        logging.error(f"Error analyzing dataset: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preview/{filename:path}")
async def feature_engineering_dataset_preview(filename: str, bucket: str = "cleaned-data"):
    """Get feature engineering dataset preview"""
    try:
        return await fe_controller.get_feature_engineering_dataset_preview(filename, bucket)
    except Exception as e:
        logging.error(f"Error getting feature engineering preview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/apply-feature-engineering/{filename}")
async def apply_feature_engineering(filename: str, request: Request, background_tasks: BackgroundTasks):
    """Apply feature engineering and run as background job"""
    try:
        body = await request.json()
        steps = body.get("steps", [])

        job_id = progress_tracker.create_job()
        fe_request = RunFeatureEngineeringRequest(filename=filename, steps=steps)
        background_tasks.add_task(
            fe_controller.run_feature_engineering_job,
            job_id,
            fe_request,
        )
        return {"job_id": job_id}
    except Exception as e:
        logging.error(f"Error starting feature engineering job: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))



@router.get("/status/{job_id}")
async def feature_engineering_job_status(job_id: str):
    """Get feature engineering job status"""
    try:
        job = progress_tracker.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
    except Exception as e:
        logging.error(f"Error getting feature engineering status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-to-minio")
async def save_feature_engineered_to_minio(request: Request):
    """Save feature engineered data to MinIO feature-engineered bucket"""
    try:
        body = await request.json()
        filename = body.get("filename") or body.get("engineered_filename")
        temp_path = body.get("temp_engineered_path")
        data = body.get("data")
        
        logging.info(f"save_feature_engineered_to_minio request body keys: {list(body.keys())}")
        
        if temp_path and filename:
            logging.info(f"Using save_feature_engineered_temp path: {temp_path} -> {filename}")
            return minio_service.save_feature_engineered_temp(temp_path, filename)

        if data and filename:
            logging.info(f"Using save_data_to_minio path for {filename} (CSV data)")
            result = minio_service.save_data_to_minio(data, filename, "feature-engineered")
            return result
            
        return {"error": "Missing data or filename"}
    except Exception as e:
        logging.error(f"Error saving to MinIO: {str(e)}")
        return {"error": f"Failed to save to MinIO: {str(e)}"}



@router.post("/download-csv")
async def download_feature_engineered_csv(request: Request):
    """Download feature engineered dataset as CSV"""
    try:
        body = await request.json()
        filename = body.get("engineered_filename") or body.get("filename")
        temp_path = body.get("temp_engineered_path")

        csv_bytes, download_name = minio_service.prepare_dataset_csv_bytes(
            temp_path=temp_path,
            filename=filename,
            bucket="feature-engineered",
            default_filename="feature_engineered_dataset.csv",
        )
        
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{download_name}"'},
        )
    except FileNotFoundError:
        logging.error(f"Feature engineered dataset file not found")
        raise HTTPException(status_code=404, detail="Feature engineered dataset is no longer available for download")
    except Exception as exc:
        logging.exception("Failed to prepare engineered dataset CSV", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to prepare engineered dataset download: {exc}") from exc
