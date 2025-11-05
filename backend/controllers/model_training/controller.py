"""Main controller for model training orchestration"""
import io
import json
import logging
import os
import tempfile
import uuid
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd

from backend.config import (
    FEATURE_ENGINEERED_BUCKET,
    MODELS_BUCKET,
    TRAINING_RESULTS_BUCKET,
    minio_client,
)
from backend.controllers.model_training.problem_detector import (
    analyze_target_column,
    detect_problem_type,
    get_recommended_models,
    validate_target_column,
)
from backend.controllers.model_training.trainers import (
    CLASSIFICATION_MODELS,
    REGRESSION_MODELS,
    get_available_models,
    prepare_data_for_training,
    select_best_model,
    train_single_model,
)
from backend.controllers.model_training.types import MinioFile, TrainedModelInfo
from backend.services import progress_tracker
from backend.services import model_cache
from backend.utils.json_utils import _to_json_safe


async def get_minio_files_for_training() -> List[MinioFile]:
    """Get list of feature-engineered files available for training"""
    files: List[MinioFile] = []
    try:
        objects = minio_client.list_objects(FEATURE_ENGINEERED_BUCKET, recursive=True)
        for obj in objects:
            if getattr(obj, "is_dir", False):
                continue
            files.append(
                MinioFile(
                    name=obj.object_name,
                    last_modified=getattr(obj, "last_modified", None).isoformat()
                    if getattr(obj, "last_modified", None)
                    else None,
                    size=getattr(obj, "size", None),
                )
            )
    except Exception:
        logging.exception("Failed to list feature-engineered files from MinIO")
        raise
    return files


async def get_training_recommendations(filename: str, target_column: str) -> Dict[str, Any]:
    """
    Analyze dataset and provide recommendations for training.
    
    Returns:
        - problem_type: "classification" or "regression"
        - target_analysis: Detailed target column statistics
        - model_recommendations: List of models with reasons and priorities
    """
    try:
        # Load dataset
        df = _load_dataframe_from_minio(filename)
        
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset")
        
        # Analyze target column
        target_analysis = analyze_target_column(df, target_column)
        
        # Detect problem type
        problem_type = detect_problem_type(df, target_column)
        
        # Get dataset dimensions
        n_samples = len(df)
        n_features = len(df.columns) - 1  # Exclude target
        
        # Get model recommendations
        model_recommendations = get_recommended_models(
            problem_type=problem_type,
            n_samples=n_samples,
            n_features=n_features,
            target_analysis=target_analysis
        )
        
        # Get available model names for reference
        available_models = get_available_models(problem_type)
        
        return {
            "filename": filename,
            "target_column": target_column,
            "problem_type": problem_type,
            "dataset_info": {
                "total_samples": n_samples,
                "total_features": n_features,
                "feature_names": [col for col in df.columns if col != target_column],
            },
            "target_analysis": target_analysis,
            "model_recommendations": model_recommendations,
            "available_models": available_models,
        }
        
    except Exception as e:
        logging.exception(f"Error getting training recommendations for {filename}")
        raise


def run_training_job(
    job_id: str,
    filename: str,
    target_column: str,
    problem_type: str,  # Now required, not optional
    test_size: float = 0.2,
    random_state: int = 42,
    models_to_train: Optional[List[str]] = None,
) -> None:
    """
    Main training job - runs in background task.
    
    Steps:
    1. Load feature-engineered data from MinIO
    2. Validate target column
    3. Prepare train/test split
    4. Train multiple models for specified problem type
    5. Evaluate and select best model
    6. Prepare best model and results in memory (do not persist yet)
    7. Complete job with results; client can save later
    """
    try:
        progress_tracker.update_job(job_id, status="running", progress=10)
        
        # Step 1: Load data
        logging.info(f"📂 Loading dataset: {filename}")
        df = _load_dataframe_from_minio(filename)
        progress_tracker.update_job(job_id, status="running", progress=20)
        
        # Dataset info
        dataset_info = {
            "filename": filename,
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "features": [col for col in df.columns if col != target_column],
            "target_column": target_column,
        }
        
        # Step 2: Validate target
        logging.info(f"🎯 Validating target column: {target_column}")
        validate_target_column(df, target_column)
        
        logging.info(f"📊 Problem type: {problem_type.upper()}")
        dataset_info["problem_type"] = problem_type
        progress_tracker.update_job(job_id, status="running", progress=30)
        
        # Step 3: Prepare data
        logging.info(f"✂️ Splitting data (test_size={test_size})")
        X_train, X_test, y_train, y_test = prepare_data_for_training(
            df, target_column, test_size, random_state
        )
        progress_tracker.update_job(job_id, status="running", progress=40)
        
        # Step 4: Select models to train
        if models_to_train:
            # Filter to only valid models for this problem type
            available = get_available_models(problem_type)
            models_to_train = [m for m in models_to_train if m in available]
        else:
            # Train all available models for this problem type
            models_to_train = get_available_models(problem_type)
        
        logging.info(f"🤖 Training {len(models_to_train)} models: {', '.join(models_to_train)}")
        
        # Step 5: Train models
        model_registry = CLASSIFICATION_MODELS if problem_type == "classification" else REGRESSION_MODELS
        trained_models = []
        
        for i, model_name in enumerate(models_to_train):
            model = model_registry[model_name]
            
            result = train_single_model(
                model_name=model_name,
                model=model,
                X_train=X_train,
                X_test=X_test,
                y_train=y_train,
                y_test=y_test,
                problem_type=problem_type,
            )
            
            trained_models.append(result)
            
            # Update progress
            progress = 40 + int((i + 1) / len(models_to_train) * 40)
            progress_tracker.update_job(job_id, status="running", progress=progress)
        
        progress_tracker.update_job(job_id, status="running", progress=85)
        
        # Step 6: Select best model
        logging.info(f"🏆 Selecting best model...")
        best_model_result = select_best_model(trained_models, problem_type)
        
        # Extract visualization data from best model
        best_model_viz = best_model_result.get('visualization_data', {})
        
        # Step 7: Cache best model and results in memory for optional save
        model_cache.put(job_id, {
            "filename": filename,
            "target_column": target_column,
            "problem_type": problem_type,
            "dataset_info": dataset_info,
            "best_model_result": best_model_result,
            "trained_models": trained_models,
        })
        progress_tracker.update_job(job_id, status="running", progress=100)
        
        # Prepare final result
        final_result = {
            "job_id": job_id,
            "status": "completed",
            "filename": filename,
            "target_column": target_column,
            "problem_type": problem_type,
            "models_trained": [
                TrainedModelInfo(
                    model_name=m['model_name'],
                    model_type=m['model_type'],
                    problem_type=problem_type,
                    metrics=m['metrics'],
                    training_time=m['training_time'],
                    is_best=(m['model_name'] == best_model_result['model_name']),
                ).model_dump()
                for m in trained_models
                if m['success']
            ],
            "best_model": {
                **TrainedModelInfo(
                    model_name=best_model_result['model_name'],
                    model_type=best_model_result['model_type'],
                    problem_type=problem_type,
                    metrics=best_model_result['metrics'],
                    training_time=best_model_result['training_time'],
                    is_best=True,
                ).model_dump(),
                # Add visualization data for best model
                "confusion_matrix": best_model_viz.get('confusion_matrix'),
                "residuals": best_model_viz.get('residuals'),
                "feature_importance": best_model_viz.get('feature_importance'),
            },
            # Model is not yet saved; client must call save endpoint to persist
            "best_model_id": None,
            "unsaved_model": True,
            "total_training_time": sum(m['training_time'] for m in trained_models),
            "dataset_info": dataset_info,
        }
        
        progress_tracker.complete_job(job_id, result=final_result)
        logging.info(f"✅ Training job {job_id} completed successfully!")
        
    except Exception as e:
        logging.exception(f"❌ Training job {job_id} failed")
        progress_tracker.fail_job(job_id, str(e))  # Fixed: removed 'error=' keyword


def save_trained_model(job_id: str) -> Dict[str, Any]:
    """Persist a cached trained model and its results to MinIO and return model_id.

    Expects that run_training_job previously cached the best model under this job_id.
    """
    payload = model_cache.pop(job_id)
    if not payload:
        raise FileNotFoundError(f"No cached model found for job {job_id}")

    filename = payload["filename"]
    target_column = payload["target_column"]
    problem_type = payload["problem_type"]
    dataset_info = payload["dataset_info"]
    best_model_result = payload["best_model_result"]
    trained_models = payload["trained_models"]

    # Generate model id and save
    model_id = str(uuid.uuid4())
    logging.info(f"\ud83d\udcbe Persisting cached best model with ID: {model_id}")

    model_filename = f"{model_id}.joblib"
    _save_model_to_minio(best_model_result['model_object'], model_filename)

    # Save training results JSON
    results_filename = f"{model_id}_results.json"
    _save_training_results_to_minio(
        results_filename,
        {
            "model_id": model_id,
            "job_id": job_id,
            "filename": filename,
            "target_column": target_column,
            "problem_type": problem_type,
            "dataset_info": dataset_info,
            "best_model": {
                "model_name": best_model_result['model_name'],
                "model_type": best_model_result['model_type'],
                "metrics": best_model_result['metrics'],
                "training_time": best_model_result['training_time'],
            },
            "all_models": [
                {
                    "model_name": m['model_name'],
                    "model_type": m['model_type'],
                    "metrics": m['metrics'],
                    "training_time": m['training_time'],
                    "success": m['success'],
                }
                for m in trained_models
            ],
        }
    )

    return {"model_id": model_id}


def _load_dataframe_from_minio(filename: str) -> pd.DataFrame:
    """Load DataFrame from feature-engineered bucket"""
    response = minio_client.get_object(FEATURE_ENGINEERED_BUCKET, filename)
    try:
        data = io.BytesIO(response.read())
        df = pd.read_parquet(data)
        logging.info(f"✅ Loaded {len(df)} rows, {len(df.columns)} columns from {filename}")
        return df
    finally:
        response.close()
        response.release_conn()


def _save_model_to_minio(model, filename: str) -> None:
    """Save trained model to MinIO models bucket"""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.joblib') as tmp:
        joblib.dump(model, tmp.name)
        tmp_path = tmp.name
    
    try:
        minio_client.fput_object(
            MODELS_BUCKET,
            filename,
            tmp_path,
            content_type='application/octet-stream'
        )
        logging.info(f"✅ Model saved to MinIO: {filename}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _save_training_results_to_minio(filename: str, results: Dict[str, Any]) -> None:
    """Save training results JSON to MinIO"""
    json_bytes = json.dumps(_to_json_safe(results), indent=2).encode('utf-8')
    
    minio_client.put_object(
        TRAINING_RESULTS_BUCKET,
        filename,
        io.BytesIO(json_bytes),
        length=len(json_bytes),
        content_type='application/json'
    )
    logging.info(f"✅ Training results saved to MinIO: {filename}")


async def get_trained_models_list() -> List[Dict[str, Any]]:
    """Get list of all trained models from MinIO"""
    models = []
    try:
        # List all result files (not model files)
        objects = minio_client.list_objects(TRAINING_RESULTS_BUCKET, recursive=True)
        
        for obj in objects:
            if obj.object_name.endswith('_results.json'):
                try:
                    # Load result file
                    response = minio_client.get_object(TRAINING_RESULTS_BUCKET, obj.object_name)
                    result_data = json.loads(response.read())
                    response.close()
                    response.release_conn()
                    
                    models.append({
                        "model_id": result_data.get("model_id"),
                        "filename": result_data.get("filename"),
                        "problem_type": result_data.get("problem_type"),
                        "target_column": result_data.get("target_column"),
                        "best_model": result_data.get("best_model"),
                        "created_at": obj.last_modified.isoformat() if obj.last_modified else None,
                    })
                except Exception as e:
                    logging.warning(f"Failed to load model result {obj.object_name}: {e}")
                    
    except Exception:
        logging.exception("Failed to list trained models")
        raise
    
    return models


async def get_model_details(model_id: str) -> Dict[str, Any]:
    """Get detailed information about a trained model"""
    try:
        results_filename = f"{model_id}_results.json"
        response = minio_client.get_object(TRAINING_RESULTS_BUCKET, results_filename)
        result_data = json.loads(response.read())
        response.close()
        response.release_conn()
        
        return result_data
    except Exception as e:
        logging.error(f"Failed to get model details for {model_id}: {e}")
        raise


def load_model_for_prediction(model_id: str):
    """Load a trained model from MinIO for making predictions"""
    try:
        model_filename = f"{model_id}.joblib"
        response = minio_client.get_object(MODELS_BUCKET, model_filename)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.joblib') as tmp:
            tmp.write(response.read())
            tmp_path = tmp.name
        
        response.close()
        response.release_conn()
        
        try:
            model = joblib.load(tmp_path)
            logging.info(f"✅ Model {model_id} loaded successfully")
            return model
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        logging.error(f"Failed to load model {model_id}: {e}")
        raise


def _transform_prediction_data_to_match_training(
    df_raw: pd.DataFrame, 
    training_features: List[str],
    model_details: Dict[str, Any]
) -> pd.DataFrame:
    """
    Transform raw prediction data to match training schema.
    Handles one-hot encoding, label encoding, and missing columns.
    
    Args:
        df_raw: Raw input data with original column names
        training_features: List of feature columns expected by the model (after encoding)
        model_details: Model metadata
    
    Returns:
        Transformed DataFrame matching training schema
    """
    df = df_raw.copy()
    
    # Step 1: Identify which columns need one-hot encoding
    # One-hot columns have pattern: original_column_value (e.g., "department_Sales")
    onehot_patterns = {}
    for col in training_features:
        if '_' in col:
            parts = col.split('_')
            if len(parts) >= 2:
                # Try to find the original column name
                original_col = '_'.join(parts[:-1])  # Everything except last part
                if original_col in df.columns:
                    if original_col not in onehot_patterns:
                        onehot_patterns[original_col] = []
                    onehot_patterns[original_col].append(col)
    
    logging.info(f"🔍 Detected {len(onehot_patterns)} columns needing one-hot encoding: {list(onehot_patterns.keys())}")
    
    # Step 2: Apply one-hot encoding to categorical columns
    encoded_dfs = []  # Only store encoded categorical columns
    columns_to_drop = []
    
    for original_col, onehot_cols in onehot_patterns.items():
        if original_col in df.columns:
            logging.info(f"🔤 One-hot encoding '{original_col}' into {len(onehot_cols)} columns")
            
            # Get unique values from one-hot column names
            expected_values = [col.split(f'{original_col}_')[-1] for col in onehot_cols]
            
            # Create one-hot encoded DataFrame
            df[original_col] = df[original_col].fillna('missing').astype(str)
            
            # Create dummy variables
            onehot_df = pd.get_dummies(df[[original_col]], prefix=original_col, dtype=np.uint8)
            
            # Ensure all expected columns exist (fill missing with 0)
            for expected_col in onehot_cols:
                if expected_col not in onehot_df.columns:
                    onehot_df[expected_col] = 0
            
            encoded_dfs.append(onehot_df[onehot_cols])
            columns_to_drop.append(original_col)
    
    # Step 3: Combine original numeric columns + encoded categorical columns
    df_numeric = df.drop(columns=columns_to_drop, errors='ignore')
    
    # Combine numeric columns with all encoded categorical columns
    if len(encoded_dfs) > 0:
        # Concatenate numeric + all encoded columns
        result_df = pd.concat([df_numeric] + encoded_dfs, axis=1)
        logging.info(f"📊 Combined {len(df_numeric.columns)} numeric + {sum(len(edf.columns) for edf in encoded_dfs)} encoded columns")
    else:
        result_df = df_numeric.copy()
    
    # Convert all columns to numeric, replacing any non-numeric with NaN
    for col in result_df.columns:
        result_df[col] = pd.to_numeric(result_df[col], errors='coerce')
    
    logging.info(f"📊 After encoding: {len(result_df.columns)} columns present")
    
    # Step 4: Ensure all training features exist (fill missing with 0)
    missing_features = []
    for feature in training_features:
        if feature not in result_df.columns:
            missing_features.append(feature)
            result_df[feature] = 0
    
    if missing_features:
        logging.warning(f"⚠️ {len(missing_features)} features not found, filled with 0: {missing_features[:5]}")
    
    # Step 5: Select only training features in correct order
    available_features = set(result_df.columns)
    training_features_set = set(training_features)
    extra_features = available_features - training_features_set
    
    if extra_features:
        logging.info(f"🗑️ Dropping {len(extra_features)} extra columns not used in training: {list(extra_features)[:5]}")
    
    result_df = result_df[training_features]
    
    # Step 6: Handle any remaining nulls and ensure all numeric
    result_df = result_df.fillna(0)
    
    # Final safety check: ensure all values are numeric
    for col in result_df.columns:
        result_df[col] = pd.to_numeric(result_df[col], errors='coerce').fillna(0)
    
    # Check for any invalid values
    if result_df.isnull().any().any():
        logging.error(f"⚠️ Still have NaN values after transformation!")
    if (result_df == '').any().any():
        logging.error(f"⚠️ Still have empty strings after transformation!")
    
    logging.info(f"✅ Transformed {len(df_raw)} rows with {len(df_raw.columns)} columns → {len(result_df.columns)} model features")
    logging.info(f"🎯 Final feature order matches training: {list(result_df.columns)[:5]}...")
    
    return result_df


async def make_predictions(
    model_id: str,
    data: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Make predictions using a trained model.
    AUTO-TRANSFORMS user data to match training schema (handles one-hot encoding automatically).
    
    Args:
        model_id: UUID of the trained model
        data: List of dictionaries containing RAW feature values (not one-hot encoded)
    
    Returns:
        Dictionary with predictions and metadata
    """
    try:
        # Load model metadata
        model_details = await get_model_details(model_id)
        
        # Load the trained model
        model = load_model_for_prediction(model_id)
        
        # Convert data to DataFrame
        df_raw = pd.DataFrame(data)
        logging.info(f"📊 Received {len(df_raw)} rows with {len(df_raw.columns)} columns for prediction")
        logging.info(f"📋 Input columns: {list(df_raw.columns)}")
        
        # Get feature columns from training (these are ENCODED features after feature engineering)
        training_features = model_details['dataset_info']['features']
        target_column = model_details['target_column']
        problem_type = model_details['problem_type']
        
        logging.info(f"🎯 Model expects {len(training_features)} features")
        logging.info(f"🔍 Sample expected features: {training_features[:5]}")
        
        # Detect if this is raw data (needs transformation) or already encoded data
        # Strategy: Look for categorical column patterns in training features
        input_cols = set(df_raw.columns)
        
        # Identify potential categorical base columns by finding patterns like:
        # department_Sales, department_HR, department_IT → base: "department"
        categorical_bases = set()
        for feature in training_features:
            if '_' in feature:
                # Get potential base column (everything before last underscore)
                parts = feature.rsplit('_', 1)
                if len(parts) == 2:
                    base = parts[0]
                    # Check if this base exists in input columns (indicates raw data)
                    if base in input_cols:
                        categorical_bases.add(base)
        
        # If we found categorical base columns in input, it's raw data
        is_raw_data = len(categorical_bases) > 0
        
        if categorical_bases:
            logging.info(f"🔍 Found {len(categorical_bases)} categorical columns in input: {categorical_bases}")
            logging.info(f"🎯 Detection: RAW data (needs encoding)")
        else:
            # Double-check: if most training features are missing from input, it's likely raw
            matching = len(input_cols.intersection(set(training_features)))
            if matching < len(training_features) * 0.7:
                logging.warning(f"⚠️ Only {matching}/{len(training_features)} features match - assuming RAW data")
                is_raw_data = True
            else:
                logging.info(f"🎯 Detection: PRE-ENCODED data (all features present)")
        
        if is_raw_data:
            logging.info("🔄 Detected RAW data - will auto-transform to match training schema")
            df_transformed = _transform_prediction_data_to_match_training(df_raw, training_features, model_details)
        else:
            logging.info("✅ Data appears to be pre-encoded - using as-is")
            # Validate columns
            missing_cols = set(training_features) - set(df_raw.columns)
            if missing_cols:
                raise ValueError(
                    f"Missing required columns: {', '.join(list(missing_cols)[:10])}... "
                    f"({len(missing_cols)} total missing)"
                )
            df_transformed = df_raw[training_features]
        
        # Make predictions
        predictions = model.predict(df_transformed)
        logging.info(f"✅ Generated {len(predictions)} predictions")
        
        # Prepare results
        results = []
        
        # For classification, get probabilities
        if problem_type == "classification" and hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba(df_transformed)
            classes = model.classes_ if hasattr(model, 'classes_') else None
            
            for i, pred in enumerate(predictions):
                result = {
                    "prediction": int(pred) if isinstance(pred, (int, np.integer)) else pred,
                }
                
                # Add confidence (probability of predicted class)
                if probabilities is not None:
                    pred_idx = list(classes).index(pred) if classes is not None else i
                    result["confidence"] = float(probabilities[i][pred_idx])
                    
                    # Add all class probabilities
                    if classes is not None:
                        result["probabilities"] = {
                            str(cls): float(prob) 
                            for cls, prob in zip(classes, probabilities[i])
                        }
                
                results.append(result)
        else:
            # Regression - just predictions
            for pred in predictions:
                results.append({
                    "prediction": float(pred) if isinstance(pred, (int, float, np.number)) else pred,
                    "confidence": None,
                    "probabilities": None,
                })
        
        return {
            "model_id": model_id,
            "model_name": model_details['best_model']['model_name'],
            "problem_type": problem_type,
            "predictions": results,
            "total_predictions": len(results),
            "feature_columns": training_features,
        }
        
    except Exception as e:
        logging.exception(f"❌ Prediction failed for model {model_id}")
        raise
