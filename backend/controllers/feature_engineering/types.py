from pydantic import BaseModel
from typing import Any, Dict, List, Literal, Optional


class FeatureEngineeringStep(BaseModel):
    id: str
    type: Literal["scaling", "encoding", "binning", "feature_creation", "feature_selection"]
    columns: List[str]


class ScalingConfig(FeatureEngineeringStep):
    type: Literal["scaling"]
    method: Literal["standard", "minmax", "robust", "log"]
    column_methods: Optional[Dict[str, str]] = None  # Per-column method overrides


class EncodingConfig(FeatureEngineeringStep):
    type: Literal["encoding"]
    method: Literal["one-hot", "label", "target"]
    column_methods: Optional[Dict[str, str]] = None  # Per-column method overrides


class BinningConfig(FeatureEngineeringStep):
    type: Literal["binning"]
    method: Literal["equal-width", "quantile"]
    bins: int
    column_methods: Optional[Dict[str, str]] = None  # Per-column method overrides


class FeatureCreationConfig(FeatureEngineeringStep):
    type: Literal["feature_creation"]
    method: Literal["polynomial", "datetime_decomposition", "aggregations"]
    degree: Optional[int] = None # For polynomial
    date_part: Optional[Literal["year", "month", "day", "hour", "minute", "second"]] = None # For datetime decomposition
    aggregation_type: Optional[Literal["sum", "mean", "min", "max", "count"]] = None # For aggregations
    new_column_name: Optional[str] = None


class FeatureSelectionConfig(FeatureEngineeringStep):
    type: Literal["feature_selection"]
    method: Literal["correlation_filter", "variance_threshold", "pca"]
    threshold: Optional[float] = None # For correlation filter and variance threshold
    n_components: Optional[int] = None # For PCA


class ApplyFeatureEngineeringRequest(BaseModel):
    filename: str
    steps: List[
        ScalingConfig | EncodingConfig | BinningConfig | FeatureCreationConfig | FeatureSelectionConfig
    ]


class FeatureEngineeringPreviewRequest(BaseModel):
    filename: str
    steps: List[
        ScalingConfig | EncodingConfig | BinningConfig | FeatureCreationConfig | FeatureSelectionConfig
    ]
    current_step_index: int


class FeatureEngineeringSummary(BaseModel):
    operation: str
    details: Dict[str, Any]


class FeatureEngineeringResponse(BaseModel):
    preview: List[Dict[str, Any]]
    original_preview: Optional[List[Dict[str, Any]]] = None
    change_metadata: List[FeatureEngineeringSummary]
    message: str = "Feature engineering applied successfully"
    original_row_count: Optional[int] = None
    engineered_row_count: Optional[int] = None
    preview_row_limit: Optional[int] = None
    column_summary: Optional[Dict[str, Any]] = None
    engineered_filename: Optional[str] = None
    temp_engineered_path: Optional[str] = None


class FeatureEngineeringJobResult(FeatureEngineeringResponse):
    full_data_included: bool = False


class RunFeatureEngineeringRequest(BaseModel):
    filename: str
    steps: List[
        ScalingConfig | EncodingConfig | BinningConfig | FeatureCreationConfig | FeatureSelectionConfig
    ]


class MinioFile(BaseModel):
    name: str
    last_modified: Optional[str]
    size: Optional[int]


class ColumnInsight(BaseModel):
    name: str
    dtype: str
    cardinality: int
    missing_count: int
    missing_percentage: float
    is_numeric: bool
    is_categorical: bool
    is_datetime: bool
    is_text: bool
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    mean_value: Optional[float] = None
    std_value: Optional[float] = None
    unique_values: Optional[List[str]] = None


class StepRecommendation(BaseModel):
    step_type: Literal["scaling", "encoding", "binning", "feature_creation", "feature_selection"]
    step_name: str
    recommended_columns: List[str]
    reason: str
    compatibility_score: float  # 0-1, higher is better
    why_these_columns: Dict[str, str]  # column -> reason mapping


class ColumnRecommendation(BaseModel):
    column_name: str
    column_type: str
    recommended_steps: List[str]  # list of step types this column is good for
    recommendations: List[str]  # detailed recommendations


class DatasetAnalysis(BaseModel):
    filename: str
    total_rows: int
    total_columns: int
    column_insights: List[ColumnInsight]
    step_recommendations: List[StepRecommendation]
    suggested_pipeline: List[str]  # suggested order of steps
    data_quality_notes: List[str]
