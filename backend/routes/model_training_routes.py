"""FastAPI routes for model training"""
import logging
from typing import List
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from backend.controllers import model_training
from backend.controllers.model_training.types import (
    MinioFile,
    PredictionRequest,
    PredictionResponse,
    TrainingConfig,
)
from backend.services import progress_tracker

router = APIRouter()


@router.get("/training/files", response_model=List[MinioFile])
async def get_training_files():
    """Get list of feature-engineered files available for training"""
    try:
        return await model_training.get_minio_files_for_training()
    except Exception as e:
        logging.error(f"Error listing training files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/training/recommendations/{filename}")
async def get_training_recommendations(filename: str, target_column: str):
    """
    Get automatic recommendations for problem type and models to use.
    
    Query params:
    - target_column: The column to predict (required)
    
    Returns:
    - problem_type: "classification" or "regression"
    - target_analysis: Detailed statistics about target column
    - model_recommendations: List of recommended models with reasons
    """
    try:
        return await model_training.get_training_recommendations(filename, target_column)
    except Exception as e:
        logging.error(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/training/train/{filename}")
async def start_training(
    filename: str,
    request: Request,
    background_tasks: BackgroundTasks
):
    """
    Start model training job.
    
    Request body should contain TrainingConfig with:
    - target_column: str (required)
    - problem_type: "classification" | "regression" (optional, auto-detected)
    - test_size: float (default 0.2)
    - random_state: int (default 42)
    - models_to_train: List[str] (optional, trains all if not provided)
    """
    try:
        body = await request.json()
        config = TrainingConfig(**body)
        
        # Create job
        job_id = progress_tracker.create_job()
        
        # Queue background training task
        background_tasks.add_task(
            model_training.run_training_job,
            job_id=job_id,
            filename=filename,
            target_column=config.target_column,
            problem_type=config.problem_type,
            test_size=config.test_size,
            random_state=config.random_state,
            models_to_train=config.models_to_train,
        )
        
        logging.info(f"🚀 Training job {job_id} started for {filename}")
        
        return {
            "job_id": job_id,
            "filename": filename,
            "target_column": config.target_column,
            "message": "Training job started"
        }
        
    except Exception as e:
        logging.error(f"Error starting training: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/training/status/{job_id}")
async def get_training_status(job_id: str):
    """Get status of training job"""
    job = progress_tracker.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")
    return job


@router.get("/training/models")
async def list_trained_models():
    """Get list of all trained models"""
    try:
        return await model_training.get_trained_models_list()
    except Exception as e:
        logging.error(f"Error listing models: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/training/models/{model_id}")
async def get_model_info(model_id: str):
    """Get detailed information about a trained model"""
    try:
        return await model_training.get_model_details(model_id)
    except Exception as e:
        logging.error(f"Error getting model details: {e}")
        raise HTTPException(status_code=404, detail="Model not found")


@router.post("/training/predict/{model_id}")
async def make_prediction(model_id: str, request: Request):
    """
    Make predictions using a trained model.
    
    Request body should contain:
    - data: List of dictionaries with feature values
    
    Example:
    {
        "data": [
            {"feature1": 1.0, "feature2": 2.0},
            {"feature1": 3.0, "feature2": 4.0}
        ]
    }
    """
    try:
        body = await request.json()
        data = body.get("data", [])
        
        if not data:
            raise HTTPException(status_code=400, detail="No data provided")
        
        # Use updated prediction controller
        result = await model_training.make_predictions(
            model_id=model_id,
            data=data
        )
        
        return result
        
    except ValueError as e:
        # Column validation errors
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    except Exception as e:
        logging.error(f"Error making predictions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/training/models/{model_id}")
async def delete_model(model_id: str):
    """Delete a trained model and its results"""
    try:
        from backend.config import MODELS_BUCKET, TRAINING_RESULTS_BUCKET, minio_client
        
        # Delete model file
        model_filename = f"{model_id}.joblib"
        minio_client.remove_object(MODELS_BUCKET, model_filename)
        
        # Delete results file
        results_filename = f"{model_id}_results.json"
        minio_client.remove_object(TRAINING_RESULTS_BUCKET, results_filename)
        
        logging.info(f"🗑️ Deleted model {model_id}")
        
        return {"message": f"Model {model_id} deleted successfully"}
        
    except Exception as e:
        logging.error(f"Error deleting model: {e}")
        raise HTTPException(status_code=500, detail=str(e))
