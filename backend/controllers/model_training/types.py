"""Pydantic models for model training requests and responses"""
from typing import Dict, List, Literal, Optional, Any
from pydantic import BaseModel, Field


class MinioFile(BaseModel):
    """MinIO file metadata"""
    name: str
    last_modified: Optional[str] = None
    size: Optional[int] = None


class TrainingConfig(BaseModel):
    """Configuration for model training"""
    target_column: str = Field(..., description="Target column name for prediction")
    problem_type: Literal["classification", "regression"] = Field(
        ..., description="Problem type (classification or regression) - REQUIRED"
    )
    test_size: float = Field(0.2, ge=0.1, le=0.5, description="Test set size (0.1-0.5)")
    random_state: int = Field(42, description="Random seed for reproducibility")
    models_to_train: Optional[List[str]] = Field(
        None, 
        description="List of models to train (trains all if not specified)"
    )


class TrainingRequest(BaseModel):
    """Request to start model training"""
    filename: str = Field(..., description="Name of feature-engineered dataset")
    config: TrainingConfig


class ModelMetrics(BaseModel):
    """Model evaluation metrics"""
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    roc_auc: Optional[float] = None
    # Regression metrics
    mae: Optional[float] = None
    mse: Optional[float] = None
    rmse: Optional[float] = None
    r2_score: Optional[float] = None
    adjusted_r2: Optional[float] = None


class TrainedModelInfo(BaseModel):
    """Information about a trained model"""
    model_name: str
    model_type: str  # e.g., "RandomForestClassifier"
    problem_type: Literal["classification", "regression"]
    metrics: ModelMetrics
    training_time: float  # seconds
    is_best: bool = False


class TrainingJobResult(BaseModel):
    """Result of training job"""
    job_id: str
    status: Literal["completed", "failed"]
    filename: str
    target_column: str
    problem_type: Literal["classification", "regression"]
    models_trained: List[TrainedModelInfo]
    best_model: TrainedModelInfo
    best_model_id: str  # UUID for saved model
    total_training_time: float
    dataset_info: Dict[str, Any]
    error: Optional[str] = None


class PredictionRequest(BaseModel):
    """Request for making predictions"""
    model_id: str = Field(..., description="ID of trained model")
    data: List[Dict[str, Any]] = Field(..., description="Data to predict on (list of records)")


class PredictionResult(BaseModel):
    """Individual prediction result"""
    prediction: Any  # Predicted value
    confidence: Optional[float] = None  # For classification: probability of predicted class
    probabilities: Optional[Dict[str, float]] = None  # For classification: all class probabilities


class PredictionResponse(BaseModel):
    """Response from prediction"""
    model_id: str
    model_name: str
    problem_type: str
    predictions: List[PredictionResult]
    total_predictions: int
    feature_columns: List[str]  # Columns used for prediction
