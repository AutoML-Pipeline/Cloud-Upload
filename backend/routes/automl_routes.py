"""
AutoML Routes - Professional AutoGluon Integration
REST API endpoints for automated machine learning
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Any
import logging

from backend.controllers import automl_controller
from backend.models.pydantic_models import (
    AutoMLStartRequest,
    AutoMLStatusResponse,
    AutoMLPredictionRequest,
    AutoMLPredictionResponse
)

router = APIRouter(prefix="/api/automl", tags=["AutoML"])

@router.get("/files", response_model=List[str])
async def list_automl_files():
    """List available engineered files for AutoML training"""
    try:
        return await automl_controller.list_automl_files()
    except Exception as e:
        logging.error(f"Error listing AutoML files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files/{filename}/columns", response_model=List[str])
async def get_file_columns(filename: str):
    """Get column names from an engineered file"""
    try:
        return await automl_controller.get_file_columns(filename)
    except Exception as e:
        logging.error(f"Error getting file columns: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/files/{filename}/columns/{column_name}/task-type")
async def detect_task_type(filename: str, column_name: str):
    """Detect if a column is suitable for classification or regression"""
    try:
        return await automl_controller.detect_task_type(filename, column_name)
    except Exception as e:
        logging.error(f"Error detecting task type: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/start", response_model=Dict[str, str])
async def start_automl_training(request: AutoMLStartRequest):
    """Start AutoML training job"""
    try:
        return await automl_controller.start_automl_training(request)
    except Exception as e:
        logging.error(f"Error starting AutoML training: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/status/{job_id}", response_model=AutoMLStatusResponse)
async def get_automl_status(job_id: str):
    """Get AutoML training status and results"""
    try:
        return await automl_controller.get_automl_status(job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logging.error(f"Error getting AutoML status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict", response_model=AutoMLPredictionResponse)
async def make_prediction(request: AutoMLPredictionRequest):
    """Make predictions using trained AutoML model"""
    try:
        return await automl_controller.make_prediction(request)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logging.error(f"Error making prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/jobs/{job_id}")
async def cancel_automl_job(job_id: str):
    """Cancel an AutoML training job"""
    try:
        if job_id not in automl_controller.AUTOML_JOBS:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job_data = automl_controller.AUTOML_JOBS[job_id]
        if job_data["status"] in ["done", "error"]:
            raise HTTPException(status_code=400, detail="Job already completed")
        
        job_data["status"] = "cancelled"
        job_data["error"] = "Job cancelled by user"
        
        return {"message": "Job cancelled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error cancelling AutoML job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs", response_model=List[Dict[str, Any]])
async def list_automl_jobs():
    """List all AutoML training jobs"""
    try:
        jobs = []
        for job_id, job_data in automl_controller.AUTOML_JOBS.items():
            jobs.append({
                "job_id": job_id,
                "status": job_data["status"],
                "progress": job_data["progress"],
                "filename": job_data.get("filename"),
                "task": job_data.get("task"),
                "target_column": job_data.get("target_column"),
                "current_phase": job_data.get("current_phase"),
                "best_model": job_data.get("best_model"),
                "best_score": job_data.get("best_score"),
                "training_time": job_data.get("training_time")
            })
        return jobs
    except Exception as e:
        logging.error(f"Error listing AutoML jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cleanup")
async def cleanup_automl_jobs():
    """Clean up old completed AutoML jobs"""
    try:
        await automl_controller.cleanup_old_jobs()
        return {"message": "Cleanup completed"}
    except Exception as e:
        logging.error(f"Error cleaning up AutoML jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def automl_health_check():
    """Check AutoML service health"""
    try:
        from backend.controllers.automl_controller import AUTOML_AVAILABLE
        return {
            "status": "healthy",
            "automl_available": AUTOML_AVAILABLE,
            "active_jobs": len(automl_controller.AUTOML_JOBS)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "automl_available": False,
            "active_jobs": 0
        }
