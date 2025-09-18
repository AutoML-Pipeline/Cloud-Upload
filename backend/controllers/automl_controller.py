"""
AutoML Controller - Professional AutoGluon Integration
Handles automated machine learning training, evaluation, and prediction
"""
import io
import time
import uuid
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from concurrent.futures import ThreadPoolExecutor
import logging

from backend.config import minio_client
from backend.models.pydantic_models import (
    AutoMLStartRequest,
    AutoMLStatusResponse,
    AutoMLPredictionRequest,
    AutoMLPredictionResponse
)

# AutoML imports - Using scikit-learn with automated model selection
try:
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
    from sklearn.linear_model import LogisticRegression, ElasticNet, Ridge, Lasso
    from sklearn.svm import SVC, SVR
    from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
    from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
    from sklearn.naive_bayes import GaussianNB
    from sklearn.model_selection import GridSearchCV, RandomizedSearchCV, cross_val_score
    from sklearn.metrics import accuracy_score, f1_score, mean_squared_error, r2_score
    from sklearn.preprocessing import StandardScaler, LabelEncoder
    from sklearn.pipeline import Pipeline
    import joblib
    AUTOML_AVAILABLE = True
except ImportError:
    AUTOML_AVAILABLE = False
    logging.warning("Required ML libraries not available. AutoML features will be disabled.")

# In-memory job store for AutoML training jobs
AUTOML_JOBS: Dict[str, Dict[str, Any]] = {}
EXECUTOR = ThreadPoolExecutor(max_workers=2)

def _read_engineered_file(filename: str) -> pd.DataFrame:
    """Read engineered file from MinIO"""
    try:
        response = minio_client.get_object("feature-engineered", filename)
        data = io.BytesIO(response.read())
        data.seek(0)
        
        if filename.endswith(".parquet"):
            df = pd.read_parquet(data, engine="pyarrow")
        elif filename.endswith(".csv"):
            df = pd.read_csv(data)
        elif filename.endswith(".xlsx"):
            df = pd.read_excel(data)
        elif filename.endswith(".json"):
            df = pd.read_json(data)
        else:
            df = pd.read_parquet(data, engine="pyarrow")
            
        return df
    except Exception as e:
        raise RuntimeError(f"Failed to read engineered file: {filename} - {str(e)}")

def _detect_task_type(y: pd.Series) -> str:
    """Automatically detect if target column is classification or regression"""
    if not pd.api.types.is_numeric_dtype(y):
        return "classification"
    
    unique_values = y.nunique()
    total_values = len(y)
    
    # If more than 20 unique values or ratio > 0.1, treat as regression
    if unique_values > 20 or (unique_values / total_values) > 0.1:
        return "regression"
    else:
        return "classification"

def _train_automl_job(job_id: str, filename: str, task: str, target_column: str, 
                     time_limit: int, presets: str, eval_metric: Optional[str]) -> None:
    """Background job for AutoML training using scikit-learn"""
    job_data = AUTOML_JOBS[job_id]
    job_data["status"] = "running"
    job_data["progress"] = 5
    job_data["current_phase"] = "Loading data"
    job_data["start_time"] = time.time()
    
    try:
        if not AUTOML_AVAILABLE:
            raise RuntimeError("Required ML libraries not available. Please install scikit-learn.")
        
        # Load data
        df = _read_engineered_file(filename)
        job_data["progress"] = 10
        job_data["current_phase"] = "Data validation"
        
        # Validate target column
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in data")
        
        # Check data quality
        if len(df) < 50:
            raise ValueError(f"Dataset too small for AutoML: {len(df)} rows (minimum 50)")
        
        # Remove rows with missing target values
        initial_rows = len(df)
        df = df.dropna(subset=[target_column])
        if len(df) < initial_rows * 0.8:  # If we lost more than 20% of data
            raise ValueError(f"Too many missing values in target column: {initial_rows - len(df)} rows removed")
        
        job_data["progress"] = 20
        job_data["current_phase"] = "Preparing data"
        
        # Prepare features and target
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # Auto-detect task type based on target column
        detected_task = _detect_task_type(y)
        if task != detected_task:
            logging.warning(f"Target column '{target_column}' detected as {detected_task}, but user selected {task}. Switching to {detected_task}.")
            task = detected_task
        
        # Handle categorical variables
        categorical_cols = X.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
        
        # Handle missing values
        X = X.fillna(X.median())
        
        # Update job data with corrected task
        job_data["task"] = task
        
        job_data["progress"] = 30
        job_data["current_phase"] = "Training models"
        
        # Define model candidates based on task
        if task == "classification":
            models = {
                "RandomForest": RandomForestClassifier(n_estimators=100, random_state=42),
                "GradientBoosting": GradientBoostingClassifier(random_state=42),
                "LogisticRegression": LogisticRegression(random_state=42, max_iter=1000),
                "SVM": SVC(random_state=42, probability=True),
                "KNeighbors": KNeighborsClassifier(),
                "DecisionTree": DecisionTreeClassifier(random_state=42),
                "NaiveBayes": GaussianNB()
            }
            scoring = 'accuracy'
        else:  # regression
            models = {
                "RandomForest": RandomForestRegressor(n_estimators=100, random_state=42),
                "GradientBoosting": GradientBoostingRegressor(random_state=42),
                "ElasticNet": ElasticNet(random_state=42),
                "Ridge": Ridge(random_state=42),
                "Lasso": Lasso(random_state=42),
                "SVR": SVR(),
                "KNeighbors": KNeighborsRegressor(),
                "DecisionTree": DecisionTreeRegressor(random_state=42)
            }
            scoring = 'neg_mean_squared_error'
        
        # Train and evaluate models
        results = []
        trained_models = {}  # Store trained models separately
        total_models = len(models)
        
        for i, (name, model) in enumerate(models.items()):
            try:
                job_data["current_phase"] = f"Training {name} ({i+1}/{total_models})"
                job_data["progress"] = 30 + (i / total_models) * 50
                
                # Create pipeline with scaling
                pipeline = Pipeline([
                    ('scaler', StandardScaler()),
                    ('model', model)
                ])
                
                # Cross-validation with error handling
                try:
                    cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring=scoring, error_score='raise')
                    mean_score = cv_scores.mean()
                    std_score = cv_scores.std()
                except Exception as cv_error:
                    logging.warning(f"Cross-validation failed for {name}: {str(cv_error)}")
                    # Try without cross-validation as fallback
                    pipeline.fit(X, y)
                    if task == "regression":
                        y_pred = pipeline.predict(X)
                        mean_score = -np.sqrt(np.mean((y - y_pred) ** 2))  # Negative RMSE
                    else:
                        y_pred = pipeline.predict(X)
                        mean_score = accuracy_score(y, y_pred)
                    std_score = 0.0
                
                # Train on full data for final model
                pipeline.fit(X, y)
                
                # Store the trained model
                trained_models[name] = pipeline
                
                results.append({
                    "model": name,
                    "score_val": mean_score,
                    "score_std": std_score,
                    "fit_time": 0.0,  # Simplified for now
                    "status": "success"
                })
                
            except Exception as e:
                logging.warning(f"Failed to train {name}: {str(e)}")
                results.append({
                    "model": name,
                    "score_val": -999 if task == "regression" else 0,
                    "score_std": 0,
                    "fit_time": 0.0,
                    "status": "failed",
                    "error": str(e)
                })
        
        job_data["progress"] = 80
        job_data["current_phase"] = "Generating results"
        
        # Sort results by score
        if task == "regression":
            results.sort(key=lambda x: x["score_val"], reverse=True)  # Higher is better for neg_mse
        else:
            results.sort(key=lambda x: x["score_val"], reverse=True)  # Higher is better for accuracy
        
        # Get best model
        best_result = results[0] if results else None
        best_model = best_result["model"] if best_result else "Unknown"
        best_score = best_result["score_val"] if best_result else 0.0
        
        # Store results (without model objects for serialization)
        job_data["status"] = "done"
        job_data["progress"] = 100
        job_data["current_phase"] = "Completed"
        job_data["best_model"] = best_model
        job_data["best_score"] = float(best_score)
        job_data["leaderboard"] = results
        job_data["training_time"] = time.time() - job_data["start_time"]
        
        # Store the best model object separately (not serialized)
        if best_model in trained_models:
            job_data["best_model_object"] = trained_models[best_model]
        else:
            job_data["best_model_object"] = None
        
        logging.info(f"AutoML training completed for job {job_id}: {best_model} with score {best_score}")
        
    except Exception as e:
        job_data["status"] = "error"
        job_data["error"] = str(e)
        job_data["current_phase"] = "Error occurred"
        logging.error(f"AutoML training failed for job {job_id}: {str(e)}")

async def start_automl_training(request: AutoMLStartRequest) -> Dict[str, str]:
    """Start AutoML training job"""
    if not AUTOML_AVAILABLE:
        raise RuntimeError("Required ML libraries not available. Please install scikit-learn.")
    
    job_id = str(uuid.uuid4())
    AUTOML_JOBS[job_id] = {
        "status": "pending",
        "progress": 0,
        "current_phase": "Initializing",
        "filename": request.filename,
        "task": request.task,
        "target_column": request.target_column,
        "time_limit": request.time_limit,
        "presets": request.presets,
        "eval_metric": request.eval_metric
    }
    
    # Start background training
    EXECUTOR.submit(
        _train_automl_job,
        job_id,
        request.filename,
        request.task,
        request.target_column,
        request.time_limit,
        request.presets,
        request.eval_metric
    )
    
    return {"job_id": job_id}

async def get_automl_status(job_id: str) -> AutoMLStatusResponse:
    """Get AutoML training status"""
    job_data = AUTOML_JOBS.get(job_id)
    if not job_data:
        raise ValueError("Job not found")
    
    # Create a copy without the model object for serialization
    leaderboard = job_data.get("leaderboard", [])
    if leaderboard:
        # Remove any model objects from leaderboard for serialization
        leaderboard = [
            {k: v for k, v in result.items() if k != "model_object"}
            for result in leaderboard
        ]
    
    return AutoMLStatusResponse(
        job_id=job_id,
        status=job_data["status"],
        progress=job_data["progress"],
        current_phase=job_data.get("current_phase"),
        best_model=job_data.get("best_model"),
        best_score=job_data.get("best_score"),
        leaderboard=leaderboard,
        error=job_data.get("error"),
        training_time=job_data.get("training_time")
    )

async def make_prediction(request: AutoMLPredictionRequest) -> AutoMLPredictionResponse:
    """Make predictions using trained AutoML model"""
    job_data = AUTOML_JOBS.get(request.job_id)
    if not job_data:
        raise ValueError("Job not found")
    
    if job_data["status"] != "done":
        raise ValueError("Model training not completed")
    
    try:
        # Get the trained model
        model_object = job_data.get("best_model_object")
        if not model_object:
            raise ValueError("Trained model not found")
        
        # Convert data to DataFrame
        df = pd.DataFrame(request.data)
        
        # Get the original training data to match feature names
        original_df = _read_engineered_file(job_data["filename"])
        X_original = original_df.drop(columns=[job_data["target_column"]])
        
        # Ensure we have all the same columns as training data
        missing_cols = set(X_original.columns) - set(df.columns)
        if missing_cols:
            # Add missing columns with default values
            for col in missing_cols:
                if col in ['_orig_idx', 'customer_id']:
                    df[col] = 0  # Default for ID columns
                else:
                    df[col] = X_original[col].median()  # Default for other columns
        
        # Reorder columns to match training data
        df = df[X_original.columns]
        
        # Handle categorical variables (same as training)
        categorical_cols = df.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
        
        # Handle missing values
        df = df.fillna(df.median())
        
        # Make predictions
        predictions = model_object.predict(df)
        
        # Get prediction probabilities if available
        prediction_probabilities = None
        if job_data["task"] == "classification" and hasattr(model_object, 'predict_proba'):
            try:
                prediction_probabilities = model_object.predict_proba(df).tolist()
            except:
                pass  # Some models don't support probabilities
        
        return AutoMLPredictionResponse(
            predictions=predictions.tolist(),
            prediction_probabilities=prediction_probabilities,
            model_info={
                "best_model": job_data.get("best_model"),
                "best_score": job_data.get("best_score"),
                "task": job_data["task"],
                "target_column": job_data["target_column"]
            }
        )
        
    except Exception as e:
        raise RuntimeError(f"Prediction failed: {str(e)}")

async def list_automl_files() -> List[str]:
    """List available engineered files for AutoML"""
    try:
        if not minio_client.bucket_exists("feature-engineered"):
            return []
        
        objects = minio_client.list_objects("feature-engineered", recursive=True)
        files = []
        for obj in objects:
            if not getattr(obj, "is_dir", False):
                files.append(obj.object_name)
        return sorted(files)
    except Exception:
        return []

async def get_file_columns(filename: str) -> List[str]:
    """Get column names from engineered file"""
    try:
        df = _read_engineered_file(filename)
        return df.columns.tolist()
    except Exception as e:
        raise RuntimeError(f"Could not read file columns: {str(e)}")

async def detect_task_type(filename: str, column_name: str) -> Dict[str, Any]:
    """Detect if a column is suitable for classification or regression"""
    try:
        df = _read_engineered_file(filename)
        if column_name not in df.columns:
            raise ValueError(f"Column '{column_name}' not found")
        
        y = df[column_name]
        task_type = _detect_task_type(y)
        
        return {
            "column_name": column_name,
            "detected_task": task_type,
            "unique_values": int(y.nunique()),
            "total_values": int(len(y)),
            "is_numeric": bool(pd.api.types.is_numeric_dtype(y))
        }
    except Exception as e:
        raise RuntimeError(f"Failed to detect task type: {str(e)}")

async def cleanup_old_jobs():
    """Clean up old completed jobs (run periodically)"""
    current_time = time.time()
    jobs_to_remove = []
    
    for job_id, job_data in AUTOML_JOBS.items():
        if job_data["status"] in ["done", "error"]:
            start_time = job_data.get("start_time", current_time)
            if current_time - start_time > 3600:  # Remove jobs older than 1 hour
                jobs_to_remove.append(job_id)
    
    for job_id in jobs_to_remove:
        del AUTOML_JOBS[job_id]
        logging.info(f"Cleaned up old AutoML job: {job_id}")
