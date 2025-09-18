from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict, Any


class FeatureEngineeringStep(BaseModel):
    id: str
    type: Literal["scaling", "encoding", "binning", "feature_creation", "feature_selection"]
    columns: List[str]

class ScalingConfig(FeatureEngineeringStep):
    type: Literal["scaling"]
    method: Literal["standard", "minmax", "robust", "log"]

class EncodingConfig(FeatureEngineeringStep):
    type: Literal["encoding"]
    method: Literal["one-hot", "label", "target"]

class BinningConfig(FeatureEngineeringStep):
    type: Literal["binning"]
    method: Literal["equal-width", "quantile"]
    bins: int

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
    preview: Dict[str, List[Any]]
    change_metadata: List[FeatureEngineeringSummary]
    message: str = "Feature engineering applied successfully"

class MinioFile(BaseModel):
    name: str
    last_modified: str
    size: int
